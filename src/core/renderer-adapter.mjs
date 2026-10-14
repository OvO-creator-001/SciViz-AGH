import { access } from 'node:fs/promises'
const entry = new URL('../render/index.mjs', import.meta.url)
export async function loadRenderer() {
  try { await access(entry) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  const module = await import(entry.href)
  if (typeof module.renderVisualization !== 'function') throw new Error('B renderer must export renderVisualization')
  return module.renderVisualization
}
