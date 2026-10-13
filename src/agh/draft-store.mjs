import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

// All persistence uses Host operations; never bypass a refused access.
export function draftRecord(ctx) {
  if (!ctx.fs?.read || !ctx.fs?.write || !ctx.cwd || !ctx.session?.key) return null
  const owner = createHash('sha256').update(JSON.stringify([ctx.session.key, resolve(ctx.cwd)])).digest('hex')
  return { owner, path: join(ctx.cwd, '.sciviz-drafts', `${owner}.json`) }
}
export async function readDrafts(ctx, record) {
  let bytes
  try { bytes = await ctx.fs.read(record.path) }
  catch (error) { if (error.code === 'ENOENT') return new Map(); throw error }
  if (bytes.byteLength > 2_000_000) throw new Error('DRAFT_RECORD_INVALID: 草稿记录超过大小限制。')
  const value = JSON.parse(new TextDecoder().decode(bytes))
  if (value.version !== 1 || value.owner !== record.owner || !Array.isArray(value.drafts) || value.drafts.length > 6)
    throw new Error('DRAFT_RECORD_INVALID: 草稿记录的版本或会话不匹配。')
  const drafts = new Map()
  for (const d of value.drafts) {
    if (!d || typeof d.id !== 'string' || drafts.has(d.id) || !Number.isInteger(d.revision) || d.revision < 0 || d.revision > 30 || !Array.isArray(d.sources) || d.sources.length > 20 || !Array.isArray(d.attempts) || d.attempts.length > 12 || !Array.isArray(d.history))
      throw new Error('DRAFT_RECORD_INVALID: 草稿记录结构无效。')
    drafts.set(d.id, d)
  }
  return drafts
}
export async function writeDrafts(ctx, record, drafts) {
  const text = JSON.stringify({ version: 1, owner: record.owner, drafts: [...drafts.values()] })
  if (Buffer.byteLength(text) > 2_000_000) throw new Error('DRAFT_RECORD_INVALID: 草稿记录超过大小限制。')
  await ctx.fs.write(record.path, text)
}
