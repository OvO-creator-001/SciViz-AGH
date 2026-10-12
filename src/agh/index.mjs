import { createSessionState } from './session-state.mjs'
import { createWorkspaceLocator } from './workspace-discovery.mjs'

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
