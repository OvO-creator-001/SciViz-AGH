export function createSessionState(createValue) {
  if (typeof createValue !== 'function') throw new TypeError('createValue must be a function')
  const values = new Map()

  const keyFor = (ctx = {}) => String(ctx.session?.key ?? ctx.cwd ?? '<offline>')
  const get = (ctx) => {
    const key = keyFor(ctx)
    if (!values.has(key)) values.set(key, createValue())
    return values.get(key)
  }
  const clear = (ctx) => values.delete(keyFor(ctx))

  return { get, clear, keyFor, size: () => values.size }
}
