import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

// Run on a freshly extracted bundle, never on the repository source directory.
const root = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw Error('Usage: node ops/Verify-PluginZip.mjs <extracted-plugin-directory>')
const repo = fileURLToPath(new URL('../', import.meta.url))
const sums = (await readFile(join(root, 'CHECKSUMS.sha256'), 'utf8')).trim().split(/\r?\n/)
const listed = new Set(['CHECKSUMS.sha256'])
for (const line of sums) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line)
  assert.ok(match, 'Invalid checksum line')
  const [, expected, name] = match
  assert.ok(!name.includes('..') && !name.startsWith('/') && !name.includes('\\') && !name.includes(':'), 'Unsafe file path')
  assert.ok(!listed.has(name), 'Duplicate file')
  listed.add(name)
  const bytes = await readFile(join(root, name))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name)
  if (name.startsWith('src/') || name === 'package.json' || name === 'LICENSE' || name.startsWith('ops/'))
    assert.deepEqual(bytes, await readFile(join(repo, name)), `Runtime differs: ${name}`)
}
async function walk(dir, prefix = '') {
  const names = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!item.isSymbolicLink(), 'Symlink in bundle')
    const name = prefix + item.name
    if (item.isDirectory()) names.push(...await walk(join(dir, item.name), name + '/'))
    else names.push(name)
  }
  return names
}
const files = await walk(root)
assert.deepEqual([...files].sort(), [...listed].sort(), 'Missing or extra bundle files')
assert.ok(files.every(f => /^(package\.json|LICENSE|README\.md|CHECKSUMS\.sha256|src\/\.gitkeep|src\/.*\.mjs|ops\/verify-agh-trace\.mjs|docs\/ANALYSIS_WORKFLOW_040\.md|demo\/(interactive\.html|diagram\.svg))$/.test(f)), 'Unexpected bundle file')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
assert.equal(pkg.version, '0.4.2')
const { main } = await import(pathToFileURL(join(root, 'src/agh/index.mjs')))
const tools = []
main.apply({ extension: () => ({ ctx: { log: { info() {} } }, on() {}, registerTool(def) { tools.push(def.name) } }) })
assert.equal(tools.length, 9)
assert.equal(new Set(tools).size, 9)
const { renderVisualization } = await import(pathToFileURL(join(root, 'src/render/index.mjs')))
const { assessVisualization } = await import(pathToFileURL(join(root, 'src/core/assessment.mjs')))
const fixture = JSON.parse(await readFile(new URL('../examples/learning-v4/content.json', import.meta.url), 'utf8'))
const rendered = renderVisualization(fixture, assessVisualization(fixture))
assert.ok(rendered.svg.includes('<svg'))
assert.ok(rendered.html.includes('如何阅读这张图'))
assert.equal(rendered.figures.length, 10)
assert.deepEqual(await readFile(join(root, 'README.md')), await readFile(new URL('../docs/product/INSTALL_README_042.md', import.meta.url)))
console.log(JSON.stringify({ version: pkg.version, files: files.length, checksums: 'passed', runtimeMatchesSource: true, tools, render: 'passed', teachingFigures: rendered.figures.length, readmeMatches: true, scope: 'Extracted ZIP smoke check; not a fresh AGH installation on another computer.' }, null, 2))
