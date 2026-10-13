import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { draftRecord } from '../src/agh/draft-store.mjs'
import { registerLearningTools, resolveAnalysisRoot } from '../src/agh/learning-tools.mjs'
import { researchTerm, parseBingResults, buildResearchQuery, textbookFor, articleExcerpt } from '../src/agh/research.mjs'
import { normalizeInput, assessVisualization } from '../src/core/assessment.mjs'
import { renderVisualization } from '../src/render/index.mjs'
const fixture = JSON.parse(await readFile(new URL('../examples/learning-v4/content.json', import.meta.url), 'utf8'))
const response = { url: 'https://en.wikipedia.org/w/api.php', statusCode: 200, body: { kind: 'text', content: JSON.stringify({ query: { pages: [{ title: 'Topology', fullurl: 'https://en.wikipedia.org/wiki/Topology', extract: 'Topology studies properties preserved under continuous deformation.' }] } }) }, truncation: { bytes: false, decoded: false } }

test('learning: old graph plus two modes, five teaching figures, full refs and escaped prose', () => {
  const c = structuredClone(fixture), before = JSON.stringify(c)
  const output = renderVisualization({ content: normalizeInput(c), assessment: assessVisualization(c) })
  assert.equal(JSON.stringify(c), before)
  assert.equal(output.figures.length, 10)
  assert.match(output.html, /先读这一段/)
  assert.match(output.html, /data-initial-mode="popular"/)
  assert.match(output.html, /未联网，仅使用输入材料/)
  assert.equal((output.html.match(/data-node="/g) ?? []).length, 3)
  assert.match(output.html, /href="#source-0"/)
  assert.match(output.figures[8].svg, /一级：氨基酸序列/)
  c.learning.summary.popular = '</script><img src=x onerror=alert(1)>'
  c.learning.terms[0].analogy = '<svg onload=alert(1)>'
  const attacked = renderVisualization({ content:c, assessment:assessVisualization(c) }).html
  assert.doesNotMatch(attacked, /<img|<svg onload|fetch\(|innerHTML|XMLHttpRequest/)
  assert.match(attacked, /&lt;\/script&gt;/)
  assert.equal((attacked.match(/<script>/g) ?? []).length, 1)
  for (const change of [v=>v.learning.mode='other', v=>v.learning.terms[0].source_refs=['missing'], v=>v.learning.terms[0].illustration='arbitrary_svg',v=>v.learning.terms[0].academic='x'.repeat(4001),v=>v.sources[0].kind='background']) {
    const bad = structuredClone(fixture); change(bad)
    assert.throws(()=>normalizeInput(bad),e=>e.code==='INVALID_INPUT')
    assert.throws(()=>renderVisualization(bad,{decision:'supported',recommended_format:'interactive_2d',missing_requirements:[],limitations:[]}),e=>e.code==='INVALID_INPUT')
  }
})

test('research: uses only Host public port; preserves citations; reports HTTP, truncation, absent network and cancellation', async () => {
  let request
  const ctx = { net: { fetchPublic: async url => { request = new URL(url); return response } } }
  const sources = await researchTerm({ query:'topology', provider:'wikipedia' },ctx)
  assert.equal(request.searchParams.get('gsrsearch'),'topology')
  assert.equal(sources[0].kind,'background')
  assert.equal(sources[0].verified,false)
  assert.ok(Number.isFinite(Date.parse(sources[0].retrieved_at)))
  await assert.rejects(researchTerm({query:'x'},{}),{code:'WEB_UNAVAILABLE'})
  for (const statusCode of [403,429,500]) await assert.rejects(researchTerm({query:'x'},{net:{fetchPublic:async()=>({...response,statusCode})}}),{code:'WEB_HTTP_ERROR'})
  await assert.rejects(researchTerm({query:'x',provider:'wikipedia'},{net:{fetchPublic:async()=>({...response,truncation:{bytes:true}})}}),{code:'WEB_TRUNCATED'})
  for (const url of ['javascript:alert(1)','file:///C:/secret','https://user:secret@example.com']) await assert.rejects(researchTerm({query:'x',url},ctx),{code:'INVALID_INPUT'})
  const controller=new AbortController();controller.abort()
  await assert.rejects(researchTerm({query:'x'},{...ctx,signal:controller.signal}),{name:'AbortError'})
  const direct=await researchTerm({query:'lecture',url:'https://example.org/lecture'},{net:{fetchPublic:async()=>({...response,url:'https://example.org/lecture',body:{kind:'html',content:'<script>malicious()</script><p>Safe &amp; useful definition.</p>'}})}})
  assert.equal(direct[0].excerpt,'Safe & useful definition.')
  const snippets=parseBingResults('<li class="b_algo"><h2><a href="https://example.org/course">Course</a></h2><p>Useful <b>definition</b>.</p></li><li class="b_algo"><h2><a href="javascript:alert(1)">Unsafe</a></h2><p>ignored</p></li>','https://cn.bing.com/search?q=test','2026-10-13T00:00:00Z')
  assert.equal(snippets.length,1)
  assert.equal(snippets[0].excerpt,'Useful definition .')
  assert.match(snippets[0].locator,/尚未读取目标正文/)
  await assert.rejects(researchTerm({query:'x'},{net:{fetchPublic:async()=>({...response,body:{kind:'html',content:'captcha'}})}}),{code:'SEARCH_NO_EXCERPTS'})
})

test('AGH staged workflow: research, model revisions, isolation, source integrity and fresh render history', async () => {
  const root=await mkdtemp(join(tmpdir(),'sciviz-learning-')), tools=new Map()
  const lifecycle=registerLearningTools({registerTool:d=>tools.set(d.name,d)},{resolveRoot:async()=>root})
  const ctx={session:{key:'a'},net:{fetchPublic:async()=>response}}
  const call=(name,args,context=ctx)=>tools.get(name).execute(args,context)
  try {
    const started=(await call('start_sciviz_analysis',{title:fixture.title,text:fixture.sources[0].excerpt,citation:fixture.sources[0].citation,locator:fixture.sources[0].locator,mode:'popular'})).structured
    const draft_id=started.draft_id
    assert.equal((await call('get_sciviz_draft',{draft_id},{session:{key:'b'}})).details.code,'DRAFT_NOT_FOUND')
    const retrieved=(await call('research_sciviz_term',{draft_id,query:'topology',provider:'wikipedia'})).structured
    assert.equal(retrieved.sources[0].id,'web_1')
    const c=structuredClone(fixture);delete c.sources;c.learning.terms[0].source_refs=['web_1']
    const saved=await call('save_sciviz_analysis',{draft_id,expected_revision:0,content_json:JSON.stringify(c)})
    assert.equal(saved.structured.revision,1)
    assert.equal(saved.structured.checks.scientific_accuracy,'not_verified')
    assert.equal((await call('save_sciviz_analysis',{draft_id,expected_revision:0,content_json:JSON.stringify(c)})).details.code,'REVISION_CONFLICT')
    const first=(await call('render_sciviz_draft',{draft_id,expected_revision:1})).structured
    assert.equal(first.status,'rendered')
    const html=await readFile(first.interactive_html_path,'utf8')
    assert.match(html,/联网补充背景/)
    assert.match(html,/已取得联网背景摘录/)
    const record=JSON.parse(await readFile(join(first.directory,'analysis-record.json'),'utf8'))
    assert.equal(record.revision,1)
    c.learning.summary.popular='修订后的通俗概述：先看问题，再看示意，最后看限制。'
    assert.equal((await call('save_sciviz_analysis',{draft_id,expected_revision:1,content_json:JSON.stringify(c),note:'按反馈优化概述'})).structured.revision,2)
    const second=(await call('render_sciviz_draft',{draft_id,expected_revision:2})).structured
    assert.notEqual(first.directory,second.directory)
    assert.equal(await readFile(first.interactive_html_path,'utf8'),html)
    assert.match(await readFile(second.interactive_html_path,'utf8'),/修订后的通俗概述/)
    c.sources=[{...fixture.sources[0],excerpt:'fabricated replacement'}]
    assert.equal((await call('save_sciviz_analysis',{draft_id,expected_revision:2,content_json:JSON.stringify(c)})).details.code,'SOURCE_CHANGED')
    lifecycle.clear(ctx)
    assert.equal((await call('get_sciviz_draft',{draft_id})).details.code,'DRAFT_NOT_FOUND')
  } finally {await rm(root,{recursive:true,force:true})}
})

test('network failure remains visible in a usable original-only page, no fabricated web provenance', async () => {
  const tools=new Map();registerLearningTools({registerTool:t=>tools.set(t.name,t)},{resolveRoot:async()=>'.'})
  const ctx={session:{key:'offline'}},call=async(name,args)=>(await tools.get(name).execute(args,ctx))
  const start=await call('start_sciviz_analysis',{title:fixture.title,text:fixture.sources[0].excerpt,citation:'教学样例',locator:'第1段',mode:'academic'})
  const draft_id=start.structured.draft_id
  assert.equal((await call('research_sciviz_term',{draft_id,query:'fractal'})).details.code,'WEB_UNAVAILABLE')
  const c=structuredClone(fixture);delete c.sources
  const saved=await call('save_sciviz_analysis',{draft_id,expected_revision:0,content_json:JSON.stringify(c)})
  assert.equal(saved.structured.revision,1)
  const content=(await call('get_sciviz_draft',{draft_id})).structured.content
  assert.equal(content.sources.length,1)
  assert.equal(content.learning.research_status,'unavailable')
  assert.match(renderVisualization(content,assessVisualization(content)).html,/本次联网未成功/)
})

test('staged rendering uses the current AGH workspace without a source checkout, and respects denied bindings', async () => {
  const calls=[]
  const ctx={cwd:'D:/AGH/work/papers',fs:{stat:async path=>{calls.push(path);if(path==='D:/outside')throw Object.assign(new Error('Host denied'),{code:'EACCES'});return{kind:'dir'}}}}
  assert.equal(await resolveAnalysisRoot(ctx,null),ctx.cwd)
  assert.deepEqual(calls,[ctx.cwd])
  await assert.rejects(resolveAnalysisRoot(ctx,'D:/outside'),{code:'EACCES'})
  assert.deepEqual(calls,[ctx.cwd,'D:/outside'])
})

test('draft persistence: reconnect restores revisions, isolates sessions and propagates Host denial', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sciviz-reconnect-'))
  const ctx = { cwd: root, session: { key: 'reconnect-a' }, fs: {
    read: path => readFile(path),
    write: async (path, bytes) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes) },
  } }
  const open = () => {
    const tools = new Map()
    const lifecycle = registerLearningTools({ registerTool: t => tools.set(t.name, t) }, { resolveRoot: async () => root })
    return { lifecycle, call: (name, args, context = ctx) => tools.get(name).execute(args, context) }
  }
  try {
    let host = open()
    const started = await host.call('start_sciviz_analysis', { title: fixture.title, text: fixture.sources[0].excerpt, citation: '教学样例', locator: '第1段', mode: 'popular' })
    const draft_id = started.structured.draft_id
    const c = structuredClone(fixture); delete c.sources
    assert.equal((await host.call('save_sciviz_analysis', { draft_id, expected_revision: 0, content_json: JSON.stringify(c) })).structured.revision, 1)
    host.lifecycle.clear(ctx)
    host = open()
    assert.equal((await host.call('get_sciviz_draft', { draft_id })).structured.revision, 1)
    assert.equal((await host.call('get_sciviz_draft', { draft_id }, { ...ctx, session: { key: 'other' } })).details.code, 'DRAFT_NOT_FOUND')
    const before = await readFile(draftRecord(ctx).path, 'utf8')
    const denied = { ...ctx, fs: { ...ctx.fs, write: async () => { throw Object.assign(new Error('Host denied'), { code: 'E_FS_DENIED' }) } } }
    assert.equal((await host.call('save_sciviz_analysis', { draft_id, expected_revision: 1, content_json: JSON.stringify(c) }, denied)).details.code, 'E_FS_DENIED')
    assert.equal(await readFile(draftRecord(ctx).path, 'utf8'), before)
    assert.equal((await host.call('get_sciviz_draft', { draft_id })).structured.revision, 1)
    c.learning.summary.popular = '重连后继续修改。'
    assert.equal((await host.call('save_sciviz_analysis', { draft_id, expected_revision: 1, content_json: JSON.stringify(c) })).structured.revision, 2)
    host = open()
    const rendered = (await host.call('render_sciviz_draft', { draft_id, expected_revision: 2 })).structured
    assert.equal(rendered.status, 'rendered')
    assert.match(await readFile(rendered.interactive_html_path, 'utf8'), /重连后继续修改/)
    await writeFile(draftRecord(ctx).path, '{}')
    assert.equal((await host.call('get_sciviz_draft', { draft_id })).isError, true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('academic research disambiguates terms and rejects dictionaries, unrelated hits and duplicate URLs', async () => {
  const li = (url,title,excerpt) => `<li class="b_algo"><h2><a href="${url}">${title}</a></h2><p>${excerpt}</p></li>`
  const html = [
    li('https://dictionary.cambridge.org/state','STATE 中文翻译：剑桥词典','state 英文单词'),
    li('https://example.edu/music','Music research','An unrelated subject'),
    li('https://blog.example.org/state','State tutorial','State space model explained'),
    li('https://example.edu/state','State space model','State estimation for tracking'),
    li('https://example.edu/state','Duplicate','State estimation'),
    li('https://example.ac.cn/state','State estimation','State estimation for tracking in a research institute'),
  ].join('')
  const found = parseBingResults(html,'https://cn.bing.com/search?q=state','2026-10-13T00:00:00Z',{academic:true,query:'state',context:'tracking'})
  assert.deepEqual(found.map(s=>s.url), ['https://example.edu/state','https://example.ac.cn/state'])
  let request
  const ctx = {net:{fetchPublic:async url=>{request=new URL(url);return { ...response,url,body:{kind:'html',content:html} }}}}
  await assert.rejects(researchTerm({query:'state'},ctx),{code:'TERM_CONTEXT_REQUIRED'})
  assert.equal(request,undefined)
  assert.equal((await researchTerm({query:'state',context:'tracking'},ctx)).length,2)
  assert.match(request.searchParams.get('q'),/state tracking 定义 原理 教材/)
  assert.match(request.searchParams.get('q'),/site:edu.cn/)
  assert.doesNotMatch(request.href,/wikipedia/)
  assert.throws(()=>buildResearchQuery('state','x'.repeat(121)),{code:'INVALID_INPUT'})
  await assert.rejects(researchTerm({query:'state',context:'tracking'},{net:{fetchPublic:async url=>({...response,url,body:{kind:'html',content:li('https://dict.cn/state','state 英文单词','词典翻译')}})}}),{code:'SEARCH_NO_EXCERPTS'})
})

test('Chinese textbook routing reads real Host content and does not infer state/IoU from bare words', async () => {
  assert.equal(textbookFor('Transformer','电力工程 变压器'),null)
  assert.equal(textbookFor('intersection','计算机视觉'),null)
  assert.equal(textbookFor('state','目标跟踪'),null)
  assert.match(textbookFor('交并比 IoU','计算机视觉'),/anchor.html$/)
  let request
  const paragraph='注意力机制将查询与键进行比较，得到注意力权重，再对值进行加权求和。权重用于在当前查询条件下选择相关信息，而不是证明模型解释具有因果性。'
  const html=`<title>教材章节</title><nav>导航无关词</nav><main><p>Open the notebook in Colab</p><p>${paragraph}</p></main>`
  const ctx={net:{fetchPublic:async url=>{request=url;return {...response,url,body:{kind:'html',content:html}}}}}
  const sources=await researchTerm({query:'Transformer',context:'计算机视觉'},ctx)
  assert.equal(request,'https://zh.d2l.ai/chapter_attention-mechanisms/transformer.html')
  assert.equal(sources[0].excerpt,paragraph)
  assert.match(sources[0].citation,/教材章节/)
  assert.equal(articleExcerpt(html),paragraph)
  await assert.rejects(researchTerm({query:'Transformer',context:'计算机视觉'},{net:{fetchPublic:async()=>{throw Object.assign(new Error('Host denied'),{code:'E_NET_DENIED'})}}}),{code:'E_NET_DENIED'})
})

test('page puts a reading guide before hierarchy and cites both explanations; unused searches are candidates', () => {
  const c = structuredClone(fixture)
  c.visualization = {layout:'hierarchy'}
  c.sources.push({id:'web_1',citation:'机构背景正文',locator:'第1节',excerpt:'教学背景解释。',kind:'background',url:'https://example.edu/lesson'}, {id:'web_2',citation:'未采用候选',locator:'搜索摘要',excerpt:'没有用于解释。',kind:'background'})
  c.learning.terms[0].source_refs=['web_1']
  const html=renderVisualization(c,assessVisualization(c)).html
  assert.ok(html.indexOf('id="reading-guide-title"') < html.indexOf('class="studio"'))
  assert.equal((html.match(/如何阅读这张图/g)??[]).length,1)
  assert.match(html, /适用范围与限制/)
  const firstTerm = html.slice(html.indexOf('class="card term-card"'),html.indexOf('</article>',html.indexOf('class="card term-card"')))
  assert.equal((firstTerm.match(/aria-label="本段解释来源"/g)??[]).length,2)
  assert.equal((firstTerm.match(/\[web_1\]/g)??[]).length,3)
  assert.match(html,/解释中引用的联网背景/)
  assert.match(html,/未用于解释的检索候选（1）/)
  assert.ok(html.indexOf('未采用候选')>html.indexOf('class="search-candidates"'))
  assert.match(html,/id="source-1"/)
})
