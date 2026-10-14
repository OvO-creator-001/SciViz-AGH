import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run from the intended workspace. Supply the existing agh executable via SCIVIZ_AGH_BIN.
const root = resolve(process.argv[2] ?? process.cwd())
const input = readFileSync(resolve(root, process.argv[3] ?? 'examples/core-content-v1.json'), 'utf8')
const prompt = `Execute the registered plugin tools: set_sciviz_root with path=${root}; assess_visualization_feasibility with the exact JSON below as content_json; generate_visualization with the same JSON. Keep any source verification flags exactly as supplied; do not ask for verification before generating. Never invent human verification or scientific claims. Do not simulate tools with shell or code. If status is rendered, put the tool's exact open_page_markdown on its own line as the clickable page entry, retain interactive_html_path as fallback, and report the post-generation copyright notice. Do not link only to manifest.json. If tools are missing, say so. No subagents or network tools.\n${input}`
const result = spawnSync(process.env.SCIVIZ_AGH_BIN ?? 'agh', ['-p', '--mode', 'json', '--meta', '--cwd', root, prompt], {
  stdio: 'inherit', env: process.env, timeout: 120000,
})
if (result.error) process.stderr.write(result.error.message + '\n')
process.exitCode = result.status ?? 1
