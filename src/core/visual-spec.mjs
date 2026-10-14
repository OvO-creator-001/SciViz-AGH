// Shared, bounded visual grammar. This validates supplied facts; it never creates data.
export const visualRoles = ['concept', 'data', 'process', 'model', 'measure', 'entity']
export function normalizeVisualSpec(value, sourceIds, fail) {
  const check = (ok, path, message) => { if (!ok) fail(path, message) }
  const obj = (v, path) => check(v && typeof v === 'object' && !Array.isArray(v), path, 'expected object')
  const str = (v, path, max = 120) => {
    check(typeof v === 'string' && v.trim() && v.length <= max && v.isWellFormed() && !/[\u0000-\u001f\uFFFE\uFFFF]/u.test(v), path, `expected safe nonempty text up to ${max} characters`)
    return v
  }
  const path = 'visualization'
  if (value === undefined) return { layout: 'auto' }
  obj(value, path)
  const layout = value.layout ?? 'auto'
  check(['auto', 'process', 'hierarchy', 'network'].includes(layout), path + '.layout', 'unknown layout')
  if (value.chart === undefined) return { layout }
  const c = value.chart, cp = path + '.chart'
  obj(c, cp)
  check(['bar', 'line', 'scatter'].includes(c.kind), cp + '.kind', 'expected bar, line or scatter')
  check(Array.isArray(c.series) && c.series.length >= 1 && c.series.length <= 4, cp + '.series', 'expected 1-4 series')
  const names = new Set()
  let categories
  const series = c.series.map((s, i) => {
    const sp = `${cp}.series[${i}]`
    obj(s, sp)
    const label = str(s.label, sp + '.label', 60)
    check(!names.has(label), sp + '.label', 'duplicate series label'); names.add(label)
    check(Array.isArray(s.source_refs) && s.source_refs.length <= 20 && s.source_refs.every(r => sourceIds.has(r)), sp + '.source_refs', 'unknown source reference')
    check(Array.isArray(s.points) && s.points.length >= 2 && s.points.length <= (c.kind === 'bar' ? 12 : 40), sp + '.points', c.kind === 'bar' ? 'expected 2-12 points' : 'expected 2-40 points')
    const seen = new Set()
    const points = s.points.map((p, j) => {
      const pp = `${sp}.points[${j}]`
      obj(p, pp)
      check(Number.isFinite(p.y) && Math.abs(p.y) <= 1e12, pp + '.y', 'expected finite number within ±1e12')
      if (c.kind === 'bar') str(p.x, pp + '.x', 60)
      else check(Number.isFinite(p.x) && Math.abs(p.x) <= 1e12, pp + '.x', 'expected finite number within ±1e12')
      if (c.kind !== 'scatter') { check(!seen.has(p.x), pp + '.x', 'duplicate x'); seen.add(p.x) }
      if (c.kind === 'line' && j) check(p.x > s.points[j - 1].x, pp + '.x', 'line x must be strictly increasing; do not invent an order')
      return { x: p.x, y: p.y }
    })
    if (c.kind === 'bar') {
      const keys = JSON.stringify(points.map(p => p.x))
      check(categories === undefined || categories === keys, sp + '.points', 'bar series must use the same category order')
      categories = keys
    }
    return { label, source_refs: [...new Set(s.source_refs)], points }
  })
  return { layout, chart: { kind: c.kind, title: str(c.title, cp + '.title'), x_label: str(c.x_label, cp + '.x_label', 80), y_label: str(c.y_label, cp + '.y_label', 80), series } }
}
