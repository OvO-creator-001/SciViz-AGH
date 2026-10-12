import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderVisualization, renderInputErrorPage } from '../src/render/index.mjs'
import { assessVisualization } from '../src/core/assessment.mjs'
import { generateVisualization } from '../src/core/pipeline.mjs'
import { loadRenderer } from '../src/core/renderer-adapter.mjs'
import { generateDemo } from '../examples/b-side/generate-demo.mjs'
const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const content = await json('../examples/b-side/content.json')
const assessment = await json('../examples/b-side/assessment.json')
const coreContent = await json('../examples/core-content-v1.json')

test('B: pure deterministic output and both contracts integrate with the real A pipeline', async () => {
  const input = structuredClone(content), before = JSON.stringify(input)
  const output = renderVisualization(input, assessment)
  assert.equal(JSON.stringify(input), before)
  assert.deepEqual(output, renderVisualization({ content, assessment }))
  assert.match(output.svg, /教学合成示例/)
  assert.match(output.svg, /准备待处理的数据/)
  assert.match(output.html, /data-node="2"/)
  assert.match(output.html, /href="#source-0"/)
  const root = await mkdtemp(join(tmpdir(), 'sciviz-b-integration-'))
  try {
    const result = await generateVisualization(coreContent, { root, renderer: await loadRenderer() })
    assert.equal(result.status, 'rendered')
    const saved = await readFile(join(result.directory, 'interactive.html'), 'utf8')
    assert.match(saved, /记录测量值/)
    assert.equal(result.artifacts.length, 4)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('B: insufficient evidence shows gaps and existing sources without any SVG', () => {
  const missing = { ...assessment, decision: 'insufficient_evidence', recommended_format: 'evidence_report', missing_requirements: ['需要真实论文出处'] }
  const output = renderVisualization(content, missing)
  assert.equal(output.svg, null)
  assert.doesNotMatch(output.html, /<svg[\s>]/)
  assert.match(output.html, /需要真实论文出处/)
  assert.match(output.html, /团队编写的教学样例/)
  const unverified = structuredClone(coreContent)
  unverified.sources[0].verified = false
  assert.equal(renderVisualization({ content: unverified, assessment: assessVisualization(unverified) }).svg, null)
})

test('B: invalid structure and references fail explicitly with a field path', () => {
  const cases = [
    c => { c.nodes[0].source_refs = ['missing'] },
    c => { c.nodes[1].id = c.nodes[0].id },
    c => { c.edges[0].to = 'ghost' },
    c => { c.edges.push(c.edges[0]) },
    c => { c.nodes.pop() },
    c => { c.nodes[0].label = '长'.repeat(121) },
    c => { c.nodes[0].explanation = 'invalid\u0000xml' },
    c => { c.sources[0] = null },
  ]
  for (const mutate of cases) {
    const bad = structuredClone(content); mutate(bad)
    assert.throws(() => renderVisualization(bad, assessment), e => e.code === 'INVALID_INPUT' && e.path.startsWith('content.'))
  }
  assert.throws(() => renderVisualization(content, { ...assessment, decision: 'scientifically_verified' }), /assessment.decision/)
  assert.throws(() => renderVisualization(content, { ...assessment, missing_requirements: ['gap'] }), /矛盾/)
  assert.match(renderInputErrorPage(new Error('<img src=x onerror=alert(1)>')), /&lt;img/)
})

test('B: 8 nodes, a 120-character label and non-adjacent edges retain every character', () => {
  const long = structuredClone(content)
  long.nodes = Array.from({ length: 8 }, (_, i) => ({ ...content.nodes[0], id: `n${i + 1}`, label: i === 7 ? '长'.repeat(120) : `步骤 ${i + 1}` }))
  long.edges.push({ from: 'n8', to: 'n1', label: '回查', source_refs: ['s1'] })
  const output = renderVisualization(long, assessment)
  assert.equal((output.html.match(/data-node="/g) ?? []).length, 8)
  assert.ok(output.html.includes('长'.repeat(120)))
  assert.match(output.svg, /回查/)
  assert.doesNotMatch(output.svg, /…/)
})

test('B: text injection remains text, URL protocols are restricted, and no remote resources are embedded', () => {
  const malicious = structuredClone(content)
  const attack = '</script><img src=x onerror="globalThis.__injected=1"><svg onload=alert(1)>'
  malicious.title = attack
  malicious.nodes[0].explanation = attack
  malicious.sources[0].excerpt = attack
  malicious.sources[0].url = 'javascript:alert(1)'
  const output = renderVisualization(malicious, assessment)
  assert.equal((output.html.match(/<script>/g) ?? []).length, 1)
  assert.doesNotMatch(output.html, /<img|<svg onload|href="javascript:/)
  assert.match(output.html, /&lt;\/script&gt;/)
  assert.doesNotMatch(output.svg, /<script|<img|<[^>]+\sonload=/) // escaped textual content is retained
  const embeddedScript = output.html.match(/<script>([\s\S]*?)<\/script>/)[1]
  assert.ok(!embeddedScript.includes(attack))
  assert.doesNotMatch(embeddedScript, /fetch\(|XMLHttpRequest|innerHTML|eval\(/)
  for (const url of ['data:text/html,x', '//example.com', 'https://user:pass@example.com', 'https://example.com/\npath']) {
    malicious.sources[0].url = url
    assert.doesNotMatch(renderVisualization(malicious, assessment).html, /target="_blank"/)
  }
  malicious.sources[0].url = 'https://example.com/paper?a=1&b=2'
  assert.match(renderVisualization(malicious, assessment).html, /href="https:\/\/example.com\/paper\?a=1&amp;b=2"/)
  assert.doesNotMatch(output.html, /<script[^>]+src=|<link[^>]+href=|@import|url\((?!#)/)
})

test('B: demonstration creates distinct runs, refuses existing directories and saves an invalid-input report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sciviz-b-output-'))
  try {
    const first = await generateDemo({ baseDirectory: root })
    const before = await readFile(join(first.directory, 'interactive.html'), 'utf8')
    const second = await generateDemo({ baseDirectory: root })
    assert.notEqual(first.directory, second.directory)
    await assert.rejects(generateDemo({ outputDirectory: first.directory }), { code: 'EEXIST' })
    assert.equal(await readFile(join(first.directory, 'interactive.html'), 'utf8'), before)
    const input = join(root, 'invalid.json')
    await writeFile(input, '{broken', { flag: 'wx' })
    const bad = await generateDemo({ contentPath: input, baseDirectory: root })
    assert.equal(bad.status, 'invalid_input')
    assert.deepEqual((await readdir(bad.directory)).sort(), ['interactive.html', 'report.json'])
    assert.match(await readFile(join(bad.directory, 'interactive.html'), 'utf8'), /输入无效/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
