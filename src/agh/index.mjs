import { createSessionState } from './session-state.mjs'
import { createWorkspaceLocator } from './workspace-discovery.mjs'
import { assessVisualization } from '../core/assessment.mjs'
import { generateVisualization } from '../core/pipeline.mjs'
import { loadRenderer } from '../core/renderer-adapter.mjs'

const T = (kind, extra = {}) => ({ [Symbol.for('TypeBox.Kind')]: kind, ...extra })
const STRING = (maxLength = 2048) => T('String', { type: 'string', minLength: 1, maxLength })
const OBJECT = (properties, required = []) => T('Object', {
  type: 'object', properties, required, additionalProperties: false,
})

const setRootParameters = OBJECT({ path: STRING(2048) }, ['path'])
const inspectParameters = OBJECT({}, [])

const configMeta = {
  isReadOnly: false, isDestructive: false, isConcurrencySafe: false, isOpenWorld: false,
  replay: 'never', costHint: undefined, deferLoading: false, requiresApproval: 'never',
}
const readOnlyMeta = {
  isReadOnly: true, isDestructive: false, isConcurrencySafe: true, isOpenWorld: false,
  replay: 'safe', costHint: undefined, deferLoading: false, requiresApproval: 'never',
}

const sessions = createSessionState(() => ({
  root: null, rootSource: null, attempted: [], discoveryFailed: false,
}))
const locator = createWorkspaceLocator({
  envKeys: ['SCIVIZ_ROOT', 'AGH_WORKSPACE'],
  markers: [
    { path: 'package.json', kind: 'file' },
    { path: 'src', kind: 'dir' },
    { path: 'docs', kind: 'dir' },
  ],
  maxDepth: 3,
  maxListings: 200,
})

const setScivizRoot = async (args, ctx) => {
  const state = sessions.get(ctx)
  if (!(await locator.set(ctx, state, args.path))) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'SCIVIZ_ROOT_INVALID: path must contain package.json, src/, and docs/.' }],
      details: { code: 'SCIVIZ_ROOT_INVALID', fixableByModel: true },
    }
  }
  const payload = { updated: true, root: state.root, source: state.rootSource }
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], structured: payload }
}

const inspectScivizWorkspace = async (_args, ctx) => {
  const state = sessions.get(ctx)
  const result = await locator.find(ctx, state)
  if (!result.root) {
    return {
      isError: true,
      content: [{ type: 'text', text: `SCIVIZ_ROOT_NOT_FOUND: checked ${result.attempted.join(', ') || '(no accessible paths)'}. Set SCIVIZ_ROOT or call set_sciviz_root.` }],
      details: { code: 'SCIVIZ_ROOT_NOT_FOUND', fixableByModel: true, attempted: result.attempted },
    }
  }
  const payload = { root: result.root, source: result.source, session: sessions.keyFor(ctx) }
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], structured: payload }
}

export const main = {
  inject: ['extension'],
  apply(ctx) {
    const agnes = ctx.extension()
    const parameters = OBJECT({ content_json: STRING(100000) }, ['content_json'])
    const wrap = (fn) => async (args, toolCtx) => {
      try {
        const structured = await fn(JSON.parse(args.content_json), toolCtx)
        return { content: [{ type: 'text', text: JSON.stringify(structured) }], structured }
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.message }], details: { code: error.code ?? 'EXECUTION_ERROR' } }
      }
    }
    agnes.registerTool({
      name: 'assess_visualization_feasibility',
      description: 'Check SciViz v1 content JSON for a free 2D workflow. Required: schema_version=1.0, title, goal, audience=undergraduate, sources[{id,citation,locator,excerpt}], nodes[{id,label,explanation,source_refs}] (3-8), edges[{from,to,label,source_refs}]. Optional: content_kind=synthetic_example|paper_excerpt, source url and verified; illustration={kind:wave_interference,phase_degrees:0..360,source_refs:[source_id]} only for a sourced ideal linear wave explanation, never inferred just from a title. verified may be omitted or false: do not ask the user to verify sources before generating, and never invent human verification. It is a post-generation review hint, not copyright permission. Preserve source references. Optional nodes[].visual_role=concept|data|process|model|measure|entity gives abstract role glyphs (not physical geometry). Optional visualization={layout:auto|process|hierarchy|network,chart:{kind:bar|line|scatter,title,x_label,y_label,series:[{label,source_refs,points:[{x,y}]}]}}. Layout auto chooses from graph topology; non-chain process requests retain branches. Chart uses only supplied numeric values: bar x is category text (same categories/order across series, 2-12 points), line/scatter x numeric (2-40 points); y finite numeric; 1-4 series; line x strictly increasing. Include units in axis labels and exact source locators. Never manufacture measurements, error bars, or significance. Omit chart if values are absent. No PDF parsing or scientific truth certification.',
      parameters, meta: readOnlyMeta,
      execute: wrap((value) => assessVisualization(value)),
    })
    agnes.registerTool({
      name: 'generate_visualization',
      description: 'Generate a free offline SciViz diagram and interactive page directly from the same content_json contract as assess_visualization_feasibility (including visualization layouts/charts and node visual_role); auto-selects process/hierarchy/network from supplied relationships; assessment runs internally, so a separate assessment call is optional. Omitted/false verified does not block generation: do not pause for human verification. When status=rendered, put open_page_markdown on its own line in the final answer as a clickable “打开互动页面” link; also report interactive_html_path as a fallback, then copyright_notice and source_review. Do not replace the page link with the manifest path. Copyright notice also appears at the page end; it does not grant permission. Writes only a fresh evidence/sciviz-* folder. Claim HTML exists only when status=rendered; missing sources or relationships are reported without inventing them.',
      parameters, meta: { ...configMeta, isConcurrencySafe: true },
      execute: wrap(async (value, toolCtx) => {
        const state = sessions.get(toolCtx)
        const found = await locator.find(toolCtx, state)
        if (!found.root) throw new Error('SCIVIZ_ROOT_NOT_FOUND: set workspace root first')
        return generateVisualization(value, { root: found.root, renderer: await loadRenderer(), executionOrigin: 'agh' })
      }),
    })
    agnes.registerTool({
      name: 'set_sciviz_root',
      description: 'Set the SciViz-AGH repository root for the current session. Use only when automatic workspace discovery fails.',
      parameters: setRootParameters,
      meta: configMeta,
      execute: setScivizRoot,
    })
    agnes.registerTool({
      name: 'inspect_sciviz_workspace',
      description: 'Read the current session workspace binding. Use before a SciViz operation to diagnose path configuration without modifying files.',
      parameters: inspectParameters,
      meta: readOnlyMeta,
      execute: inspectScivizWorkspace,
    })
    agnes.on('session_start', () => agnes.ctx.log.info('SciViz-AGH foundation ready.'))
    agnes.on('shutdown', (_payload, hookCtx) => sessions.clear(hookCtx))
  },
}
