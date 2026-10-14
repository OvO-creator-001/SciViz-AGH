import { normalizeVisualSpec, visualRoles } from '../core/visual-spec.mjs'
// Presentation validation only. Evidence decisions remain the caller's responsibility.
export class RenderInputError extends Error {
  constructor(path, message) {
    super(`${path}: ${message}`)
    this.name = 'RenderInputError'
    this.code = 'INVALID_INPUT'
    this.path = path
  }
}
const fail = (path, message) => { throw new RenderInputError(path, message) }
const object = (v, path) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, '需要对象')
  return v
}
const text = (v, path, max = 2000) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) fail(path, `需要非空文本，最多 ${max} 个 UTF-16 字符`)
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(v) || !v.isWellFormed()) fail(path, '含不能写入 SVG/XML 的字符')
  return v
}
const array = (v, path, min, max) => {
  if (!Array.isArray(v) || v.length < min || v.length > max) fail(path, `需要 ${min}–${max} 项数组`)
  return v
}
const identifier = (v, path, seen) => {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(v) || seen.has(v)) fail(path, 'ID 格式无效或重复')
  seen.add(v)
  return v
}
const texts = (v, path) => array(v, path, 0, 100).map((x, i) => text(x, `${path}[${i}]`))

export function adaptRenderInput(first, second) {
  const wrapped = second === undefined
  const content = object(wrapped ? object(first, 'arguments').content : first, 'content')
  const assessment = object(wrapped ? first.assessment : second, 'assessment')
  try {
    if (JSON.stringify({ content, assessment }).length > 100000) fail('input', '输入超过 100000 字符')
  } catch (error) {
    if (error instanceof RenderInputError) throw error
    fail('input', '需要可序列化的 JSON 数据')
  }
  if (!['0.1', '1.0'].includes(content.schema_version)) fail('content.schema_version', '仅支持 0.1 或 1.0')
  const legacy = content.schema_version === '0.1'
  if (content.audience !== 'undergraduate') fail('content.audience', '仅支持 undergraduate')
  if (!['supported', 'insufficient_evidence'].includes(assessment.decision)) fail('assessment.decision', '仅支持 supported 或 insufficient_evidence')
  const formats = assessment.decision === 'supported' ? ['interactive_2d', 'svg_diagram'] : ['evidence_report', 'interactive_2d']
  if (!formats.includes(assessment.recommended_format)) fail('assessment.recommended_format', '与 B 侧 2D/报告输出不兼容')
  const missing = texts(assessment.missing_requirements, 'assessment.missing_requirements')
  if (assessment.decision === 'supported' && missing.length) fail('assessment', 'supported 与非空 missing_requirements 矛盾')
  const constraints = content.constraints === undefined ? {} : object(content.constraints, 'content.constraints')
  if (Object.keys(constraints).some(k => !['allow_paid', 'external_budget', 'offline_required'].includes(k)) ||
      (constraints.allow_paid !== undefined && constraints.allow_paid !== false) ||
      (constraints.external_budget !== undefined && constraints.external_budget !== 0) ||
      (constraints.offline_required !== undefined && constraints.offline_required !== true)) fail('content.constraints', '仅支持免费离线约束')
  const sourceIds = new Set()
  const sources = array(content.sources, 'content.sources', 0, 20).map((s, i) => {
    const path = `content.sources[${i}]`
    object(s, path)
    if (!legacy && s.verified !== undefined && typeof s.verified !== 'boolean') fail(`${path}.verified`, '可选的人工核对标记必须是布尔值')
    return {
      id: identifier(s.id, `${path}.id`, sourceIds),
      citation: text(legacy ? s.label : s.citation, `${path}.${legacy ? 'label' : 'citation'}`),
      locator: text(s.locator, `${path}.locator`), excerpt: text(s.excerpt, `${path}.excerpt`, 10000),
      verified: legacy ? null : (s.verified ?? false),
      url: s.url === undefined ? null : text(s.url, `${path}.url`),
    }
  })
  const refs = (v, path) => array(v, path, 0, 20).map((r) => {
    if (!sourceIds.has(r)) fail(path, `来源 ID 不存在：${String(r).slice(0, 64)}`)
    return r
  })
  const nodeIds = new Set()
  const nodes = array(content.nodes, 'content.nodes', 3, 8).map((n, i) => {
    const path = `content.nodes[${i}]`
    object(n, path)
    if (n.visual_role !== undefined && !visualRoles.includes(n.visual_role)) fail(`${path}.visual_role`, 'unknown visual role')
    return { id: identifier(n.id, `${path}.id`, nodeIds), label: text(n.label, `${path}.label`, 120),
      explanation: text(n.explanation, `${path}.explanation`), source_refs: refs(n.source_refs, `${path}.source_refs`), visual_role: n.visual_role ?? 'concept' }
  })
  const pairs = new Set()
  const edges = array(content.edges, 'content.edges', 0, 16).map((e, i) => {
    const path = `content.edges[${i}]`
    object(e, path)
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) fail(path, '边端点无效或为自环')
    const pair = `${e.from}:${e.to}`
    if (pairs.has(pair)) fail(path, '重复的有向边')
    pairs.add(pair)
    return { from: e.from, to: e.to, label: text(e.label, `${path}.label`, 120), source_refs: refs(e.source_refs, `${path}.source_refs`) }
  })
  if (assessment.evidence_refs !== undefined) refs(assessment.evidence_refs, 'assessment.evidence_refs')
  if (content.content_kind !== undefined && !['synthetic_example', 'paper_excerpt'].includes(content.content_kind)) fail('content.content_kind', '未知内容类型')
  let illustration = null
  const visualization = normalizeVisualSpec(content.visualization, sourceIds, (path, message) => fail('content.' + path, message))
  if (assessment.decision === 'supported' && visualization.chart?.series.some(s => !s.source_refs.length)) fail('content.visualization.chart', 'chart series require source references')
  if (content.illustration !== undefined) {
    const figure = object(content.illustration, 'content.illustration')
    if (figure.kind !== 'wave_interference') fail('content.illustration.kind', '不支持的示意模板')
    const phase = figure.phase_degrees ?? 0
    if (!Number.isFinite(phase) || phase < 0 || phase > 360) fail('content.illustration.phase_degrees', '相位差需要为 0–360 度')
    const source_refs = refs(figure.source_refs, 'content.illustration.source_refs')
    if (!source_refs.length) fail('content.illustration.source_refs', '示意模板需要来源引用')
    illustration = { kind: figure.kind, phase_degrees: phase, source_refs }
  }
  return {
    title: text(content.title, 'content.title', 200),
    goal: legacy ? null : text(content.goal, 'content.goal'),
    kind: content.content_kind ?? 'unspecified', nodes, edges, sources, illustration, visualization,
    limitations: [...texts(content.limitations ?? [], 'content.limitations'), ...texts(assessment.limitations, 'assessment.limitations')],
    decision: assessment.decision, missing,
  }
}
