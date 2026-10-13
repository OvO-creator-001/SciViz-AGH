import { safeHttpUrl } from '../render/text.mjs'

const error = (code, message) => Object.assign(new Error(message), { code })
// This is deliberately a Host port. Never fall back to ambient fetch, shell or a proxy.
async function readPublic(ctx, url) {
  ctx.signal?.throwIfAborted()
  if (!ctx.net?.fetchPublic) throw error('WEB_UNAVAILABLE', '当前 AGH 未提供公开网页读取；可继续原文分析，并标注联网补充未完成。')
  const result = await ctx.net.fetchPublic(url)
  ctx.signal?.throwIfAborted()
  if (result.statusCode < 200 || result.statusCode >= 300) throw error('WEB_HTTP_ERROR', `公开来源返回 HTTP ${result.statusCode}，未作为知识依据。`)
  if (result.body?.kind === 'zip' || typeof result.body?.content !== 'string') throw error('WEB_FORMAT_ERROR', '来源不是可读取的文字。')
  if (!safeHttpUrl(result.url)) throw error('WEB_URL_ERROR', '返回来源 URL 无效。')
  return result
}

export function plainWebText(value) {
  const main = value.match(/<(?:main|article)\b[^>]*>([^]*?)<\/(?:main|article)\s*>/i)
  return (main?.[1] ?? value).replace(/<!--[^]*?-->/g, ' ').replace(/<(script|style|nav|header|footer|head)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<(?:script|style)\b[^>]*>[^]*$/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp|ensp|emsp);/g, x => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&ensp;':' ','&emsp;':' '}[x]))
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (raw, n) => { const cp = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n); return cp >= 32 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : ' ' })
    .replace(/\s+/g, ' ').trim()
}

export function parseBingResults(html, searchUrl, retrieved_at) {
  const results = []
  for (const match of html.matchAll(/<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>([^]*?)<\/li>/gi)) {
    const heading = match[1].match(/<h2\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([^]*?)<\/a>/i)
    const excerpt = match[1].match(/<p\b[^>]*>([^]*?)<\/p>/i)
    if (!heading || !excerpt) continue
    const url = safeHttpUrl(heading[1].replaceAll('&amp;', '&'))
    if (!url || new URL(url).hostname.endsWith('bing.com')) continue
    const text = plainWebText(excerpt[1])
    if (!text) continue
    results.push({ citation: `搜索摘要：${plainWebText(heading[2]).slice(0, 200)}`, url,
      locator: `Bing 搜索摘要，尚未读取目标正文；检索页 ${searchUrl}`, excerpt: text.slice(0, 2000),
      kind: 'background', verified: false, retrieved_at, truncated: true })
    if (results.length === 3) break
  }
  return results
}

export async function researchTerm({ query, language = 'en', provider = 'bing', url }, ctx) {
  if (typeof query !== 'string' || !query.trim() || query.length > 160) throw error('INVALID_INPUT', 'query 需要 1–160 字符，仅发送术语，不发送论文全文。')
  if (!['en', 'zh'].includes(language)) throw error('INVALID_INPUT', 'language 仅支持 en 或 zh')
  if (!['bing', 'wikipedia'].includes(provider)) throw error('INVALID_INPUT', 'provider 仅支持 bing 或 wikipedia')
  const retrieved_at = new Date().toISOString()
  if (url !== undefined) {
    const safe = safeHttpUrl(url)
    if (!safe) throw error('INVALID_INPUT', '仅允许无凭据的 HTTP/HTTPS 来源。')
    const page = await readPublic(ctx, safe)
    const full = page.body.kind === 'html' ? plainWebText(page.body.content) : page.body.content.trim()
    if (!full) throw error('WEB_EMPTY', '网页没有可用的文字。')
    return [{ citation: `公开网页：${query}`, url: page.url, locator: '网页文字摘录（需核对具体章节）',
      excerpt: full.slice(0, 5000), kind: 'background', verified: false, retrieved_at,
      truncated: full.length > 5000 || !!page.truncation?.bytes || !!page.truncation?.decoded }]
  }
  if (provider === 'bing') {
    const endpoint = new URL('https://cn.bing.com/search')
    endpoint.search = new URLSearchParams({ q: query }).toString()
    const page = await readPublic(ctx, endpoint.href)
    const results = parseBingResults(page.body.content, page.url, retrieved_at)
    if (!results.length) throw error('SEARCH_NO_EXCERPTS', '搜索页未返回可解析摘要，可能无结果、需要验证或页面格式变更；请提供公开教材 URL，不能把此情况算作已检索到知识。')
    return results
  }
  const endpoint = new URL(`https://${language}.wikipedia.org/w/api.php`)
  endpoint.search = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: query, gsrlimit: '3',
    prop: 'extracts|info', exintro: '1', explaintext: '1', exchars: '1800', inprop: 'url', format: 'json', formatversion: '2' }).toString()
  const response = await readPublic(ctx, endpoint.href)
  if (response.truncation?.bytes || response.truncation?.decoded) throw error('WEB_TRUNCATED', '检索响应被截断，未当作完整结果。')
  let data
  try { data = JSON.parse(response.body.content) } catch { throw error('WEB_FORMAT_ERROR', '术语检索未返回可解析的结果。') }
  if (data.error) throw error('WEB_SEARCH_ERROR', '百科检索服务返回错误。')
  return (data.query?.pages ?? []).slice(0, 3).filter(p => typeof p.extract === 'string' && p.extract.trim() && safeHttpUrl(p.fullurl)).map(p => ({
    citation: `Wikipedia：${String(p.title).slice(0, 200)}`, url: p.fullurl, locator: '条目导言；百科背景资料，非论文结论',
    excerpt: p.extract.slice(0, 2000), kind: 'background', verified: false, retrieved_at, truncated: true,
  }))
}
