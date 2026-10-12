import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run from the intended workspace. Supply the existing agh executable via SCIVIZ_AGH_BIN.
const root = resolve(process.argv[2] ?? process.cwd())
const input = readFileSync(resolve(root, 'examples/core-content-v1.json'), 'utf8')
const prompt = `Execute the registered plugin tools: set_sciviz_root with path=${root}; assess_visualization_feasibility with the exact JSON below as content_json; generate_visualization with the same JSON. This is an explicitly human-confirmed synthetic teaching fixture, not a paper. Do not simulate tools with shell or code. Report actual statuses and paths; if tools are missing, say so. No subagents or network tools.\n${input}`
const result = spawnSync(process.env.SCIVIZ_AGH_BIN ?? 'agh', ['-p', '--mode', 'json', '--meta', '--cwd', root, prompt], {
  stdio: 'inherit', env: process.env, timeout: 120000,
})
if (result.error) process.stderr.write(result.error.message + '\n')
process.exitCode = result.status ?? 1
