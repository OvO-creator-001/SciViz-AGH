import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { classifyFailure } from '../src/agh/errors.mjs'
import { createSessionState } from '../src/agh/session-state.mjs'
import { createWorkspaceLocator, normalizePath } from '../src/agh/workspace-discovery.mjs'

const K = Symbol.for('TypeBox.Kind')
const makeContext = (cwd, sessionKey = 'test-session', env = {}) => ({
  cwd,
  env,
  session: { key: sessionKey },
  fs: {
    read: async (path) => readFileSync(path),
    write: async (path, data) => writeFileSync(path, data),
    stat: async (path) => {
      const stat = statSync(path)
      return { kind: stat.isDirectory() ? 'dir' : stat.isSymbolicLink() ? 'symlink' : 'file', size: stat.size, mtimeMs: stat.mtimeMs }
    },
    list: async (path) => readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? 'dir' : entry.isSymbolicLink() ? 'symlink' : 'file',
    })),
  },
})

const makeScivizRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'sciviz-root-'))
  mkdirSync(join(root, 'src'))
  mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'package.json'), '{}')
  return root
}

test('session state is isolated and cleaned by session key', () => {
  const sessions = createSessionState(() => ({ count: 0 }))
  const a = { session: { key: 'a' } }
  const b = { session: { key: 'b' } }
  sessions.get(a).count = 4
  assert.equal(sessions.get(b).count, 0)
  assert.equal(sessions.size(), 2)
  sessions.clear(a)
  assert.equal(sessions.get(a).count, 0)
  assert.equal(sessions.get(b).count, 0)
})

test('workspace locator finds env root, cwd parent, and bounded search root', async () => {
  const root = makeScivizRoot()
  const nested = join(root, 'work', 'nested')
  mkdirSync(nested, { recursive: true })
  const locator = createWorkspaceLocator({
    markers: [{ path: 'package.json', kind: 'file' }, { path: 'src', kind: 'dir' }, { path: 'docs', kind: 'dir' }],
    envKeys: ['SCIVIZ_ROOT'],
  })

  const envResult = await locator.find(makeContext(tmpdir(), 'env', { SCIVIZ_ROOT: root }), {})
  assert.equal(envResult.root, normalizePath(root))
  assert.equal(envResult.source, 'env:SCIVIZ_ROOT')

  const parentResult = await locator.find(makeContext(nested, 'parent'), {})
  assert.equal(parentResult.root, normalizePath(root))
  assert.equal(parentResult.source, 'cwd-parent')

  const searchBase = mkdtempSync(join(tmpdir(), 'sciviz-search-'))
  const searchedRoot = join(searchBase, 'team', 'project')
  mkdirSync(join(searchedRoot, 'src'), { recursive: true })
  mkdirSync(join(searchedRoot, 'docs'))
  writeFileSync(join(searchedRoot, 'package.json'), '{}')
  const searchResult = await locator.find(makeContext(tmpdir(), 'search', { SCIVIZ_SEARCH_ROOT: searchBase }), {})
  assert.equal(searchResult.root, normalizePath(searchedRoot))
  assert.equal(searchResult.source, 'bounded-search')
})

test('failure classifier separates model-fixable and environment errors', () => {
  assert.equal(classifyFailure({ timedOut: true }, 'generation').code, 'TIMEOUT')
  assert.equal(classifyFailure({ stderr: 'HTTP 429 too many requests' }).retryable, true)
  assert.equal(classifyFailure({ stderr: 'invalid parameter schema' }).fixableByModel, true)
  assert.equal(classifyFailure({ stderr: 'EACCES permission denied' }).fixableByModel, false)
  assert.equal(classifyFailure({ stderr: 'HTTP 401 invalid api key' }).code, 'AUTH_REQUIRED')
})

test('AGH plugin registers only foundation tools with complete metadata and schema', async () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const entry = packageJson.agnes.plugins[0]
  const module = await import(pathToFileURL(resolve(packageJson.exports)).href + '?test=' + Date.now())
  const plugin = module[entry.export]
  const tools = new Map()
  const hooks = new Map()
  const agnes = {
    registerTool: (definition) => tools.set(definition.name, definition),
    on: (name, callback) => hooks.set(name, callback),
    ctx: { log: { info: () => {} } },
  }
  plugin.apply({ extension: () => agnes })
  assert.deepEqual([...tools.keys()], ['set_sciviz_root', 'inspect_sciviz_workspace'])
  assert.equal(typeof hooks.get('shutdown'), 'function')

  const metadataKeys = ['isReadOnly', 'isDestructive', 'isConcurrencySafe', 'isOpenWorld', 'replay', 'costHint', 'deferLoading', 'requiresApproval']
  for (const definition of tools.values()) {
    assert.equal(definition.parameters[K], 'Object')
    assert.equal(definition.parameters.additionalProperties, false)
    assert.ok(metadataKeys.every((key) => Object.hasOwn(definition.meta, key)))
  }

  const rootA = makeScivizRoot()
  const rootB = makeScivizRoot()
  const ctxA = makeContext(rootA, 'a')
  const ctxB = makeContext(rootB, 'b')
  const setA = await tools.get('set_sciviz_root').execute({ path: rootA }, ctxA)
  assert.equal(setA.structured.source, 'explicit')
  const inspectB = await tools.get('inspect_sciviz_workspace').execute({}, ctxB)
  assert.equal(inspectB.structured.root, normalizePath(rootB))
  assert.notEqual(inspectB.structured.root, setA.structured.root)
  await hooks.get('shutdown')({}, ctxA)
  const afterShutdown = await tools.get('inspect_sciviz_workspace').execute({}, { ...ctxA, cwd: tmpdir() })
  assert.equal(afterShutdown.details.code, 'SCIVIZ_ROOT_NOT_FOUND')
})
