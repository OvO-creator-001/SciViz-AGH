// One validation boundary for analysis text, reading modes and teaching illustrations.
export const illustrationKinds = ['none', 'topology', 'fractal', 'quantum_wave', 'harmonic_motion', 'protein_structure']
export function normalizeLearning(value, sourceIds, fail) {
  if (value === undefined) return null
  const check = (ok, path, message) => { if (!ok) fail(`learning.${path}`, message) }
  const object = (v, path) => { check(v && typeof v === 'object' && !Array.isArray(v), path, '需要对象'); return v }
  const text = (v, path, max) => {
    check(typeof v === 'string' && v.trim() && v.length <= max && v.isWellFormed() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(v), path, `需要非空文本，最多 ${max} 字符`)
    return v
  }
  const array = (v, path, min, max) => { check(Array.isArray(v) && v.length >= min && v.length <= max, path, `需要 ${min}–${max} 项`); return v }
  const refs = (v, path) => array(v, path, 1, 20).map(id => { check(sourceIds.has(id), path, '来源 ID 不存在'); return id })
  const prose = (v, path, max = 2000) => {
    object(v, path)
    return { academic: text(v.academic, `${path}.academic`, max), popular: text(v.popular, `${path}.popular`, max), source_refs: refs(v.source_refs, `${path}.source_refs`) }
  }
  object(value, '')
  check(['academic', 'popular'].includes(value.mode), 'mode', '仅支持 academic 或 popular')
  const research_status = value.research_status ?? 'provided'
  check(['provided', 'not_requested', 'retrieved', 'partial', 'unavailable', 'no_results'].includes(research_status), 'research_status', '未知联网状态')
  const ids = new Set()
  const terms = array(value.terms, 'terms', 0, 8).map((item, i) => {
    const path = `terms[${i}]`, p = prose(item, path, 4000)
    check(typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(item.id) && !ids.has(item.id), `${path}.id`, 'ID 无效或重复')
    ids.add(item.id)
    const illustration = item.illustration ?? 'none'
    check(illustrationKinds.includes(illustration), `${path}.illustration`, '不支持的教学示意类型')
    return { ...p, id: item.id, term: text(item.term, `${path}.term`, 120),
      analogy: text(item.analogy, `${path}.analogy`, 1000), caveat: text(item.caveat, `${path}.caveat`, 1500), illustration }
  })
  return { mode: value.mode, research_status, summary: prose(value.summary, 'summary'),
    key_points: array(value.key_points, 'key_points', 1, 6).map((p, i) => prose(p, `key_points[${i}]`)), terms }
}

export function learningRefs(learning) {
  return learning ? [learning.summary, ...learning.key_points, ...learning.terms].flatMap(x => x.source_refs) : []
}
