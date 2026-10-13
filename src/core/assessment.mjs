import { copyrightNotice, reviewNotice } from './notices.mjs'
import { normalizeVisualSpec, visualRoles } from './visual-spec.mjs'
import { normalizeLearning, learningRefs } from './learning.mjs'

export class InputError extends Error {
  constructor(message) { super(message); this.code = 'INVALID_INPUT' }
}
const requireThat = (ok, message) => { if (!ok) throw new InputError(message) }
const text = (x, max = 2000) => typeof x === 'string' && x.trim().length > 0 && x.length <= max
const id = (x) => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(x)

export function normalizeInput(value) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value), 'input must be an object')
  requireThat(Buffer.byteLength(JSON.stringify(value)) <= 100000, 'input exceeds 100KB')
  requireThat(value.schema_version === '1.0', 'schema_version must be 1.0')
  requireThat(text(value.title, 200) && text(value.goal), 'title and goal are required')
  requireThat(value.audience === 'undergraduate', 'only undergraduate audience is supported')
  requireThat(Array.isArray(value.sources) && value.sources.length <= 20, 'sources must be an array (max 20)')
  const sourceIds = new Set()
  const sources = value.sources.map(s => {
    requireThat(s && id(s.id) && !sourceIds.has(s.id), 'invalid or duplicate source id')
    requireThat(text(s.citation) && text(s.locator) && text(s.excerpt, 10000), 'source requires citation, locator and excerpt')
    requireThat(s.verified === undefined || typeof s.verified === 'boolean', 'source verified must be boolean when supplied')
    requireThat(s.url === undefined || text(s.url), 'source url must be text when supplied')
    requireThat(s.kind === undefined || ['original', 'background'].includes(s.kind), 'invalid source kind')
    requireThat(s.retrieved_at === undefined || (text(s.retrieved_at, 40) && Number.isFinite(Date.parse(s.retrieved_at))), 'invalid retrieval time')
    requireThat(s.truncated === undefined || typeof s.truncated === 'boolean', 'invalid source truncated flag')
    sourceIds.add(s.id)
    return { id: s.id, citation: s.citation, locator: s.locator, excerpt: s.excerpt, verified: s.verified ?? false, ...(s.url === undefined ? {} : { url: s.url }),
      ...(s.kind === undefined ? {} : { kind: s.kind }), ...(s.retrieved_at === undefined ? {} : { retrieved_at: s.retrieved_at }), ...(s.truncated === undefined ? {} : { truncated: s.truncated }) }
  })
  const refs = item => {
    requireThat(Array.isArray(item.source_refs) && item.source_refs.length <= 20 && item.source_refs.every(r => sourceIds.has(r)), 'invalid source_refs')
    return [...new Set(item.source_refs)]
  }
  requireThat(Array.isArray(value.nodes) && value.nodes.length >= 3 && value.nodes.length <= 8, 'nodes must contain 3-8 entries')
  const nodeIds = new Set()
  const nodes = value.nodes.map(n => {
    requireThat(n && id(n.id) && !nodeIds.has(n.id) && text(n.label, 120) && text(n.explanation), 'invalid or duplicate node')
    nodeIds.add(n.id)
    requireThat(n.visual_role === undefined || visualRoles.includes(n.visual_role), 'invalid node visual_role')
    return { id: n.id, label: n.label, explanation: n.explanation, source_refs: refs(n), ...(n.visual_role === undefined ? {} : { visual_role: n.visual_role }) }
  })
  requireThat(Array.isArray(value.edges) && value.edges.length <= 16, 'edges must be an array (max 16)')
  const pairs = new Set()
  const edges = value.edges.map(e => {
    requireThat(e && nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to && text(e.label, 120), 'invalid edge')
    const key = e.from + ':' + e.to
    requireThat(!pairs.has(key), 'duplicate edge'); pairs.add(key)
    return { from: e.from, to: e.to, label: e.label, source_refs: refs(e) }
  })
  let illustration
  const learning = normalizeLearning(value.learning, sourceIds, (path, message) => { throw new InputError(`${path}: ${message}`) })
  if (learning) for (const point of [learning.summary, ...learning.key_points]) requireThat(point.source_refs.every(id => sources.find(s => s.id === id).kind !== 'background'), 'learning summary/key_points must cite original sources, not background')
  const visualization = normalizeVisualSpec(value.visualization, sourceIds, (path, message) => { throw new InputError(`${path}: ${message}`) })
  if (value.illustration !== undefined) {
    const figure = value.illustration
    requireThat(figure && figure.kind === 'wave_interference', 'unsupported illustration kind')
    const phase = figure.phase_degrees ?? 0
    requireThat(Number.isFinite(phase) && phase >= 0 && phase <= 360, 'phase_degrees must be between 0 and 360')
    illustration = { kind: figure.kind, phase_degrees: phase, source_refs: refs(figure) }
  }
  requireThat(value.constraints === undefined || (value.constraints && typeof value.constraints === 'object' && !Array.isArray(value.constraints)), 'constraints must be an object')
  const c = value.constraints ?? {}
  requireThat(Object.keys(c).every(k => ['allow_paid', 'external_budget', 'offline_required'].includes(k)), 'unsupported constraint')
  requireThat((c.allow_paid === undefined || c.allow_paid === false) && (c.external_budget === undefined || c.external_budget === 0) && (c.offline_required === undefined || c.offline_required === true), 'only free offline mode is supported')
  requireThat(value.content_kind === undefined || ['synthetic_example', 'paper_excerpt'].includes(value.content_kind), 'invalid content_kind')
  requireThat(value.limitations === undefined || (Array.isArray(value.limitations) && value.limitations.length <= 20 && value.limitations.every(x => text(x))), 'invalid limitations')
  return { schema_version: '1.0', title: value.title, goal: value.goal, audience: value.audience,
    ...(value.content_kind === undefined ? {} : { content_kind: value.content_kind }),
    ...(value.limitations === undefined ? {} : { limitations: [...value.limitations] }),
    ...(illustration === undefined ? {} : { illustration }),
    ...(learning === null ? {} : { learning }),
    visualization,
    sources, nodes, edges, constraints: { allow_paid: false, external_budget: 0, offline_required: true } }
}

export function assessVisualization(value) {
  const input = normalizeInput(value)
  const missing = []
  for (const n of input.nodes) if (!n.source_refs.length) missing.push('node:' + n.id + ':source_reference_required')
  for (const e of input.edges) if (!e.source_refs.length) missing.push('edge:' + e.from + ':' + e.to + ':source_reference_required')
  if (!input.edges.length) missing.push('relationships_required')
  if (input.illustration && !input.illustration.source_refs.length) missing.push('illustration:source_reference_required')
  for (const [i, s] of (input.visualization.chart?.series ?? []).entries()) if (!s.source_refs.length) missing.push(`chart:series:${i}:source_reference_required`)
  const supported = missing.length === 0
  const evidenceRefs = [...new Set([...input.nodes, ...input.edges, ...(input.illustration ? [input.illustration] : []), ...(input.visualization.chart?.series ?? [])].flatMap(x => x.source_refs).concat(learningRefs(input.learning)))]
  const pending = input.sources.filter(s => !s.verified && evidenceRefs.includes(s.id)).map(s => s.id)
  return {
    schema_version: '1.0', decision: supported ? 'supported' : 'insufficient_evidence',
    recommended_format: supported ? 'interactive_2d' : 'evidence_report',
    missing_requirements: missing, evidence_refs: evidenceRefs,
    source_review: { status: pending.length ? 'pending' : 'submitter_marked_reviewed', pending_source_refs: pending, blocks_generation: false },
    warnings: pending.length ? [{ code: 'SOURCE_REVIEW_PENDING', source_refs: pending, message: reviewNotice }] : [],
    copyright_notice: copyrightNotice,
    limitations: [reviewNotice, '本图只表达输入中的节点与关系；未进行自动论文解析、科学模拟或科学真实性验证。'],
    fallbacks: supported ? ['static_svg', 'evidence_report'] : ['evidence_report'],
    external_cost: 0,
  }
}
