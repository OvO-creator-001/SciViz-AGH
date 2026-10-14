import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assessVisualization, normalizeInput } from '../src/core/assessment.mjs'
import { renderVisualization } from '../src/render/index.mjs'
import { layoutScene, selectPresentation } from '../src/render/scene.mjs'
import { chartGeometry } from '../src/render/chart.mjs'
const fixture = async name => JSON.parse(await readFile(new URL(`../examples/gallery-v3/${name}.json`, import.meta.url), 'utf8'))
const bar = await fixture('model-comparison')

test('visual grammar: automatic topology routing preserves all input relationships', async () => {
  for (const [name, mode] of [['method','process'], ['evidence-tree','hierarchy'], ['ecology-network','network']]) {
    const input = await fixture(name), before = JSON.stringify(input)
    const scene = layoutScene(input)
    assert.equal(scene.mode, mode)
    assert.equal(scene.boxes.length, input.nodes.length)
    assert.equal(scene.edges.length, input.edges.length)
    assert.deepEqual(scene.edges.map(e=>e.edge), input.edges)
    assert.ok(scene.boxes.every(b=>b.x>=0 && b.y>=178 && b.x+b.width<=scene.width && b.y+b.height<=scene.height))
    assert.equal(JSON.stringify(input), before)
    const result = renderVisualization(input, assessVisualization(input))
    assert.match(result.html, new RegExp(`data-layout="${mode}"`))
    assert.match(result.html, /id="guide-next"/)
    assert.match(result.svg, /role-glyph/)
  }
  const branch = await fixture('evidence-tree'); branch.visualization = {layout:'process'}
  assert.equal(selectPresentation(branch).mode,'hierarchy')
  assert.match(selectPresentation(branch).reason,/并非单链/)
})

test('visual grammar: all chart families preserve exact input values, sources and offline output', async () => {
  for (const [name, kind] of [['model-comparison','bar'], ['environment-trend','line'], ['material-scatter','scatter']]) {
    const input = await fixture(name), normalized = normalizeInput(input), assessment = assessVisualization(input)
    assert.deepEqual(normalized.visualization.chart, input.visualization.chart)
    assert.equal(assessment.decision,'supported')
    assert.equal(assessment.source_review.blocks_generation,false)
    const output = renderVisualization(input, assessment)
    assert.match(output.html,/class="data-table"/)
    assert.match(output.html,/href="#source-0"/)
    for (const s of input.visualization.chart.series) for (const p of s.points) assert.ok(output.html.includes(`<td>${p.y}</td>`))
    assert.equal((output.svg.match(/class="chart-mark"/g)??[]).length,input.visualization.chart.series.reduce((n,s)=>n+s.points.length,0))
    if (kind==='scatter') assert.doesNotMatch(output.svg,/<polyline/)
    if (kind==='bar') assert.match(output.svg,/data-zero-baseline/)
    assert.deepEqual(output,renderVisualization(input,assessment))
    assert.doesNotMatch(output.html,/<script[^>]+src=|<link[^>]+href=|@import/)
  }
})

test('visual grammar: chart requires traceable input, never infers values from the title', async () => {
  const noChart = await fixture('method'); noChart.title = 'Accuracy chart, error bars and p-values'
  assert.doesNotMatch(renderVisualization(noChart,assessVisualization(noChart)).html,/class="chart-mark"/)
  const pending=structuredClone(bar); pending.visualization.chart.series[0].source_refs=[]
  assert.ok(assessVisualization(pending).missing_requirements.includes('chart:series:0:source_reference_required'))
  assert.throws(()=>renderVisualization(pending,assessVisualization(bar)),/source references/)
  const distinct = structuredClone(bar)
  distinct.sources.push({...distinct.sources[0],id:'table',citation:'Exact table 1',verified:false})
  distinct.visualization.chart.series[0].source_refs=['table']
  assert.ok(assessVisualization(distinct).evidence_refs.includes('table'))
})

test('visual grammar: reject ambiguous, mismatched, nonfinite, unsafe or oversized chart input', async () => {
  const invalid = [
    x=>x.visualization.chart.series[0].points[0].y=Infinity,
    x=>x.visualization.chart.series[0].points[0].y='4',
    x=>x.visualization.chart.series[0].source_refs=['unknown'],
    x=>x.visualization.chart.series[1].points[0].x='different category',
    x=>x.visualization.chart.series[0].points[1].x=x.visualization.chart.series[0].points[0].x,
    x=>x.visualization.chart.series[1].label=x.visualization.chart.series[0].label,
    x=>x.visualization.chart.x_label='invalid\u0000xml',
    x=>x.visualization.chart.series[0].points=Array(13).fill({x:'a',y:2}),
    x=>x.visualization.chart.kind='pie',
    x=>x.nodes[0].visual_role='<script>',
  ]
  for (const mutate of invalid) { const input=structuredClone(bar); mutate(input); assert.throws(()=>assessVisualization(input)); assert.throws(()=>renderVisualization(input,assessVisualization(bar))) }
  const line = await fixture('environment-trend'); line.visualization.chart.series[0].points.reverse()
  assert.throws(()=>assessVisualization(line),/strictly increasing/)
  const injected=structuredClone(bar); injected.visualization.chart.title='</script><img src=x onerror=alert(1)>'
  injected.visualization.chart.series[0].label='<svg onload=alert(1)>'
  const result=renderVisualization(injected,assessVisualization(injected))
  assert.doesNotMatch(result.html,/<img|<svg onload/)
  assert.match(result.html,/&lt;img/)
  assert.equal((result.html.match(/<script>/g)??[]).length,1)
})

test('visual grammar: zero baseline, negative values, constant and irregular numeric axes', async () => {
  const chart=structuredClone(bar.visualization.chart)
  chart.series.forEach(s=>s.points.forEach((p,i)=>p.y=[-5,0,10][i]))
  const g=chartGeometry(chart)
  assert.ok(g.low<=-5 && g.high>=10 && g.y(-5)>g.y(0) && g.y(10)<g.y(0))
  chart.series.forEach(s=>s.points.forEach(p=>p.y=0))
  assert.ok(Number.isFinite(chartGeometry(chart).y(0)))
  const line=(await fixture('environment-trend')).visualization.chart
  const linear=chartGeometry(line)
  assert.ok(Math.abs((linear.x(9)-linear.x(5))/(linear.x(2)-linear.x(0))-2)<1e-9)
})

test('visual grammar: long process and network labels stay in bounds and retain their text', async () => {
  for (const name of ['method','ecology-network']) {
    const input=await fixture(name)
    input.nodes.forEach(n=>n.label='长'.repeat(120))
    input.edges.forEach(e=>e.label='关系'.repeat(60))
    const scene=layoutScene(input)
    assert.ok(scene.boxes.every(b=>b.x>=0 && b.y>=178 && b.x+b.width<=scene.width && b.y+b.height<=scene.height))
    assert.ok(scene.edges.every(e=>e.x>=0 && e.y>=0 && e.x+e.width<=scene.width && e.y+e.height<=scene.height))
    assert.ok(renderVisualization(input,assessVisualization(input)).html.includes('长'.repeat(120)))
  }
})
