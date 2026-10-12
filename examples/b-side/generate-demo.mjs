import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderVisualization, renderInputErrorPage } from '../../src/render/index.mjs'

export async function generateDemo({ contentPath = new URL('./content.json', import.meta.url), assessmentPath = new URL('./assessment.json', import.meta.url), outputDirectory, baseDirectory = resolve('evidence') } = {}) {
  let result, inputError
  try {
    const content = JSON.parse(await readFile(contentPath, 'utf8'))
    const assessment = JSON.parse(await readFile(assessmentPath, 'utf8'))
    result = renderVisualization(content, assessment)
  } catch (error) {
    if (!(error instanceof SyntaxError) && error.code !== 'INVALID_INPUT') throw error
    inputError = { code: 'INVALID_INPUT', message: error.message }
    result = { svg: null, html: renderInputErrorPage(error) }
  }
  let directory
  if (outputDirectory) {
    directory = resolve(outputDirectory)
    await mkdir(directory) // EEXIST is intentional: never reuse an output directory.
  } else {
    await mkdir(baseDirectory, { recursive: true })
    directory = await mkdtemp(join(baseDirectory, 'b-demo-v1-'))
  }
  await writeFile(join(directory, 'interactive.html'), result.html, { flag: 'wx' })
  if (result.svg !== null) await writeFile(join(directory, 'diagram.svg'), result.svg, { flag: 'wx' })
  const report = { kind: 'b_side_fixture_render', assessment_origin: 'supplied_fixture_not_rule_evaluation', status: inputError ? 'invalid_input' : result.svg === null ? 'evidence_report' : 'rendered', input_error: inputError ?? null }
  await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  return { directory, ...report }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [contentPath, assessmentPath, outputDirectory, ...extra] = process.argv.slice(2)
    if (extra.length) throw new Error('Usage: node examples/b-side/generate-demo.mjs [content.json] [assessment.json] [new-output-directory]')
    const result = await generateDemo({ contentPath, assessmentPath, outputDirectory })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (result.status === 'invalid_input') process.exitCode = 1
  } catch (error) { process.stderr.write(`${error.code ?? 'DEMO_ERROR'}: ${error.message}\n`); process.exitCode = 1 }
}
