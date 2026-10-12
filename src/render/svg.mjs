import { escapeText as esc, wrapText } from './text.mjs'
import { layoutGraph } from './layout.mjs'
import { copyrightNotice } from '../core/notices.mjs'
import { renderWave } from './wave.mjs'

export const presentationNotice = data => data.kind === 'synthetic_example'
  ? '教学合成示例 · 非真实论文结论'
  : '科学内容示意 · 请结合原始来源阅读'
export const scopeNotice = '箭头表达输入中的关系，不自动表示因果；结构可呈现不等于科学结论已验证。'
const palette = ['#66d9cf', '#82b4ff', '#c2a2f5', '#efc778', '#f39ca9', '#8cd6b5', '#a4bef3', '#d5b9ed']
const color = index => palette[index % palette.length]

export function renderSvg(data, interactive = false) {
  const graph = layoutGraph(data)
  const labels = new Map(data.nodes.map(n => [n.id, n.label]))
  const titleLines = wrapText(data.title, Math.floor((graph.width - 96) / 12))
  const titleOffset = Math.max(0, titleLines.length - 1) * 30
  const figureHeight = data.illustration && !interactive ? graph.width / 1020 * 296 + 30 : 0
  const headerOffset = titleOffset + figureHeight
  const edgeMarkup = graph.edges.map(edge => {
    const ink = edge.feedback ? '#efc778' : color(edge.from)
    const attrs = `data-edge="${edge.index}" data-from="${edge.from}" data-to="${edge.to}"`
    return `<g class="flow-edge" ${attrs} style="--edge-color:${ink}"><title>${esc(`${labels.get(edge.edge.from)} → ${labels.get(edge.edge.to)}：${edge.edge.label}`)}</title><g fill="none" stroke="${ink}" stroke-width="2.3"${edge.feedback ? ' stroke-dasharray="7 5"' : ''}><path d="${edge.departure}"/><path d="${edge.arrival}" marker-end="url(#arrow-${edge.index})"/></g><rect class="edge-label" x="${edge.x}" y="${edge.y}" width="${edge.width}" height="${edge.height}" rx="8" fill="#0c131e" stroke="${ink}" stroke-opacity=".3"/><text x="${edge.lx}" y="${edge.y + 18}" text-anchor="middle" font-size="10" letter-spacing="1.4" fill="${ink}">E${edge.index + 1}${edge.feedback ? ' · 回连' : ''}</text>${edge.lines.map((line, i) => `<text x="${edge.lx}" y="${edge.y + 39 + i * 20}" text-anchor="middle" font-size="14" fill="#dbe6f3" xml:space="preserve">${esc(line)}</text>`).join('')}</g>`
  }).join('')
  const shapes = graph.boxes.map(({ node, index, lines, x, y, width, height, incoming, outgoing }) => {
    const ink = color(index)
    return `<g class="flow-node" style="--node-color:${ink}"${interactive ? ` role="button" tabindex="0" aria-pressed="false" data-node="${index}" aria-controls="detail-${index}"` : ''} aria-label="${esc(`${index + 1}. ${node.label}`)}"><title>${esc(node.explanation)}</title><rect class="node-halo" x="${x - 5}" y="${y - 5}" width="${width + 10}" height="${height + 10}" rx="17" fill="none" stroke="${ink}" stroke-opacity=".1"/><rect class="node-surface" x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="url(#node-surface)" stroke="${ink}" stroke-opacity=".55"/><circle cx="${x + 28}" cy="${y + 29}" r="13" fill="${ink}" fill-opacity=".1" stroke="${ink}" stroke-opacity=".6"/><text x="${x + 28}" y="${y + 33}" text-anchor="middle" font-size="10" fill="${ink}">${String(index + 1).padStart(2, '0')}</text><text x="${x + width - 22}" y="${y + 34}" text-anchor="end" font-size="10" letter-spacing="1" fill="#a0b0c4">${incoming.length} 入向 / ${outgoing.length} 出向</text>${lines.map((line, i) => `<text x="${x + width / 2}" y="${y + 70 + i * 25}" text-anchor="middle" font-size="19" font-weight="550" fill="#f0f5fb" xml:space="preserve">${esc(line)}</text>`).join('')}<line x1="${x + width / 2 - 24}" x2="${x + width / 2 + 24}" y1="${y + height - 16}" y2="${y + height - 16}" stroke="${ink}" stroke-opacity=".6"/></g>`
  }).join('')
  const notes = []
  if (!interactive) {
    notes.push('阅读注解 / 节点与来源')
    data.nodes.forEach((n, i) => notes.push(`${String(i + 1).padStart(2, '0')}  ${n.label}`, n.explanation, `来源：${n.source_refs.join(', ') || '未提供'}`, ''))
    notes.push('完整关系 / 与图中 E 编号对应')
    data.edges.forEach((e, i) => notes.push(`E${i + 1}  ${labels.get(e.from)} → ${labels.get(e.to)}`, e.label, `来源：${e.source_refs.join(', ') || '未提供'}`, ''))
    notes.push('来源说明')
    data.sources.forEach(s => notes.push(`[${s.id}] ${s.citation}`, `位置：${s.locator}`, s.excerpt, s.url ? `链接：${s.url}` : '', `来源核对：${s.verified ? '提交者标记已核对' : '待核对（不影响生成）'}`, ''))
    notes.push(scopeNotice, ...data.limitations, '', copyrightNotice)
  }
  const noteLines = notes.flatMap(value => wrapText(value, Math.floor((graph.width - 110) / 8)))
  const noteStart = graph.height + headerOffset + 40
  const height = interactive ? graph.height + headerOffset : noteStart + noteLines.length * 24 + 36
  const inset = figureHeight ? `<svg x="0" y="${130 + titleOffset}" width="${graph.width}" height="${figureHeight - 30}" viewBox="0 0 1020 296">${renderWave(data.illustration)}</svg>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${graph.width}" height="${height}" viewBox="0 0 ${graph.width} ${height}" role="${interactive ? 'group' : 'img'}" aria-labelledby="diagram-title diagram-desc" font-family="Segoe UI, Microsoft YaHei, system-ui, sans-serif"><title id="diagram-title">${esc(data.title)}</title><desc id="diagram-desc">${esc(`${presentationNotice(data)}。${scopeNotice}按关系分层；分支并排，回连以虚线单独布线，全部关系保留原文。`)}</desc><defs><linearGradient id="node-surface" x2="0" y2="1"><stop stop-color="#192435"/><stop offset="1" stop-color="#101925"/></linearGradient><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#304057" opacity=".55"/></pattern>${graph.edges.map(edge => `<marker id="arrow-${edge.index}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="${edge.feedback ? '#efc778' : color(edge.from)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`).join('')}</defs><rect width="100%" height="100%" fill="#0a101a"/><rect width="100%" height="${graph.height + headerOffset}" fill="url(#grid)"/><text x="42" y="40" fill="#66d9cf" font-size="11" letter-spacing="3">SCIVIZ / RELATION ATLAS</text>${titleLines.map((line, i) => `<text x="42" y="${80 + i * 30}" font-size="23" fill="#eff4fc">${esc(line)}</text>`).join('')}<text x="42" y="${112 + titleOffset}" font-size="12" fill="#9cacc0">按关系分层 · 箭头旁直接阅读关系 · 虚线标记回连</text>${inset}<g transform="translate(0 ${headerOffset})">${graph.bands.map(b => `<text x="28" y="${b.y}" font-size="10" letter-spacing="2" fill="#8291a7">层 ${String(b.rank + 1).padStart(2, '0')}</text>`).join('')}${edgeMarkup}${shapes}</g>${!interactive ? `<line x1="42" y1="${noteStart - 22}" x2="${graph.width - 42}" y2="${noteStart - 22}" stroke="#2a3a4e"/>${noteLines.map((line, i) => `<text x="42" y="${noteStart + i * 24}" font-size="14" fill="#b7c6d9" xml:space="preserve">${esc(line)}</text>`).join('')}` : ''}</svg>`
}
