import { escapeText as esc, wrapText } from './text.mjs'
export const chartColors = ['#66d9cf', '#efc778', '#b7a0f4', '#82b4ff']
const number = n => n === 0 ? '0' : Math.abs(n) >= 1e5 || Math.abs(n) < .001 ? n.toExponential(2) : String(Number(n.toPrecision(4)))
export function chartGeometry(chart) {
  const points = chart.series.flatMap(s => s.points), ys = points.map(p => p.y)
  let low = Math.min(...ys), high = Math.max(...ys)
  if (chart.kind === 'bar') { low = Math.min(0, low); high = Math.max(0, high) }
  if (low === high) { const pad = Math.max(1, Math.abs(low) * .1); low -= pad; high += pad }
  const pad = (high - low) * .08
  if (chart.kind !== 'bar' || low < 0) low -= pad
  if (chart.kind !== 'bar' || high > 0) high += pad
  // Stable readable ticks (e.g. 0,25,50,75,100), independent of series visibility.
  const rough = Math.max((high - low) / 4, 1e-300)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].find(s => s * magnitude >= rough) * magnitude
  low = Math.floor(low / step) * step; high = Math.ceil(high / step) * step
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + i * step)
  const xs = points.map(p => p.x)
  let xmin = chart.kind === 'bar' ? 0 : Math.min(...xs), xmax = chart.kind === 'bar' ? chart.series[0].points.length : Math.max(...xs)
  if (xmin === xmax) { xmin -= 1; xmax += 1 }
  return { low, high, ticks, xmin, xmax, x: v => 110 + (v - xmin) / (xmax - xmin) * 810, y: v => 352 - (v - low) / (high - low) * 250 }
}
export function renderChart(chart) {
  const g = chartGeometry(chart), ticks = g.ticks
  const grid = ticks.map(v => `<path d="M110 ${g.y(v)}H920" stroke="#2a3b50" stroke-dasharray="3 6"/><text x="94" y="${g.y(v) + 4}" text-anchor="end" fill="#93a8c1" font-size="12">${number(v)}</text>`).join('')
  const xLabels = chart.kind === 'bar' ? chart.series[0].points.map((p, i) => ({ label: p.x, x: g.x(i + .5) })) : Array.from({ length: 5 }, (_, i) => ({ label: number(g.xmin + (g.xmax - g.xmin) * i / 4), x: 110 + i / 4 * 810 }))
  const categoryUnits = chart.kind === 'bar' ? Math.max(6, Math.floor(810 / xLabels.length / 8)) : 16
  const labelHeight = Math.max(...xLabels.map(l => wrapText(l.label, categoryUnits).length)) * 18
  const height = Math.max(490, 422 + labelHeight)
  const marks = chart.series.map((s, i) => {
    const ink = chartColors[i]
    const segment = chart.kind === 'line' ? `<polyline points="${s.points.map(p => `${g.x(p.x)},${g.y(p.y)}`).join(' ')}" fill="none" stroke="${ink}" stroke-width="2.5"/>` : ''
    const points = s.points.map((p, j) => {
      const label = `${s.label} · ${chart.x_label}: ${p.x} · ${chart.y_label}: ${p.y}`
      const attrs = `class="chart-mark" data-chart-series="${i}" data-chart-point="${j}" data-reading="${esc(label)}" tabindex="0" role="img" aria-label="${esc(label)}"`
      if (chart.kind === 'bar') {
        const span = 810 / s.points.length, w = span * .7 / chart.series.length, x = g.x(j) + span * .15 + i * w
        return `<g ${attrs}><title>${esc(label)}</title><rect x="${x}" y="${Math.min(g.y(p.y), g.y(0))}" width="${Math.max(1, w - 3)}" height="${Math.max(1, Math.abs(g.y(p.y) - g.y(0)))}" rx="3" fill="${ink}" fill-opacity=".8"/></g>`
      }
      return `<g ${attrs}><title>${esc(label)}</title><circle cx="${g.x(p.x)}" cy="${g.y(p.y)}" r="5" fill="${ink}" stroke="#0a101a" stroke-width="2"/></g>`
    }).join('')
    return `<g class="chart-series" data-series="${i}">${segment}${points}</g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="${height}" viewBox="0 0 1020 ${height}" role="group" aria-label="${esc(chart.title)}" font-family="Segoe UI,Microsoft YaHei,sans-serif"><rect width="1020" height="${height}" rx="14" fill="#0a101a"/><text x="35" y="35" fill="#66d9cf" font-size="11" letter-spacing="2">SCIVIZ / EVIDENCE PLOT</text>${wrapText(chart.y_label, 90).map((l,i)=>`<text x="110" y="${65+i*17}" fill="#b8c8dc" font-size="13">${esc(l)}</text>`).join('')}${grid}<path d="M110 97V352H920" fill="none" stroke="#61748d"/>${chart.kind === 'bar' ? `<path data-zero-baseline="true" d="M110 ${g.y(0)}H920" stroke="#9aacbf"/>` : ''}${marks}${xLabels.map(l => wrapText(l.label, categoryUnits).map((line, i) => `<text x="${l.x}" y="${375+i*18}" text-anchor="middle" fill="#9ab0ca" font-size="12">${esc(line)}</text>`).join('')).join('')}${wrapText(chart.x_label, 90).map((l,i)=>`<text x="515" y="${height-51+i*17}" text-anchor="middle" fill="#b8c8dc" font-size="13">${esc(l)}</text>`).join('')}<text x="110" y="${height-15}" fill="#8299b5" font-size="11">${chart.kind === 'bar' ? '柱形从零基线绘制，保留负值' : chart.kind === 'line' ? '仅连接输入点 · 不拟合、不外推' : '仅显示输入点 · 不暗示相关或因果'} · 精确数值见下方数据表</text></svg>`
}
