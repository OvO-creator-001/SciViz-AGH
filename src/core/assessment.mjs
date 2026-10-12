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
    requireThat(typeof s.verified === 'boolean', 'source verified must be boolean (human attestation)')
    sourceIds.add(s.id)
    return { id: s.id, citation: s.citation, locator: s.locator, excerpt: s.excerpt, verified: s.verified }
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
    return { id: n.id, label: n.label, explanation: n.explanation, source_refs: refs(n) }
  })
  requireThat(Array.isArray(value.edges) && value.edges.length <= 16, 'edges must be an array (max 16)')
  const pairs = new Set()
  const edges = value.edges.map(e => {
    requireThat(e && nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to && text(e.label, 120), 'invalid edge')
    const key = e.from + ':' + e.to
    requireThat(!pairs.has(key), 'duplicate edge'); pairs.add(key)
    return { from: e.from, to: e.to, label: e.label, source_refs: refs(e) }
  })
  requireThat(value.constraints === undefined || (value.constraints && typeof value.constraints === 'object' && !Array.isArray(value.constraints)), 'constraints must be an object')
  const c = value.constraints ?? {}
  requireThat(Object.keys(c).every(k => ['allow_paid', 'external_budget', 'offline_required'].includes(k)), 'unsupported constraint')
  requireThat((c.allow_paid === undefined || c.allow_paid === false) && (c.external_budget === undefined || c.external_budget === 0) && (c.offline_required === undefined || c.offline_required === true), 'only free offline mode is supported')
  return { schema_version: '1.0', title: value.title, goal: value.goal, audience: value.audience, sources, nodes, edges, constraints: { allow_paid: false, external_budget: 0, offline_required: true } }
}

export function assessVisualization(value) {
  const input = normalizeInput(value)
  const confirmed = new Set(input.sources.filter(s => s.verified).map(s => s.id))
  const missing = []
  for (const n of input.nodes) if (!n.source_refs.length || n.source_refs.some(r => !confirmed.has(r))) missing.push('node:' + n.id + ':human_confirmed_source_required')
  for (const e of input.edges) if (!e.source_refs.length || e.source_refs.some(r => !confirmed.has(r))) missing.push('edge:' + e.from + ':' + e.to + ':human_confirmed_source_required')
  if (!input.edges.length) missing.push('relationships_required')
  const supported = missing.length === 0
  return {
    schema_version: '1.0', decision: supported ? 'supported' : 'insufficient_evidence',
    recommended_format: supported ? 'interactive_2d' : 'evidence_report',
    missing_requirements: missing, evidence_refs: [...new Set([...input.nodes, ...input.edges].flatMap(x => x.source_refs))],
    limitations: ['Rule-based structural checks only; source verification is a human attestation, not automatic scientific validation.', 'No calibrated probability, PDF parsing, paid API, 3D or scientific simulation.'],
    fallbacks: supported ? ['static_svg', 'evidence_report'] : ['evidence_report'],
    external_cost: 0,
  }
}
