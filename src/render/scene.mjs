import { layoutGraph } from './layout.mjs'
import { wrapText } from './text.mjs'

export function selectPresentation(data) {
  const base = layoutGraph(data)
  const chain = base.boxes.every(b => b.incoming.length <= 1 && b.outgoing.length <= 1) && data.edges.length === data.nodes.length - 1 && !base.edges.some(e => e.feedback)
  const network = base.edges.some(e => e.feedback) || data.edges.length > data.nodes.length + 2
  const requested = data.visualization?.layout ?? 'auto'
  const mode = requested === 'auto' ? (chain ? 'process' : network ? 'network' : 'hierarchy') : requested === 'process' && !chain ? (network ? 'network' : 'hierarchy') : requested
  const names = { process: '方法流程', hierarchy: '分层关系', network: '关联网络' }
  const reason = requested === 'process' && !chain ? '输入并非单链，保留分支与回连，未强行改写为流程。' : requested !== 'auto' ? '使用输入指定的布局；不推断因果或时间顺序。' : chain ? '单链关系适合横向阅读；箭头遵循原始输入，不额外推断时间。' : network ? '存在回连或密集连接，采用环形布局保留交叉关系。' : '按输入连接分层，将分支与合流并排呈现。'
  return { mode, name: names[mode], reason, base }
}

export function layoutScene(data) {
  const plan = selectPresentation(data)
  if (plan.mode === 'hierarchy') return { ...plan.base, ...plan, key: [] }
  const ordered = plan.mode === 'process' ? [...plan.base.boxes].sort((a, b) => a.rank - b.rank) : plan.base.boxes.slice().sort((a, b) => a.index - b.index)
  const n = ordered.length
  const boxes = ordered.map((b, i) => {
    const lines = wrapText(b.node.label, 24)
    return { ...b, lines, width: 240, height: 140 + lines.length * 24, x: 40 + i * 370, y: 180, emblem: true }
  })
  if (plan.mode === 'process') {
    const byId = new Map(boxes.map(b => [b.node.id, b]))
    const edges = data.edges.map((edge, index) => {
      const from = byId.get(edge.from), to = byId.get(edge.to)
      const lines = wrapText(edge.label, 12), x = from.x + from.width + 9, y = 277
      return { edge, index, from: from.index, to: to.index, lines, x, y, width: 112, height: 30 + lines.length * 20, lx: x + 56,
        departure: `M ${from.x + from.width} 254 H ${to.x - 12}`, arrival: `M ${to.x - 24} 254 H ${to.x - 10}`, feedback: false }
    })
    return { ...plan, boxes, edges, bands: [], key: [], width: n * 370 - 50, height: Math.max(...boxes.map(b => b.y + b.height), ...edges.map(e => e.y + e.height)) + 64 }
  }
  const radius = 320 + Math.max(0, n - 4) * 52
  const width = radius * 2 + 340, cx = width / 2, cy = radius + 190 + Math.max(...boxes.map(b => b.height)) / 2
  boxes.forEach((b, i) => {
    const angle = -Math.PI / 2 + i / n * Math.PI * 2
    b.x = cx + Math.cos(angle) * radius - b.width / 2
    b.y = cy + Math.sin(angle) * radius - b.height / 2
  })
  const byId = new Map(boxes.map(b => [b.node.id, b]))
  const edges = data.edges.map((edge, index) => {
    const from = byId.get(edge.from), to = byId.get(edge.to)
    const a = { x: from.x + 120, y: from.y + from.height / 2 }, b = { x: to.x + 120, y: to.y + to.height / 2 }
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy)
    const boundary = node => Math.min(130 / Math.max(.001, Math.abs(dx / length)), (node.height / 2 + 12) / Math.max(.001, Math.abs(dy / length)))
    const da = boundary(from), db = boundary(to)
    const sx = a.x + dx / length * da, sy = a.y + dy / length * da, tx = b.x - dx / length * db, ty = b.y - dy / length * db
    // Reverse pairs bend to opposite sides instead of hiding each other's arrows.
    const mx = (sx + tx) / 2 - dy / length * 38, my = (sy + ty) / 2 + dx / length * 38
    const lx = (sx + 2 * mx + tx) / 4, ly = (sy + 2 * my + ty) / 4
    return { edge, index, from: from.index, to: to.index, x: lx - 23, y: ly - 14, lx, ly, width: 46, height: 28, lines: [], compact: true,
      departure: '', arrival: `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`, feedback: plan.base.edges.find(e => e.index === index).feedback }
  })
  // Separate only overlapping ID badges; leader lines retain their actual connection.
  for (const [i, edge] of edges.entries()) {
    let attempts = 0
    while (edges.slice(0, i).some(e => Math.abs(e.x - edge.x) < 50 && Math.abs(e.y - edge.y) < 32) && attempts++ < 24) edge.y += 34
  }
  let y = Math.max(...boxes.map(b => b.y + b.height), ...edges.map(e => e.y + e.height)) + 66
  const key = edges.map(e => {
    const from = data.nodes[e.from].label, to = data.nodes[e.to].label
    const lines = wrapText(`E${e.index + 1}   ${from} → ${to}：${e.edge.label}`, Math.floor((width - 100) / 8))
    const entry = { index: e.index, y, lines }; y += lines.length * 24 + 20; return entry
  })
  return { ...plan, boxes, edges, bands: [], key, width, height: y + 30 }
}

// Abstract role symbols, not purported molecular/physical geometry.
export function renderGlyph(role, x, y, ink) {
  const shapes = {
    data: '<ellipse cy="-18" rx="27" ry="9"/><path d="M-27-18V18C-27 30 27 30 27 18V-18M-27 0C-27 12 27 12 27 0M-27 15C-27 27 27 27 27 15"/>',
    process: '<path d="M-30 0H-15M15 0H30M24-6L30 0 24 6"/><path d="M0-23L22 0 0 23-22 0Z"/><path d="M-6 0H6M0-6V6"/>',
    model: '<path d="M-27-19L0-26 27-19V17L0 26-27 17ZM-27-19L0-10 27-19M0-10V26"/><path d="M-15-1L-8 2M9 2L16-1M-15 9L-8 12M9 12L16 9"/>',
    measure: '<path d="M-30 24H30M-27 20V-24M-18 18V8M-4 18V-3M10 18V-17M24 18V-9"/><circle cx="24" cy="-20" r="4"/>',
    entity: '<circle r="22"/><circle cx="-7" cy="-5" r="6"/><circle cx="9" cy="8" r="4"/><path d="M-4-27C20-37 41-7 27 13M-27-12C-42 10-19 36 3 29"/>',
    concept: '<circle r="22"/><path d="M-31 0H31M0-31V31"/><circle r="5"/>',
  }
  return `<g class="role-glyph" transform="translate(${x} ${y})" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle r="43" fill="${ink}" fill-opacity=".04" stroke-opacity=".17"/>${shapes[role] ?? shapes.concept}</g>`
}
