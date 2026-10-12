import { adaptRenderInput } from './contract.mjs'
import { renderSvg } from './svg.mjs'
import { renderPage } from '../ui/page.mjs'
export { RenderInputError } from './contract.mjs'
export { renderInputErrorPage } from '../ui/page.mjs'

// Synchronous, deterministic, and side-effect free. The caller owns file writes.
export function renderVisualization(first, second) {
  const data = adaptRenderInput(first, second)
  if (data.decision === 'insufficient_evidence') return { svg: null, html: renderPage(data, null) }
  const svg = renderSvg(data)
  const interactiveSvg = renderSvg(data, true)
  return { svg, html: renderPage(data, interactiveSvg) }
}
