import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessVisualization } from './core/assessment.mjs'
import { generateVisualization } from './core/pipeline.mjs'
import { loadRenderer } from './core/renderer-adapter.mjs'
export async function run(argv) {
  const [command, inputPath, root = process.cwd()] = argv
  if (!['assess', 'generate'].includes(command) || !inputPath || argv.length > 3) throw new Error('Usage: node src/cli.mjs assess|generate input.json [workspace-root]')
  const raw = await readFile(inputPath, 'utf8')
  if (Buffer.byteLength(raw) > 100000) throw new Error('input exceeds 100KB')
  const value = JSON.parse(raw)
  return command === 'assess' ? assessVisualization(value) : generateVisualization(value, { root, renderer: await loadRenderer(), executionOrigin: 'cli' })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await run(process.argv.slice(2)), null, 2) + '\n') }
  catch (e) { process.stderr.write(JSON.stringify({ code: e.code ?? 'EXECUTION_ERROR', message: e.message }) + '\n'); process.exitCode = 1 }
}
