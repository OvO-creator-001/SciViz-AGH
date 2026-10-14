export const escapeText = (value) => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

// Fixed-width wrapping preserves every character; no truncation or label rewriting.
export function wrapText(value, width = 34) {
  const lines = []
  for (const paragraph of value.split(/\r\n|\r|\n/)) {
    let line = '', units = 0
    for (const ch of paragraph) {
      const size = ch.codePointAt(0) > 255 ? 2 : 1
      if (units + size > width && line) { lines.push(line); line = ''; units = 0 }
      line += ch; units += size
    }
    lines.push(line)
  }
  return lines
}

export function safeHttpUrl(value) {
  if (!value || !/^https?:\/\//i.test(value) || /[\s\u0000-\u001f\u007f]/u.test(value)) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
