import { escapeText as esc, safeHttpUrl } from '../render/text.mjs'
import { presentationNotice, scopeNotice } from '../render/svg.mjs'
import { copyrightNotice, reviewNotice } from '../core/notices.mjs'
import { renderWave, wavePoints } from '../render/wave.mjs'
import { chartPanel } from './chart-panel.mjs'
import { selectPresentation } from '../render/scene.mjs'
import { learningPanel, learningStyles, readingInteraction } from './learning-panel.mjs'

const styles = `
:root{color-scheme:dark;font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:#e6edf7;background:#080d16;--mint:#66d9cf;--muted:#a2afc2;--line:#253246}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 85% 0%,#18283988,transparent 45%),#080d16}header,main,footer{max-width:1440px;margin:auto;padding:0 48px}header{padding-top:32px;padding-bottom:30px}.brand{display:flex;justify-content:space-between;align-items:center;color:#a2afc2;font-size:12px;letter-spacing:2px;border-bottom:1px solid var(--line);padding-bottom:20px}.brand strong{color:var(--mint);font-size:16px;letter-spacing:3px}.eyebrow{font-size:11px;letter-spacing:2px;color:var(--mint);margin:26px 0 8px}h1{font-weight:560;font-size:clamp(26px,3.4vw,44px);letter-spacing:-.5px;line-height:1.35;margin:10px 0 16px;max-width:1080px}h2{font-size:19px;font-weight:550;margin:0 0 12px}h3{font-size:18px;line-height:1.55;font-weight:550;margin:10px 0}p,li{line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}p{margin:10px 0}.lead{color:#b8c5d7;max-width:920px;font-size:15px}.meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.meta span{color:#b7c4d8;font-size:12px;padding:6px 12px;border:1px solid var(--line);border-radius:6px}.meta .ready{color:var(--mint);border-color:#66d9cf50;background:#66d9cf0b}a{color:#8fc5ff;overflow-wrap:anywhere;text-decoration-thickness:1px;text-underline-offset:3px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid #efc778;outline-offset:4px}.studio{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px;align-items:start}.card{background:#101825;border:1px solid var(--line);border-radius:14px;padding:24px;margin-bottom:22px}.stage{padding:0;overflow:hidden;background:#0a101a}.stage-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-bottom:1px solid var(--line)}.stage-top h2{margin:0;font-size:16px}.tools{display:flex;gap:6px;flex-wrap:wrap}.hint,.muted{color:var(--muted);font-size:13px}.legend{display:flex;flex-wrap:wrap;gap:18px;padding:12px 22px;color:#aebdd1;font-size:11px;border-top:1px solid var(--line)}.legend span:before{content:'';display:inline-block;width:18px;border-top:2px solid var(--mint);margin-right:7px;vertical-align:middle}.legend .return:before{border-top:2px dashed #efc778}.canvas{height:690px;overflow:auto;overscroll-behavior:contain;scrollbar-color:#344661 #0a101a}.canvas svg{display:block;width:100%;height:auto;max-width:none;margin:0 auto}.node-nav{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0}.node-nav button{font-variant-numeric:tabular-nums;min-width:36px}.node-nav button[aria-pressed=true]{background:#66d9cf20;color:var(--mint);border-color:var(--mint)}.inspector{position:sticky;top:16px;max-height:810px;overflow:auto}.node-detail{padding:10px 0 16px;border-top:1px solid var(--line)}.node-detail p{font-size:14px}.node-detail.selected h3{color:var(--mint)}[hidden]{display:none!important}.flow-node{cursor:pointer}.flow-node:hover .node-surface{stroke-opacity:1;fill:#1c2d40}.flow-node[aria-pressed=true] .node-surface,.flow-node.related .node-surface{stroke-width:2.5;stroke-opacity:1}.flow-node[aria-pressed=true] .node-halo{stroke-opacity:.55;stroke-width:2}.flow-node:focus{outline:none}.flow-node:focus-visible .node-halo{stroke:#efc778;stroke-width:3;stroke-opacity:1}.flow-node.dimmed{opacity:.25}.flow-edge.dimmed{opacity:.12}.flow-edge.active path{stroke-width:3.5}.flow-edge.active .edge-label{stroke-opacity:1}.relation{border-top:1px solid var(--line);padding:12px 0}.relation button{text-align:left;width:100%;padding:10px 12px;line-height:1.7;background:#0b1320;border-color:#2a3b51}.relation button[aria-pressed=true]{border-color:var(--mint)}.relation .route{display:block;font-size:12px;color:#a9c5de}.relation .relation-label{display:block;color:#e9f0fa;font-size:14px;margin-top:4px}.relation small{font-size:11px;color:var(--mint)}.relation p{font-size:12px}.sections{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:22px;margin-top:4px}.section-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.source{border-top:1px solid var(--line);padding:16px 0;scroll-margin-top:20px}.source:target{outline:2px solid #efc778;outline-offset:8px}.source summary{cursor:pointer;line-height:1.7;color:#ccd9ea;overflow-wrap:anywhere}.source .source-id{color:var(--mint);margin-right:8px}blockquote{margin:14px 0;padding:12px 16px;background:#0b121d;border-left:2px solid #5b779b;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;color:#b8c6da;font-size:14px}button{font:inherit;font-size:12px;cursor:pointer;padding:7px 10px;border:1px solid #394c65;border-radius:6px;background:#172232;color:#dce7f6}button:hover{background:#23334b}button:disabled{opacity:.45;cursor:default}.notice{border-left:2px solid #efc778;padding-left:14px;color:#c3cddd;font-size:13px}.limitations li{color:#a8b7ca;font-size:13px}.mini-label{color:#718399;font-size:10px;letter-spacing:2px;margin-bottom:10px}.status{padding:14px 18px;border-left:2px solid #efc778;background:#efc7780d}.copyright{border-top:1px solid #334358;padding-top:24px;margin-top:14px}.copyright h2{font-size:15px;color:#ccd8e8}.copyright p{color:#91a2b9;font-size:12px;line-height:1.9}.footline{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #253246;margin-top:24px;padding:20px 0 32px;font-size:11px;color:#8496ad;letter-spacing:1px}
.science-plate{padding:24px;background:linear-gradient(130deg,#121c2b,#0b121e);border-color:#344257}.science-plate svg{width:100%;height:auto;display:block}.plate-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}.phase-control{display:flex;align-items:center;gap:18px;padding:15px 4px 0;flex-wrap:wrap}.phase-control label{font-size:13px;color:#c2d0e3}.phase-control input{accent-color:#66d9cf;width:min(330px,70vw)}.phase-note{font-size:12px;color:#a8b9d0}
.wave-scroll{overflow:auto;scrollbar-color:#344661 #0a101a}.mobile-hint{display:none}@media(max-width:760px){.wave-scroll svg{min-width:780px}.mobile-hint{display:block}}
@media(max-width:1050px){header,main,footer{padding-left:24px;padding-right:24px}.studio{grid-template-columns:minmax(0,1fr) 285px}.canvas{height:630px}}
@media(max-width:760px){header,main,footer{padding-left:16px;padding-right:16px}.studio,.sections{display:block}.inspector{position:static;max-height:none}.canvas{height:560px}.stage-top{align-items:start;flex-direction:column}.card{padding:20px}.stage{padding:0}.brand{letter-spacing:.5px}.brand span{font-size:10px}.footline{flex-direction:column}.flow-node.dimmed{opacity:.4}}
@media(prefers-reduced-motion:no-preference){.flow-node,.flow-edge{transition:opacity .18s ease}.node-surface{transition:stroke-width .15s ease}}
.guide-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 22px;background:#66d9cf06;border-bottom:1px solid var(--line)}.guide-controls output{flex:1;min-width:160px;font-size:12px;color:#b7c8dd}.layout-note{margin:0;padding:12px 22px;color:#8fabc7;font-size:12px}.chart-legend{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0}.chart-legend button{border-color:var(--series);color:var(--series);background:transparent}.chart-legend button:before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--series);margin-right:8px}.chart-legend button[aria-pressed=false]{opacity:.4}.plot-scroll,.table-scroll{overflow:auto;scrollbar-color:#344661 #0a101a}.plot-scroll svg{min-width:780px}.chart-mark:hover,.chart-mark:focus{filter:brightness(1.4);outline:none}.chart-mark:focus circle,.chart-mark:focus rect{stroke:#fff;stroke-width:2}.data-table summary{cursor:pointer;color:#a2b9d3;font-size:13px}.data-table table{border-collapse:collapse;width:100%;font-size:12px;margin-top:14px}.data-table td,.data-table th{text-align:left;padding:10px;border-bottom:1px solid #29394e;overflow-wrap:anywhere;max-width:220px}.data-table th{color:#bcd0e7}.data-table td{color:#97abc4}
@media print{.studio,.sections{display:block}.canvas{height:auto;overflow:visible}.canvas svg{width:100%!important}.inspector{position:static;max-height:none}.node-detail[hidden],.relation[hidden]{display:block!important}.flow-node.dimmed,.flow-edge.dimmed{opacity:1}.tools,.node-nav,button{display:none}.card{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`

// All input remains escaped HTML/SVG text. The browser script never interpolates it.
function interact(wavePoints) {
  const nodes = [...document.querySelectorAll('.flow-node[data-node]')]
  const edges = [...document.querySelectorAll('.flow-edge')]
  const details = [...document.querySelectorAll('.node-detail')]
  const relations = [...document.querySelectorAll('.relation')]
  const tabs = [...document.querySelectorAll('[data-select-node]')]
  const status = document.getElementById('selection-status')
  function highlight(selected, activeEdges, related) {
    nodes.forEach(n => {
      const i = Number(n.dataset.node)
      n.setAttribute('aria-pressed', String(i === selected))
      n.classList.toggle('related', related.has(i))
      n.classList.toggle('dimmed', !related.has(i))
    })
    edges.forEach(e => {
      const active = activeEdges.has(Number(e.dataset.edge))
      e.classList.toggle('active', active); e.classList.toggle('dimmed', !active)
    })
    relations.forEach(r => {
      const active = activeEdges.has(Number(r.dataset.relation))
      r.hidden = !active; r.querySelector('button').setAttribute('aria-pressed', 'false')
    })
    tabs.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.selectNode) === selected)))
  }
  function select(index, reveal = false) {
    const connected = edges.filter(e => Number(e.dataset.from) === index || Number(e.dataset.to) === index)
    const related = new Set([index, ...connected.flatMap(e => [Number(e.dataset.from), Number(e.dataset.to)])])
    highlight(index, new Set(connected.map(e => Number(e.dataset.edge))), related)
    details.forEach((d, i) => { d.hidden = i !== index; d.classList.toggle('selected', i === index) })
    status.textContent = '正在追踪：' + details[index].querySelector('h3').textContent
    if (reveal) nodes.find(n => Number(n.dataset.node) === index).scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  function reset() {
    details.forEach(d => { d.hidden = false; d.classList.remove('selected') })
    relations.forEach(r => { r.hidden = false; r.querySelector('button').setAttribute('aria-pressed', 'false') })
    nodes.forEach(n => { n.setAttribute('aria-pressed', 'false'); n.classList.remove('dimmed', 'related') })
    tabs.forEach(b => b.setAttribute('aria-pressed', 'false'))
    edges.forEach(e => e.classList.remove('dimmed', 'active'))
    status.textContent = '全图概览 · 选择一个概念，追踪它的上游与下游'
  }
  nodes.forEach(node => {
    const index = Number(node.dataset.node)
    node.addEventListener('click', () => select(index))
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(index) }
      else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + nodes.length) % nodes.length
        nodes.find(n => Number(n.dataset.node) === next).focus(); select(next)
      }
    })
  })
  tabs.forEach(b => b.addEventListener('click', () => select(Number(b.dataset.selectNode), true)))
  relations.forEach(r => r.querySelector('button').addEventListener('click', () => {
    const edge = edges.find(e => e.dataset.edge === r.dataset.relation)
    const related = new Set([Number(edge.dataset.from), Number(edge.dataset.to)])
    highlight(-1, new Set([Number(edge.dataset.edge)]), related)
    details.forEach((d, i) => { d.hidden = !related.has(i); d.classList.remove('selected') })
    r.querySelector('button').setAttribute('aria-pressed', 'true')
    status.textContent = '关系 E' + (Number(edge.dataset.edge) + 1) + ' · 仅突出显示两端与方向'
    edge.querySelector('.edge-label').scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }))
  const route = nodes.map(n => Number(n.dataset.node))
  let step = -1
  const stepOutput = document.getElementById('guide-status')
  function guide(delta) {
    step = Math.max(0, Math.min(route.length - 1, step + delta))
    select(route[step], true)
    stepOutput.textContent = (step + 1) + ' / ' + route.length + ' · ' + details[route[step]].querySelector('h3').textContent
    document.getElementById('guide-prev').disabled = step === 0
    document.getElementById('guide-next').disabled = step === route.length - 1
  }
  document.getElementById('guide-prev').addEventListener('click', () => guide(-1))
  document.getElementById('guide-next').addEventListener('click', () => guide(1))
  document.getElementById('show-all').addEventListener('click', () => {
    reset(); step = -1; stepOutput.textContent = '逐步聚焦概念与直接联系；顺序仅用于阅读，不代表因果。'
    document.getElementById('guide-prev').disabled = true
    document.getElementById('guide-next').disabled = false
  })
  document.querySelectorAll('.chart-mark').forEach(mark => {
    const read = () => { document.getElementById('chart-reading').textContent = mark.dataset.reading }
    mark.addEventListener('pointerenter', read); mark.addEventListener('focus', read)
  })
  const seriesButtons = [...document.querySelectorAll('[data-toggle-series]')]
  seriesButtons.forEach(button => button.addEventListener('click', () => {
    const active = button.getAttribute('aria-pressed') === 'true'
    if (active && seriesButtons.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1) return
    button.setAttribute('aria-pressed', String(!active))
    const group = document.querySelector('.chart-series[data-series="' + button.dataset.toggleSeries + '"]')
    group.style.display = active ? 'none' : ''
    document.getElementById('chart-reading').textContent = '仅切换系列可见性；坐标轴范围不变，完整数值仍在下方数据表。'
  }))
  const phase = document.getElementById('phase')
  if (phase) {
    const update = () => {
      const degrees = Number(phase.value)
      document.querySelectorAll('[data-wave]').forEach(p => p.setAttribute('points', wavePoints(degrees, p.dataset.wave)))
      document.getElementById('phase-number').textContent = degrees + '°'
      document.getElementById('phase-note').textContent = '合成振幅 = ' + (2 * Math.abs(Math.cos(degrees * Math.PI / 360))).toFixed(2) + '（单位振幅；位移叠加示意，不是光强或实验数据）'
    }
    phase.addEventListener('input', update); update()
  }
  const canvas = document.querySelector('.canvas'), svg = canvas.querySelector('svg')
  let zoom = 1
  function resize() {
    svg.style.width = Math.round(Math.max(svg.dataset.layout === 'process' && nodes.length > 4 ? 1400 : 800, canvas.clientWidth) * zoom) + 'px'
    document.getElementById('zoom-value').textContent = Math.round(zoom * 100) + '%'
  }
  document.getElementById('zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + .25); resize() })
  document.getElementById('zoom-out').addEventListener('click', () => { zoom = Math.max(.5, zoom - .25); resize() })
  document.getElementById('zoom-fit').addEventListener('click', () => { zoom = 1; resize(); canvas.scrollTo(0, 0) })
  document.querySelectorAll('[data-js-controls]').forEach(el => { el.hidden = false })
  new ResizeObserver(resize).observe(canvas)
  function revealSource() { const target = document.getElementById(location.hash.slice(1)); if (target?.matches('details.source')) target.open = true }
  window.addEventListener('hashchange', revealSource); revealSource(); reset()
}

const list = values => `<ul>${values.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`
function documentPage(title, body, interactive = false) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(title)}</title><style>${styles}${learningStyles}</style></head><body>${body}<footer><section class="copyright" id="copyright-notice"><h2>版权与使用说明</h2><p>${esc(copyrightNotice)}</p></section><div class="footline"><span>SciViz-AGH · 科学内容可视化</span><span>本页可离线阅读 · 来源链接仅在主动点击时联网</span></div></footer>${interactive ? `<script>(${readingInteraction.toString()})(); const wavePoints = ${wavePoints.toString()}; (${interact.toString()})(wavePoints);</script>` : ''}</body></html>`
}

export function renderPage(data, diagram) {
  const presentation = selectPresentation(data)
  const sourceIndex = new Map(data.sources.map((s, i) => [s.id, i]))
  const nodeIndex = new Map(data.nodes.map((n, i) => [n.id, i]))
  const refs = ids => ids.length ? ids.map(id => `<a href="#source-${sourceIndex.get(id)}">[${esc(id)}]</a>`).join(' ') : '未提供来源引用'
  const sources = `<section class="card" id="sources"><div class="mini-label">READ THE SOURCE</div><h2>对照原始资料</h2><p class="muted">${esc(reviewNotice)}</p>${data.sources.length ? data.sources.map((s, i) => {
    const url = safeHttpUrl(s.url)
    return `<details class="source" id="source-${i}"><summary><span class="source-id">[${esc(s.id)}]</span>${esc(s.citation)}</summary><p class="research-label">${s.kind === 'background' ? '联网补充背景 · 不代表原文结论' : '输入材料 / 原始来源'}${s.retrieved_at ? ` · 检索时间 ${esc(s.retrieved_at)}` : ''}${s.truncated ? ' · 部分摘录' : ''}</p><p class="muted">位置：${esc(s.locator)}</p><blockquote>${esc(s.excerpt)}</blockquote><p class="muted">来源核对：${s.verified ? '提交者标记已核对（非自动科学验证）' : '待核对 · 不影响本次生成'}</p>${s.url ? `<p>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">打开来源（联网）</a>` : '未启用链接（仅允许无凭据的 HTTP/HTTPS）'}<br>${esc(s.url)}</p>` : ''}</details>`
  }).join('') : '<p>没有已有来源。</p>'}</section>`
  const insufficient = data.decision === 'insufficient_evidence'
  const header = `<header><div class="brand"><strong>SCIVIZ<span style="color:#718399"> / </span>AGH</strong><span>让知识的关系变得可见</span></div><p class="eyebrow">SCIENTIFIC EXPLAINER / 交互式科学图解</p><h1>${esc(data.title)}</h1>${data.goal ? `<p class="lead">${esc(data.goal)}</p>` : ''}<div class="meta"><span class="ready">${insufficient ? '结构信息待补充' : '图解已生成'}</span><span>${data.nodes.length} 个概念</span><span>${data.edges.length} 条关系</span><span>${esc(presentationNotice(data))}</span></div></header>`
  const content = insufficient
    ? `<section class="card"><h2>缺失要求</h2><p class="status">现有输入缺少可呈现的来源引用或关系；这与是否填写 verified 无关。</p>${data.missing.length ? list(data.missing) : '<p>请核对输入中的来源引用与关系。</p>'}</section>`
    : `<div class="studio"><section class="card stage"><div class="stage-top"><h2>01 / ${presentation.name}</h2><div class="tools" data-js-controls hidden><button id="zoom-out" aria-label="缩小图形">−</button><span id="zoom-value" class="muted">100%</span><button id="zoom-in" aria-label="放大图形">+</button><button id="zoom-fit">适应宽度</button><button id="show-all">显示全部解释</button></div></div><p class="layout-note">${esc(presentation.reason)}</p><div class="guide-controls" data-js-controls hidden><button id="guide-prev" disabled>← 上一步</button><output id="guide-status" aria-live="polite">逐步聚焦概念与直接联系；顺序仅用于阅读，不代表因果。</output><button id="guide-next">逐步讲解 →</button></div><div class="canvas" tabindex="0" role="region" aria-label="科学关系图，可滚动查看并缩放">${diagram}</div><div class="legend"><span>输入关系</span><span class="return">回连关系</span><span>点击节点追踪上下游</span></div></section><aside class="card inspector"><div class="mini-label">FOLLOW THE CONNECTION</div><h2>02 / 概念与关系</h2><p id="selection-status" class="muted" role="status" aria-live="polite">全部节点解释与来源</p><div class="node-nav" data-js-controls hidden>${data.nodes.map((n, i) => `<button data-select-node="${i}" aria-pressed="false" aria-label="选择节点 ${esc(n.label)}">${String(i + 1).padStart(2, '0')}</button>`).join('')}</div>${data.nodes.map((n, i) => `<article class="node-detail" id="detail-${i}"><h3>${String(i + 1).padStart(2, '0')}. ${esc(n.label)}</h3><p>${esc(n.explanation)}</p><p class="muted">来源 ${refs(n.source_refs)}</p></article>`).join('')}<h3>关系解读</h3><p class="hint">选择关系可突出显示箭头的起点与终点。</p>${data.edges.map((e, i) => `<article class="relation" data-relation="${i}"><button type="button" aria-pressed="false"><small>E${i + 1}</small><span class="route">${esc(data.nodes[nodeIndex.get(e.from)].label)} → ${esc(data.nodes[nodeIndex.get(e.to)].label)}</span><span class="relation-label">${esc(e.label)}</span></button><p class="muted">依据 ${refs(e.source_refs)}</p></article>`).join('')}<noscript><p>JavaScript 未启用：图形、解释、关系与来源仍可阅读。</p></noscript></aside></div>`
  const figure = data.illustration && !insufficient ? `<section class="card science-plate"><div class="plate-heading"><h2>把抽象关系画出来 / 波的线性叠加</h2><span class="muted">理想化教学示意 · 非实验数据</span></div><div class="wave-scroll" tabindex="0" role="region" aria-label="波形对比，窄屏可左右滑动">${renderWave(data.illustration)}</div><p class="mobile-hint hint">左右滑动比较三幅波形，纵轴使用相同比例。</p><div class="phase-control" data-js-controls hidden><label for="phase">相位差 φ = <output id="phase-number">${data.illustration.phase_degrees}°</output></label><input id="phase" type="range" min="0" max="360" step="1" value="${data.illustration.phase_degrees}"><span id="phase-note" class="phase-note" role="status"></span></div><p class="muted">两列同频、同振幅的线性波，仅改变相对相位。曲线由图示公式计算，不从论文臆造测量点。依据 ${refs(data.illustration.source_refs)}</p></section>` : ''
  return documentPage(data.title, `${header}<main>${!insufficient ? learningPanel(data.learning, refs) : ''}${!insufficient && data.visualization?.chart ? chartPanel(data.visualization.chart, refs) : ""}${figure}${content}<div class="sections">${sources}<section class="card limitations"><div class="mini-label">READ WITH CONTEXT</div><h2>如何阅读这张图</h2><p class="notice">${esc(scopeNotice)}</p><p class="muted">布局根据连接结构选择；图形符号是抽象角色，不是真实分子、设备或几何。节点编号对应原始概念，E 编号对应完整关系；虚线只标记布局回连，不额外推断科学意义。Tab、回车和方向键也可以操作图形。</p>${list(data.limitations)}</section></div></main>`, !insufficient)
}

export function renderInputErrorPage(error) {
  return documentPage('输入无效 · SciViz-AGH', `<header><p class="eyebrow">输入检查报告</p><h1>输入无效，未生成图形</h1></header><main><section class="card"><p>${esc(error?.message ?? '无法读取输入，请检查 JSON 结构。')}</p><p>请修正对应字段后重试。没有自动删除节点、补充来源或改写内容。</p></section></main>`)
}
