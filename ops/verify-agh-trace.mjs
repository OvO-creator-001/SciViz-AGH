import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const get = (value, path) => String(path ?? '').split('.').filter(Boolean).reduce((current, key) => current?.[key], value)
const resultText = (result) => (result?.content ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n')
const resultPayload = (result) => {
  if (result?.structured && typeof result.structured === 'object') return result.structured
  try { return JSON.parse(resultText(result)) } catch { return {} }
}
const resultErrorCode = (result) => result?.details?.code ?? resultPayload(result)?.code ?? null
const successful = (call) => Boolean(call.result) && call.result.isError !== true
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

const signatureChecks = {
  glb(buffer) {
    assert(buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'glTF', 'artifact is not a GLB file')
    assert(buffer.readUInt32LE(4) === 2, 'GLB version must be 2')
    assert(buffer.readUInt32LE(8) === buffer.length, 'GLB declared length does not match file size')
  },
  html(buffer) {
    const text = buffer.toString('utf8')
    assert(/<!doctype html|<html[\s>]/i.test(text), 'artifact is not an HTML document')
  },
  json(buffer) { JSON.parse(buffer.toString('utf8')) },
  gif(buffer) {
    const header = buffer.subarray(0, 6).toString('ascii')
    assert(header === 'GIF87a' || header === 'GIF89a', 'artifact is not a GIF file')
  },
}

function readLedger(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) } catch (error) { throw new Error('invalid JSONL at line ' + (index + 1) + ': ' + error.message) }
  })
}

function buildTurns(rows) {
  const calls = new Map()
  const turns = []
  let activeTurn = null
  let lastSeq = 0

  for (const row of rows) {
    assert(Number.isInteger(row.seq) && row.seq > lastSeq, 'seq must be strictly increasing (got ' + row.seq + ')')
    lastSeq = row.seq
    if (row.type === 'turn/start') {
      assert(!activeTurn, 'nested turn/start at seq=' + row.seq)
      activeTurn = { startSeq: row.seq, startTs: row.ts, endSeq: null, completed: false, calls: [] }
      turns.push(activeTurn)
      continue
    }
    if (row.type === 'tool/call') {
      assert(activeTurn, 'tool/call outside a turn at seq=' + row.seq)
      assert(row.origin === 'model', 'tool/call seq=' + row.seq + ' must originate from model')
      const id = row.data?.toolUseId
      assert(typeof id === 'string' && id.length > 0 && !calls.has(id), 'invalid or duplicate toolUseId at seq=' + row.seq)
      const call = { id, seq: row.seq, ts: row.ts, name: row.data.name, args: row.data.args ?? {}, turn: activeTurn }
      calls.set(id, call)
      activeTurn.calls.push(call)
      continue
    }
    if (row.type === 'tool/result') {
      const call = calls.get(row.data?.toolUseId)
      assert(call && !call.result, 'tool/result must match one prior call at seq=' + row.seq)
      assert(activeTurn === call.turn, 'tool/result must be in the same turn as its call at seq=' + row.seq)
      assert(row.origin === 'tool:' + call.name, 'tool/result origin mismatch at seq=' + row.seq)
      assert(row.sourceEventSeqs?.includes(call.seq), 'tool/result must reference call seq=' + call.seq)
      call.result = row.data
      call.resultSeq = row.seq
      call.resultTs = row.ts
      continue
    }
    if (row.type === 'turn/end') {
      assert(activeTurn, 'turn/end without turn at seq=' + row.seq)
      activeTurn.endSeq = row.seq
      activeTurn.completed = row.data?.reason === 'completed'
      activeTurn = null
    }
  }
  assert(!activeTurn, 'ledger ends with an open turn')
  return turns
}

function orderedMatch(calls, orderedTools) {
  let cursor = 0
  for (const call of calls) {
    if (cursor < orderedTools.length && call.name === orderedTools[cursor]) cursor++
  }
  return cursor === orderedTools.length
}

function verifyArtifacts(turn, rules, baseDirectory, allowedRoots) {
  return rules.map((rule) => {
    const call = [...turn.calls].reverse().find((candidate) => candidate.name === rule.tool && successful(candidate))
    assert(call, 'artifact rule has no successful call: ' + rule.tool)
    const payload = resultPayload(call.result)
    const resultPath = rule.resultPath ?? 'output_path'
    const reported = get(payload, resultPath)
    assert(typeof reported === 'string' && reported.length > 0, rule.tool + ' did not report artifact path ' + resultPath)
    const path = resolve(isAbsolute(reported) ? reported : resolve(baseDirectory, reported))
    const contained = allowedRoots.some((root) => {
      const pathFromRoot = relative(root, path)
      return pathFromRoot === '' || (!pathFromRoot.startsWith('..' + sep) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot))
    })
    assert(contained, 'artifact path is outside the allowed evidence roots: ' + path)
    const stat = statSync(path)
    assert(stat.isFile() && stat.size >= (rule.minBytes ?? 1), 'artifact missing or smaller than required: ' + path)
    const timestamp = Date.parse(call.ts)
    assert(Number.isFinite(timestamp), rule.tool + ' call has invalid timestamp')
    assert(stat.mtimeMs >= timestamp - (rule.freshnessToleranceMs ?? 2000), 'artifact predates its tool call: ' + path)
    if (rule.format) {
      const check = signatureChecks[rule.format]
      assert(check, 'unsupported artifact format: ' + rule.format)
      check(readFileSync(path))
    }
    return { tool: rule.tool, path, bytes: stat.size, sha256: sha256(path), format: rule.format ?? null }
  })
}

export function verifyAghTrace(ledgerPath, policy, options = {}) {
  assert(policy && typeof policy === 'object', 'policy must be an object')
  const requiredTools = policy.requiredTools ?? []
  const orderedTools = policy.orderedTools ?? requiredTools
  const turns = buildTurns(readLedger(ledgerPath))
  const turn = [...turns].reverse().find((candidate) =>
    (!policy.requireCompletedTurn || candidate.completed) &&
    requiredTools.every((name) => candidate.calls.some((call) => call.name === name)) &&
    orderedMatch(candidate.calls, orderedTools))
  assert(turn, 'no single turn satisfies required tools and ordering')

  for (const name of policy.successfulTools ?? []) {
    assert(turn.calls.some((call) => call.name === name && successful(call)), 'required successful tool call missing: ' + name)
  }
  for (const rule of policy.retryRules ?? []) {
    const failure = turn.calls.find((call) => call.name === rule.tool && call.result?.isError === true &&
      (!rule.errorCodes?.length || rule.errorCodes.includes(resultErrorCode(call.result))))
    assert(failure, 'required failure probe missing: ' + rule.tool)
    if (rule.thenSuccess !== false) {
      assert(turn.calls.some((call) => call.name === rule.tool && call.seq > failure.resultSeq && successful(call)),
        'required successful retry missing after ' + rule.tool + ' failure')
    }
  }
  for (const call of turn.calls.filter((candidate) => requiredTools.includes(candidate.name))) {
    assert(call.result, 'required call has no result: ' + call.name + ' seq=' + call.seq)
  }

  const baseDirectory = options.baseDirectory ?? dirname(resolve(ledgerPath))
  const allowedRoots = (policy.artifactRoots ?? [baseDirectory]).map((root) => resolve(baseDirectory, root))
  const artifacts = verifyArtifacts(turn, policy.artifacts ?? [], baseDirectory, allowedRoots)
  return {
    verified: true,
    policy: policy.name ?? 'unnamed',
    startSeq: turn.startSeq,
    endSeq: turn.endSeq,
    completed: turn.completed,
    calls: turn.calls.filter((call) => requiredTools.includes(call.name)).map((call) => ({
      seq: call.seq, resultSeq: call.resultSeq, name: call.name,
      isError: call.result?.isError === true, errorCode: resultErrorCode(call.result),
    })),
    artifacts,
  }
}

function parseArgs(argv) {
  assert(argv.length > 0 && argv.length % 2 === 0, 'arguments must be --flag value pairs')
  const result = {}
  for (let index = 0; index < argv.length; index += 2) result[argv[index]] = argv[index + 1]
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const flags = parseArgs(process.argv.slice(2))
    assert(flags['--ledger'] && flags['--policy'], 'usage: node ops/verify-agh-trace.mjs --ledger session.jsonl --policy trace-policy.json [--out verification.json]')
    const policy = JSON.parse(readFileSync(flags['--policy'], 'utf8'))
    const proof = verifyAghTrace(flags['--ledger'], policy)
    const json = JSON.stringify(proof, null, 2) + '\n'
    if (flags['--out']) writeFileSync(flags['--out'], json, { flag: 'wx' })
    else process.stdout.write(json)
  } catch (error) {
    console.error('trace verification failed: ' + error.message)
    process.exitCode = 1
  }
}
