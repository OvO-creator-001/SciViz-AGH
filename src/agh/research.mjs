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

const academicSites = ['edu.cn', 'ac.cn', 'edu', 'arxiv.org', 'd2l.ai', 'pytorch.org', 'scipy.org', 'nature.com', 'science.org', 'ieee.org', 'acm.org', 'cas.cn', 'csig.org.cn', 'cstam.org.cn']
const matchesSite = (host, domain) => host === domain || host.endsWith(`.${domain}`)
const academicHost = host => academicSites.some(domain => matchesSite(host, domain))
const dictionaryText = /英文单词|英语单词|汉语词语|汉语词典|英汉词典|英英词典|剑桥词典|读音.*用法|怎么读|中文.{0,6}翻译|男子演唱组合/i
const ambiguousTerms = new Set(['state', 'intersection', 'attention', 'wave', 'model', 'field', 'transformer', 'network'])

// Public chapter pointers, not cached/fabricated source excerpts. Each hit is fetched
// through the Host and only its actual response is registered as a source.
export function textbookFor(query, context = '') {
  const technical = /深度学习|机器学习|计算机视觉|目标跟踪|神经网络|自然语言|attention|neural|vision|tracking|machine learning/i.test(`${query} ${context}`)
  if (!technical) return null
  const root = 'https://zh.d2l.ai/'
  if (/\btransformer\b/i.test(query)) return root + 'chapter_attention-mechanisms/transformer.html'
  if (/自注意力|self[- ]attention/i.test(query)) return root + 'chapter_attention-mechanisms/self-attention-and-positional-encoding.html'
  if (/多头注意力|multi[- ]head/i.test(query)) return root + 'chapter_attention-mechanisms/multihead-attention.html'
  if (/注意力|\battention\b/i.test(query)) return root + 'chapter_attention-mechanisms/attention-scoring-functions.html'
  if (/交并比|\biou\b|intersection.over.union/i.test(query)) return root + 'chapter_computer-vision/anchor.html'
  return null
}

export function articleExcerpt(html) {
  const main = html.match(/<(?:main|article)\b[^>]*>([^]*?)<\/(?:main|article)\s*>/i)?.[1] ?? html
  const paragraphs = [...main.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)].map(m => plainWebText(m[1]))
    .filter(p => p.length >= 45 && !/Open the notebook|Colab|SageMaker|版权所有|All rights reserved/.test(p))
  return paragraphs.length ? paragraphs.join('\n\n') : plainWebText(main)
}

export function buildResearchQuery(query, context = '', language = 'zh', academic = true) {
  if (typeof context !== 'string' || context.length > 120 || /[\r\n]/.test(context)) throw error('INVALID_INPUT', 'context 仅填写最多120字符的公开学科/专业背景，不发送论文摘录。')
  if (academic && ambiguousTerms.has(query.trim().toLowerCase()) && !context.trim())
    throw error('TERM_CONTEXT_REQUIRED', '该词存在多种含义。请填写短学科背景 context，或用完整术语，例如“状态空间模型”或“交并比 IoU”，不要只搜索英文单词。')
  const words = `${query.trim()} ${context.trim()}`.trim()
  const intent = language === 'zh' ? '定义 原理 教材' : 'definition principles textbook'
  return `${words} ${intent}${academic ? ' (site:edu.cn OR site:ac.cn OR site:arxiv.org OR site:d2l.ai)' : ''}`
}

export function parseBingResults(html, searchUrl, retrieved_at, { academic = false, query = '', context = '' } = {}) {
  const results = []
  for (const match of html.matchAll(/<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>([^]*?)<\/li>/gi)) {
    const heading = match[1].match(/<h2\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([^]*?)<\/a>/i)
    const excerpt = match[1].match(/<p\b[^>]*>([^]*?)<\/p>/i)
    if (!heading || !excerpt) continue
    const url = safeHttpUrl(heading[1].replaceAll('&amp;', '&'))
    if (!url || new URL(url).hostname.endsWith('bing.com')) continue
    const text = plainWebText(excerpt[1])
    const title = plainWebText(heading[2])
    const host = new URL(url).hostname.toLowerCase()
    if (!text || dictionaryText.test(`${title} ${text}`) || matchesSite(host, 'dictionary.cambridge.org') || matchesSite(host, 'dict.cn')) continue
    if (academic && !academicHost(host)) continue
    const combined = `${title} ${text}`.toLowerCase()
    const terms = query.toLowerCase().match(/[a-z][a-z0-9_-]{1,}|[\p{Script=Han}]{2,}/gu) ?? []
    if (academic && terms.length && !terms.some(term => combined.includes(term))) continue
    const contextHits = (context.toLowerCase().match(/[a-z][a-z0-9_-]{1,}|[\p{Script=Han}]{2,}/gu) ?? []).filter(term => combined.includes(term)).length
    results.push({ citation: `搜索摘要：${plainWebText(heading[2]).slice(0, 200)}`, url,
      locator: `Bing 搜索摘要，尚未读取目标正文；检索页 ${searchUrl}`, excerpt: text.slice(0, 2000),
      kind: 'background', verified: false, retrieved_at, truncated: true,
      score: (academicHost(host) ? 10 : 0) + contextHits })
  }
  return results.sort((a,b) => b.score-a.score).filter((s,i,all) => all.findIndex(x => x.url === s.url) === i).slice(0,3).map(({score,...s})=>s)
}

export async function researchTerm({ query, context = '', language = 'zh', provider = 'academic', url }, ctx) {
  if (typeof query !== 'string' || !query.trim() || query.length > 160) throw error('INVALID_INPUT', 'query 需要 1–160 字符，仅发送术语，不发送论文全文。')
  if (!['en', 'zh'].includes(language)) throw error('INVALID_INPUT', 'language 仅支持 en 或 zh')
  if (!['academic', 'bing', 'wikipedia'].includes(provider)) throw error('INVALID_INPUT', 'provider 仅支持 academic、bing 或显式选择的 wikipedia')
  if (url === undefined && provider === 'academic') {
    // Validate ambiguity before choosing any specialist meaning.
    buildResearchQuery(query, context, language, true)
    const textbook = textbookFor(query, context)
    if (textbook) url = textbook
  }
  const retrieved_at = new Date().toISOString()
  if (url !== undefined) {
    const safe = safeHttpUrl(url)
    if (!safe) throw error('INVALID_INPUT', '仅允许无凭据的 HTTP/HTTPS 来源。')
    const page = await readPublic(ctx, safe)
    const full = page.body.kind === 'html' ? articleExcerpt(page.body.content) : page.body.content.trim()
    if (!full) throw error('WEB_EMPTY', '网页没有可用的文字。')
    const title = page.body.kind === 'html' ? plainWebText(page.body.content.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? '') : ''
    if (/captcha|access denied|请完成验证|访问验证|安全验证/i.test(title)) throw error('WEB_NO_CONTENT', '来源返回验证或访问限制页面，未作为正文；请换可公开读取的机构或教材来源。')
    return [{ citation: `公开网页：${title.slice(0,200) || query}`, url: page.url, locator: '网页文字摘录（需核对具体章节；未自动验证相关性）',
      excerpt: full.slice(0, 5000), kind: 'background', verified: false, retrieved_at,
      truncated: full.length > 5000 || !!page.truncation?.bytes || !!page.truncation?.decoded }]
  }
  if (provider !== 'wikipedia') {
    const endpoint = new URL('https://cn.bing.com/search')
    endpoint.search = new URLSearchParams({ q: buildResearchQuery(query, context, language, provider === 'academic') }).toString()
    const page = await readPublic(ctx, endpoint.href)
    const results = parseBingResults(page.body.content, page.url, retrieved_at, {academic:provider === 'academic', query, context})
    if (!results.length) throw error('SEARCH_NO_EXCERPTS', '未找到相关且可解析的来源。请用完整专业术语和短学科背景，或提供公开高校/研究机构/教材 URL；未把词典或无关结果算作知识。')
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
