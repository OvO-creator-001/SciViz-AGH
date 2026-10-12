import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

// WSL runs the plugin on Linux while the visible browser usually belongs to Windows.
// A Windows file URI is therefore more useful than file:///mnt/c/... in that case.
export function pageFileUri(path) {
  const normalized = path.replaceAll('\\', '/')
  const mounted = normalized.match(/^\/mnt\/([a-zA-Z])\/(.*)$/)
  if (mounted) return `file:///${mounted[1].toUpperCase()}:/${mounted[2].split('/').map(encodeURIComponent).join('/')}`
  return pathToFileURL(path).href
}

export function pageAccess(directory, status) {
  if (status !== 'rendered') return null
  const interactive_html_path = join(directory, 'interactive.html')
  const interactive_html_uri = pageFileUri(interactive_html_path)
  return {
    interactive_html_path,
    interactive_html_uri,
    open_page_markdown: `[打开互动页面](${interactive_html_uri})`,
  }
}
