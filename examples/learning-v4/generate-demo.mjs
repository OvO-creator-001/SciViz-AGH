import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { generateVisualization } from '../../src/core/pipeline.mjs'
import { loadRenderer } from '../../src/core/renderer-adapter.mjs'
const content = JSON.parse(await readFile(new URL('./content.json', import.meta.url), 'utf8'))
const result = await generateVisualization(content, { root: fileURLToPath(new URL('../../', import.meta.url)), renderer: await loadRenderer() })
if (result.status !== 'rendered') throw new Error(JSON.stringify(result))
console.log(JSON.stringify(result, null, 2))
