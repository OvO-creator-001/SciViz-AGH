import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerLearningTools, resolveAnalysisRoot } from '../src/agh/learning-tools.mjs'
import { researchTerm, parseBingResults } from '../src/agh/research.mjs'
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
