import { escapeText as esc, wrapText } from './text.mjs'

export const presentationNotice = (data) => data.kind === 'synthetic_example'
  ? '教学合成示例 · 非真实论文结论'
  : '依据输入制作的流程示意 · 科学含义需人工核对'
export const scopeNotice = '评估仅表示输入满足既定规则，不表示科学正确性已验证。'

export function renderSvg(data, interactive = false) {
  const titleLines = wrapText(data.title, 58)
  const headerBottom = 110 + titleLines.length * 26
  let y = headerBottom + 36
  const boxes = data.nodes.map((node, index) => {
    const lines = wrapText(node.label, 32)
    const height = Math.max(88, 46 + lines.length * 24)
    const box = { node, index, lines, y, height }
    y += height + 70
    return box
  })
  const byId = new Map(boxes.map(b => [b.node.id, b]))
  const paths = data.edges.map((edge, i) => {
    const from = byId.get(edge.from), to = byId.get(edge.to)
    const adjacent = to.index === from.index + 1
    const lane = 500 + i * 14
    const start = from.y + from.height / 2, end = to.y + to.height / 2
    const d = adjacent ? `M 260 ${from.y + from.height} V ${to.y - 8}` : `M 450 ${start} H ${lane} V ${end} H 458`
    const tx = adjacent ? 280 : lane + 3, ty = adjacent ? from.y + from.height + 40 : start - 8
    return `<g><title>${esc(`E${i + 1}: ${edge.from} → ${edge.to}：${edge.label}；来源 ${edge.source_refs.join(', ') || '未提供'}`)}</title><path d="${d}" fill="none" stroke="#70869b" stroke-width="2" marker-end="url(#arrow)"/><text x="${tx}" y="${ty}" font-size="13" fill="#40566b">E${i + 1}</text></g>`
  }).join('')
  const shapes = boxes.map(({ node, index, lines, y: top, height }) => `<g class="flow-node"${interactive ? ` role="button" tabindex="0" aria-pressed="false" data-node="${index}" aria-controls="detail-${index}"` : ''} aria-label="${esc(`${index + 1}. ${node.label}`)}"><title>${esc(node.explanation)}</title><rect x="70" y="${top}" width="380" height="${height}" rx="14" fill="#ffffff" stroke="#526e88" stroke-width="2"/><text x="90" y="${top + 25}" font-size="12" fill="#516e87">${String(index + 1).padStart(2, '0')}</text><text x="260" y="${top + 52}" text-anchor="middle" font-size="18" fill="#132d45">${lines.map((line, i) => `<tspan x="260" dy="${i === 0 ? 0 : 24}">${esc(line)}</tspan>`).join('')}</text></g>`).join('')
  const notes = []
  if (!interactive) {
    notes.push('节点解释与来源')
    data.nodes.forEach((n, i) => notes.push(`${i + 1}. ${n.label}`, n.explanation, `来源：${n.source_refs.join(', ') || '未提供'}`))
    notes.push('连接关系（E 编号对应箭头；不自动表示因果）')
    data.edges.forEach((e, i) => notes.push(`E${i + 1}. ${e.from} → ${e.to}：${e.label}；来源：${e.source_refs.join(', ') || '未提供'}`))
    notes.push('来源说明')
    data.sources.forEach(s => notes.push(`[${s.id}] ${s.citation}`, `位置：${s.locator}`, `摘录：${s.excerpt}`, s.url ? `链接文本：${s.url}` : '', `人工确认：${s.verified === null ? '未提供标记' : s.verified ? '提交者标记为已核对' : '未确认'}`))
    notes.push('限制', scopeNotice, ...data.limitations)
  }
  const noteLines = notes.flatMap(value => wrapText(value, 84))
  const noteStart = y + 20
  const height = noteStart + noteLines.length * 22 + 40
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}" role="${interactive ? 'group' : 'img'}" aria-labelledby="diagram-title diagram-desc" font-family="system-ui, sans-serif"><title id="diagram-title">${esc(data.title)}</title><desc id="diagram-desc">${esc(`${presentationNotice(data)}。${scopeNotice}节点按输入顺序纵向排列，E 编号对应连接关系。`)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#70869b"/></marker></defs><rect width="760" height="${height}" fill="#f3f7fa"/><text x="32" y="32" font-size="14" fill="#315b77">${esc(presentationNotice(data))}</text>${titleLines.map((line, i) => `<text x="32" y="${66 + i * 26}" font-size="20" fill="#142e44">${esc(line)}</text>`).join('')}<text x="32" y="${headerBottom - 20}" font-size="13" fill="#40566b">节点顺序来自输入；箭头只表示输入中的关系。</text><text x="32" y="${headerBottom}" font-size="12" fill="#40566b">${esc(scopeNotice)}</text>${paths}${shapes}${noteLines.map((line, i) => `<text x="32" y="${noteStart + i * 22}" font-size="14" fill="#20394e" xml:space="preserve">${esc(line)}</text>`).join('')}</svg>`
}
