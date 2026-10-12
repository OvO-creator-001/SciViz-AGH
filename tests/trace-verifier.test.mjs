import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { verifyAghTrace } from '../ops/verify-agh-trace.mjs'

const writeGlb = (path) => {
  const buffer = Buffer.alloc(12)
  buffer.write('glTF', 0, 'ascii')
  buffer.writeUInt32LE(2, 4)
  buffer.writeUInt32LE(buffer.length, 8)
  writeFileSync(path, buffer)
}

const result = (id, seq, callSeq, tool, payload, isError = false) => ({
  seq,
  ts: new Date().toISOString(),
  type: 'tool/result',
  origin: 'tool:' + tool,
  sourceEventSeqs: [callSeq],
  data: { toolUseId: id, isError, content: [{ type: 'text', text: JSON.stringify(payload) }], details: payload.code ? { code: payload.code } : {} },
})
const call = (id, seq, name, origin = 'model') => ({
  seq, ts: new Date().toISOString(), type: 'tool/call', origin,
  data: { toolUseId: id, name, args: {} },
})

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'sciviz-trace-'))
  const glb = join(root, 'model.glb')
  const html = join(root, 'page.html')
  writeGlb(glb)
  writeFileSync(html, '<!doctype html><html><body>viewer</body></html>')
  const rows = [
    { seq: 1, ts: new Date().toISOString(), type: 'turn/start', origin: 'system', data: {} },
    call('a1', 2, 'assess'), result('a1', 3, 2, 'assess', { score: 0.82 }),
    call('g1', 4, 'generate'), result('g1', 5, 4, 'generate', { code: 'TIMEOUT' }, true),
    call('g2', 6, 'generate'), result('g2', 7, 6, 'generate', { output_path: glb }),
    call('p1', 8, 'assemble'), result('p1', 9, 8, 'assemble', { output_path: html }),
    call('v1', 10, 'validate'), result('v1', 11, 10, 'validate', { valid: true }),
    { seq: 12, ts: new Date().toISOString(), type: 'turn/end', origin: 'system', data: { reason: 'completed' } },
  ]
  const ledger = join(root, 'session.jsonl')
  writeFileSync(ledger, rows.map((row) => JSON.stringify(row)).join('\n') + '\n')
  const policy = {
    name: 'test-policy', requireCompletedTurn: true,
    requiredTools: ['assess', 'generate', 'assemble', 'validate'],
    orderedTools: ['assess', 'generate', 'assemble', 'validate'],
    successfulTools: ['assess', 'validate'],
    retryRules: [{ tool: 'generate', errorCodes: ['TIMEOUT'] }],
    artifacts: [
      { tool: 'generate', resultPath: 'output_path', format: 'glb', minBytes: 12 },
      { tool: 'assemble', resultPath: 'output_path', format: 'html', minBytes: 16 },
    ],
  }
  return { root, glb, html, ledger, policy, rows }
}

test('trace verifier accepts native ordered calls, retry, fresh artifacts, and hashes', () => {
  const { ledger, policy } = fixture()
  const proof = verifyAghTrace(ledger, policy)
  assert.equal(proof.verified, true)
  assert.equal(proof.artifacts.length, 2)
  assert.match(proof.artifacts[0].sha256, /^[a-f0-9]{64}$/)
  assert.deepEqual(proof.calls.filter((entry) => entry.name === 'generate').map((entry) => entry.isError), [true, false])
})

test('trace verifier rejects non-model tool calls', () => {
  const { ledger, policy, rows } = fixture()
  rows[1].origin = 'script'
  writeFileSync(ledger, rows.map((row) => JSON.stringify(row)).join('\n'))
  assert.throws(() => verifyAghTrace(ledger, policy), /must originate from model/)
})

test('trace verifier rejects out-of-order workflows', () => {
  const { ledger, policy } = fixture()
  policy.orderedTools = ['generate', 'assess', 'assemble', 'validate']
  assert.throws(() => verifyAghTrace(ledger, policy), /no single turn/)
})

test('trace verifier rejects stale artifacts and invalid signatures', () => {
  const stale = fixture()
  const old = new Date('2000-01-01T00:00:00Z')
  utimesSync(stale.glb, old, old)
  assert.throws(() => verifyAghTrace(stale.ledger, stale.policy), /predates its tool call/)

  const invalid = fixture()
  writeFileSync(invalid.glb, Buffer.alloc(20))
  assert.throws(() => verifyAghTrace(invalid.ledger, invalid.policy), /not a GLB/)
})

test('trace verifier rejects artifacts outside the evidence root', () => {
  const fixtureData = fixture()
  const external = join(tmpdir(), 'sciviz-external-model.glb')
  writeGlb(external)
  fixtureData.rows[6].data.content[0].text = JSON.stringify({ output_path: external })
  writeFileSync(fixtureData.ledger, fixtureData.rows.map((row) => JSON.stringify(row)).join('\n'))
  assert.throws(() => verifyAghTrace(fixtureData.ledger, fixtureData.policy), /outside the allowed evidence roots/)
})
