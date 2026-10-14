import { wrapText } from './text.mjs'

// Feedback edges are excluded only from ranking, never from the displayed graph.
export function layoutGraph(data) {
  const outgoing = new Map(data.nodes.map(n => [n.id, []]))
  const incoming = new Map(data.nodes.map(n => [n.id, []]))
  data.edges.forEach((e, i) => { outgoing.get(e.from).push(i); incoming.get(e.to).push(i) })
  const state = new Map(), feedback = new Set()
  const visit = id => {
    state.set(id, 1)
    for (const index of outgoing.get(id)) {
      const target = data.edges[index].to
      if (state.get(target) === 1) feedback.add(index)
      else if (!state.has(target)) visit(target)
    }
    state.set(id, 2)
  }
  const starts = [...data.nodes.filter(n => !incoming.get(n.id).length).map(n => n.id), ...data.edges.map(e => e.from), ...data.nodes.map(n => n.id)]
  for (const id of starts) if (!state.has(id)) visit(id)
  const ranks = new Map(data.nodes.map(n => [n.id, 0]))
  for (let pass = 0; pass < data.nodes.length; pass++) {
    data.edges.forEach((e, i) => {
      if (!feedback.has(i)) ranks.set(e.to, Math.max(ranks.get(e.to), ranks.get(e.from) + 1))
    })
  }
  const layers = Array.from({ length: Math.max(...ranks.values()) + 1 }, () => [])
  data.nodes.forEach((node, index) => layers[ranks.get(node.id)].push({ node, index }))
  const order = new Map(data.nodes.map((n, i) => [n.id, i]))
  const parentOrder = item => {
    const parents = incoming.get(item.node.id).filter(i => !feedback.has(i)).map(i => order.get(data.edges[i].from))
    return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : item.index
  }
  layers.forEach(layer => { layer.sort((a, b) => parentOrder(a) - parentOrder(b) || a.index - b.index); layer.forEach((n, i) => order.set(n.node.id, i)) })
  const contentWidth = Math.max(920, Math.max(...layers.map(l => l.length)) * 380 + 80)
  const outer = data.edges.map((e, i) => ({ e, i })).filter(({ e, i }) => feedback.has(i) || ranks.get(e.to) !== ranks.get(e.from) + 1)
  const lanes = new Map(outer.map(({ i }, lane) => [i, contentWidth + 26 + lane * 24]))
  const width = contentWidth + (outer.length ? outer.length * 24 + 58 : 0)
  const boxes = [], labels = [], bands = []
  let top = 178
  for (const [rank, layer] of layers.entries()) {
    const layerBoxes = layer.map(({ node, index }, column) => {
      const lines = wrapText(node.label, 36)
      return { node, index, rank, lines, x: (contentWidth - layer.length * 380) / 2 + column * 380 + 22,
        y: top, width: 336, height: 96 + lines.length * 25, incoming: incoming.get(node.id), outgoing: outgoing.get(node.id) }
    })
    const rowHeight = Math.max(...layerBoxes.map(n => n.height))
    boxes.push(...layerBoxes)
    bands.push({ rank, y: top - 25 })
    const group = data.edges.map((edge, index) => ({ edge, index })).filter(({ edge }) => ranks.get(edge.from) === rank)
    const columns = Math.min(3, group.length)
    const labelWidth = Math.min(270, (contentWidth - 120) / Math.max(1, columns) - 24)
    let cursor = top + rowHeight + 48
    for (let start = 0; start < group.length; start += columns) {
      const row = group.slice(start, start + columns)
      const rowLabels = row.map(({ edge, index }, slot) => {
        const lines = wrapText(edge.label, 30)
        return { edge, index, lines, x: contentWidth / 2 + (slot - (row.length - 1) / 2) * (labelWidth + 26) - labelWidth / 2,
          y: cursor, width: labelWidth, height: 32 + lines.length * 20, feedback: feedback.has(index), lane: lanes.get(index) }
      })
      labels.push(...rowLabels)
      cursor += Math.max(...rowLabels.map(l => l.height)) + 20
    }
    top = Math.max(cursor, top + rowHeight) + 64
  }
  const byId = new Map(boxes.map(b => [b.node.id, b]))
  const edges = labels.sort((a, b) => a.index - b.index).map(label => {
    const from = byId.get(label.edge.from), to = byId.get(label.edge.to)
    const sx = from.x + from.width / 2, sy = from.y + from.height
    const tx = to.x + to.width / 2, ty = to.y - 8
    const lx = label.x + label.width / 2, ly = label.y + label.height / 2
    const departure = `M ${sx} ${sy} C ${sx} ${sy + 26}, ${lx} ${label.y - 26}, ${lx} ${label.y}`
    const tailY = label.y + label.height
    const arrival = label.lane === undefined
      ? `M ${lx} ${tailY} C ${lx} ${tailY + 24}, ${tx} ${ty - 30}, ${tx} ${ty}`
      : `M ${lx} ${tailY} V ${tailY + 12} H ${label.lane} V ${to.y - 42} H ${tx} V ${ty}`
    return { ...label, from: from.index, to: to.index, departure, arrival, lx, ly }
  })
  return { width, height: top + 20, contentWidth, boxes, edges, bands }
}
