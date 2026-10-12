import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { join, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import { normalizeInput, assessVisualization } from './assessment.mjs'

export async function generateVisualization(value, { root, renderer = null, executionOrigin = 'cli' } = {}) {
  const input = normalizeInput(value)
  const assessment = assessVisualization(input)
  if (!['cli', 'agh'].includes(executionOrigin)) throw new Error('invalid execution origin')
  const base = await realpath(root)
  const evidenceRoot = join(base, 'evidence')
  await mkdir(evidenceRoot, { recursive: true })
  const actual = await realpath(evidenceRoot)
  const rel = relative(base, actual)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('evidence directory must remain inside workspace')
  const directory = await mkdtemp(join(actual, 'sciviz-'))
  const artifacts = []
  const save = async (name, body) => {
    await writeFile(join(directory, name), body, { flag: 'wx' })
    artifacts.push({ name, bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') })
  }
  await save('content.json', JSON.stringify(input, null, 2) + '\n')
  await save('assessment.json', JSON.stringify(assessment, null, 2) + '\n')
  let status = assessment.decision === 'supported' ? 'renderer_pending' : 'evidence_report'
  let rendererError = null
  if (assessment.decision === 'supported' && renderer) {
    try {
      const output = await renderer({ content: structuredClone(input), assessment: structuredClone(assessment) })
      if (!output || typeof output.svg !== 'string' || typeof output.html !== 'string' || !/<svg[\s>]/i.test(output.svg) || !/<html[\s>]/i.test(output.html) || output.svg.length > 2000000 || output.html.length > 2000000) throw new Error('renderer must return SVG and HTML strings under 2MB each')
      await save('diagram.svg', output.svg)
      await save('interactive.html', output.html)
      status = 'rendered'
    } catch (error) { status = 'renderer_failed'; rendererError = { code: 'RENDERER_FAILED', message: String(error.message).slice(0, 500) } }
  }
  const manifest = { schema_version: '1.0', created_at: new Date().toISOString(), execution_origin: executionOrigin, status, assessment_decision: assessment.decision, renderer_error: rendererError, artifacts }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
  return { status, decision: assessment.decision, output_path: join(directory, 'manifest.json'), directory, artifacts, renderer_error: rendererError }
}
