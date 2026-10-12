const DEFAULT_SKIP = new Set([
  '.git', '.cache', '.venv', 'venv', 'node_modules', 'dist', 'build', 'target',
  '__pycache__', 'site-packages', 'AppData', 'Windows', 'Program Files',
])

export const normalizePath = (value) => {
  const text = String(value ?? '').replaceAll('\\', '/').replace(/\/{2,}/g, '/')
  if (text.length > 1) return text.replace(/\/$/, '')
  return text || '/'
}

export const joinPath = (...parts) => normalizePath(parts.filter(Boolean).join('/'))
export const dirname = (value) => {
  const path = normalizePath(value)
  const index = path.lastIndexOf('/')
  if (index <= 0) return path.startsWith('/') ? '/' : '.'
  return path.slice(0, index)
}
export const basename = (value) => normalizePath(value).split('/').at(-1)

const statMatches = async (ctx, marker) => {
  try {
    const stat = await ctx.fs.stat(marker.path)
    return !marker.kind || stat.kind === marker.kind || (marker.kind === 'file' && stat.kind === 'symlink')
  } catch {
    return false
  }
}

export function createWorkspaceLocator(options = {}) {
  const markers = options.markers ?? [
    { path: 'package.json', kind: 'file' },
    { path: 'src', kind: 'dir' },
  ]
  const envKeys = options.envKeys ?? ['SCIVIZ_ROOT', 'AGH_WORKSPACE']
  const maxDepth = options.maxDepth ?? 3
  const maxListings = options.maxListings ?? 200
  const skip = new Set([...(options.skipDirectories ?? []), ...DEFAULT_SKIP])

  const validate = async (ctx, candidate) => {
    const root = normalizePath(candidate)
    if (!candidate || typeof candidate !== 'string') return false
    return (await Promise.all(markers.map((marker) => statMatches(ctx, {
      ...marker,
      path: joinPath(root, marker.path),
    })))).every(Boolean)
  }

  const listDirectories = async (ctx, path, budget) => {
    if (budget.remaining <= 0) return []
    budget.remaining--
    try {
      return (await ctx.fs.list(path))
        .filter((entry) => entry && (entry.kind === 'dir' || entry.kind === 'symlink'))
        .map((entry) => joinPath(path, entry.name))
        .filter((entry) => !skip.has(basename(entry)))
    } catch {
      return []
    }
  }

  const search = async (ctx, root, depth, budget, attempted) => {
    attempted.push(root)
    if (await validate(ctx, root)) return root
    if (depth <= 0) return null
    const children = await listDirectories(ctx, root, budget)
    for (const child of children) {
      if (await validate(ctx, child)) return child
    }
    if (depth <= 1) return null
    for (const child of children) {
      const hit = await search(ctx, child, depth - 1, budget, attempted)
      if (hit) return hit
    }
    return null
  }

  const find = async (ctx, state) => {
    if (state.root) return { root: state.root, source: state.rootSource ?? 'session', attempted: state.attempted ?? [] }
    if (state.discoveryFailed) return { root: null, source: null, attempted: state.attempted ?? [] }

    const attempted = []
    const env = ctx.env ?? {}
    for (const key of envKeys) {
      if (!env[key]) continue
      const candidate = normalizePath(env[key])
      attempted.push(`${key}=${candidate}`)
      if (await validate(ctx, candidate)) {
        state.root = candidate
        state.rootSource = `env:${key}`
        state.attempted = attempted
        return { root: candidate, source: state.rootSource, attempted }
      }
    }

    let current = normalizePath(ctx.cwd ?? '/')
    for (let index = 0; index < 8; index++) {
      attempted.push(current)
      if (await validate(ctx, current)) {
        state.root = current
        state.rootSource = index === 0 ? 'cwd' : 'cwd-parent'
        state.attempted = attempted
        return { root: current, source: state.rootSource, attempted }
      }
      const parent = dirname(current)
      if (parent === current || parent === '.') break
      current = parent
    }

    const searchRoots = [env.SCIVIZ_SEARCH_ROOT].filter(Boolean).map(normalizePath)
    const budget = { remaining: maxListings }
    for (const root of searchRoots) {
      const hit = await search(ctx, root, maxDepth, budget, attempted)
      if (hit) {
        state.root = hit
        state.rootSource = 'bounded-search'
        state.attempted = attempted
        return { root: hit, source: state.rootSource, attempted }
      }
    }

    state.attempted = [...new Set(attempted)]
    state.discoveryFailed = true
    return { root: null, source: null, attempted: state.attempted }
  }

  const set = async (ctx, state, root) => {
    const candidate = normalizePath(root)
    if (!(await validate(ctx, candidate))) return false
    state.root = candidate
    state.rootSource = 'explicit'
    state.discoveryFailed = false
    state.attempted = [candidate]
    return true
  }

  return { validate, find, set, markers: structuredClone(markers) }
}
