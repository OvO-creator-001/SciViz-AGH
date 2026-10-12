import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { resolve, relative, join } from 'node:path'
import { generateVisualization } from '../src/core/pipeline.mjs'
import { loadRenderer } from '../src/core/renderer-adapter.mjs'
import { escapeText } from '../src/render/text.mjs'

const files = ['method', 'evidence-tree', 'ecology-network', 'model-comparison', 'environment-trend', 'material-scatter']
const base = resolve('outputs')
await mkdir(base, { recursive: true })
const root = await mkdtemp(join(base, 'sciviz-gallery-v030-'))
const renderer = await loadRenderer(), results = []
for (const name of files) {
  const content = JSON.parse(await readFile(new URL(`./gallery-v3/${name}.json`, import.meta.url), 'utf8'))
  const result = await generateVisualization(content, { root, renderer })
  if (result.status !== 'rendered') throw new Error(JSON.stringify(result))
  results.push({ name, title: content.title, path: relative(root, join(result.directory, 'interactive.html')).replaceAll('\\', '/') })
}
await writeFile(join(root, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SciViz 多视图图解画廊</title><style>body{background:#090f19;color:#dce9f8;font:16px/1.8 system-ui,"Microsoft YaHei";max-width:1000px;margin:auto;padding:50px 24px}h1{font-size:38px}p{color:#97aec7}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}a{display:block;border:1px solid #30445b;border-radius:12px;background:#101c2b;padding:26px;text-decoration:none;color:#dce9f8}a:hover{border-color:#66d9cf}small{color:#66d9cf;display:block;letter-spacing:2px;margin-bottom:16px}footer{margin-top:40px;color:#97aec7;font-size:13px}</style><small>SCIVIZ / VISUAL GRAMMAR 0.3</small><h1>不同的问题，不同的图解。</h1><p>流程、分层、网络与数据图。以下均为团队原创教学夹具，不是真实论文结果。</p><main>${results.map((r,i)=>`<a href="${r.path}"><small>0${i+1} / ${r.name.toUpperCase()}</small>${escapeText(r.title)} →</a>`).join('')}</main><footer>免费 · 离线 · 无外部依赖。每个页面包含来源、限制与版权说明。</footer></html>`, { flag: 'wx' })
console.log(JSON.stringify({ root, gallery: join(root, 'index.html'), results }, null, 2))
