import { adaptRenderInput } from './contract.mjs'
import { renderSvg } from './svg.mjs'
import { renderPage } from '../ui/page.mjs'
import { renderTeaching } from './teaching.mjs'
export { RenderInputError } from './contract.mjs'
export { renderInputErrorPage } from '../ui/page.mjs'

// Synchronous, deterministic, and side-effect free. The caller owns file writes.
export function renderVisualization(first, second) {
  const data = adaptRenderInput(first, second)
  if (data.decision === 'insufficient_evidence') return { svg: null, html: renderPage(data, null) }
  const svg = renderSvg(data)
  const interactiveSvg = renderSvg(data, true)
  const figures = data.learning?.terms.flatMap((term, i) => term.illustration === 'none' ? [] : ['academic', 'popular'].map(mode => ({ name: `teaching-${i + 1}-${mode}.svg`, svg: renderTeaching(term.illustration, mode) })))
  return { svg, html: renderPage(data, interactiveSvg), ...(figures ? { figures } : {}) }
}
