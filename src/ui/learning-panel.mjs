import { escapeText as esc } from '../render/text.mjs'
import { renderTeaching, teachingCaptions } from '../render/teaching.mjs'

export const learningStyles = `
.reading-switch{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 22px}.reading-switch button{font-size:14px;padding:10px 18px}.reading-switch button[aria-pressed=true]{border-color:var(--mint);color:var(--mint);background:#66d9cf16}.overview{border-top:3px solid var(--mint)}.overview .summary-text{font-size:18px;line-height:1.95;max-width:1040px}.takeaways{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;padding:0;list-style:none}.takeaways li{border-left:2px solid #476180;padding:0 16px;font-size:14px}.term-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.term-card{min-width:0}.term-card .term-prose{font-size:15px}.term-card svg{display:block;width:100%;height:auto}.teaching-figure{margin:18px 0}.teaching-figure figcaption{font-size:12px;line-height:1.8;color:#9fb2cb;margin-top:10px}.analogy{padding:12px 16px;border-left:2px solid #ffd17d;background:#ffd17d09}.term-caveat{font-size:13px;color:#b1bfd2}.mode-label{font-size:12px;color:#8db8e3}.mode-enhanced [data-mode-text]{display:none}.mode-enhanced[data-reading-mode=academic] [data-mode-text=academic],.mode-enhanced[data-reading-mode=popular] [data-mode-text=popular]{display:block}.mode-enhanced .mode-label{display:none}.research-label{color:#efc778;font-size:12px}.overview a,.term-card a{font-size:13px}@media(max-width:1050px){.term-grid{grid-template-columns:1fr}}@media print{.reading-switch{display:none}.mode-enhanced [data-mode-text]{display:block!important}.mode-enhanced .mode-label{display:block}.term-grid{display:block}}
`
export function learningPanel(learning, refs) {
  if (!learning) return ''
  const research = { provided: '由调用方提供背景资料；未记录本次联网检索', not_requested: '本次未联网，仅使用输入材料', retrieved: '已取得联网背景摘录；仍需核对相关性', partial: '部分检索成功，部分来源暂不可用', unavailable: '本次联网未成功；解释仅依据已有材料', no_results: '检索未找到可用摘录；没有补造来源' }[learning.research_status]
  const versions = (item, cls = '') => ['academic', 'popular'].map(mode => `<div data-mode-text="${mode}" class="${cls}"><span class="mode-label">${mode === 'academic' ? '学术模式' : '科普模式'}</span><p>${esc(item[mode])}</p></div>`).join('')
  return `<section id="reading-analysis" data-initial-mode="${learning.mode}"><div class="reading-switch" data-reading-controls hidden role="group" aria-label="阅读模式"><strong>选择阅读方式</strong><button type="button" data-reading-mode="popular" aria-pressed="false">科普模式 · 轻松理解</button><button type="button" data-reading-mode="academic" aria-pressed="false">学术模式 · 定义与边界</button><span id="reading-status" class="muted" role="status"></span></div>
  <section class="card overview" aria-labelledby="overview-title"><div class="mini-label">START HERE</div><h2 id="overview-title">先读这一段 / 本次分析概述</h2><p class="muted">依据所提供材料整理；联网背景知识单独列在下方术语卡片中。</p><p class="research-label">${esc(research)}</p>${versions(learning.summary,'summary-text')}<p>原文依据 ${refs(learning.summary.source_refs)}</p><ul class="takeaways">${learning.key_points.map(p=>`<li>${versions(p)}<span>依据 ${refs(p.source_refs)}</span></li>`).join('')}</ul></section>
  ${learning.terms.length ? `<h2>把难点讲清楚</h2><p class="muted">切换模式可改变解释深度与示意标签；来源和科学限制始终保留。</p><div class="term-grid">${learning.terms.map(t=>`<article class="card term-card" id="term-${t.id}"><h3>${esc(t.term)}</h3>${versions(t,'term-prose')}<div data-mode-text="popular" class="analogy"><span class="mode-label">科普类比</span><p>${esc(t.analogy)}</p></div>${t.illustration !== 'none' ? ['academic','popular'].map((mode,i)=>`<figure class="teaching-figure" data-mode-text="${mode}">${renderTeaching(t.illustration,mode)}<figcaption>${esc(teachingCaptions[t.illustration][i])}</figcaption></figure>`).join('') : ''}<p class="term-caveat"><strong>理解边界：</strong>${esc(t.caveat)}</p><p>解释依据 ${refs(t.source_refs)}</p></article>`).join('')}</div>` : ''}<noscript><p class="muted">脚本未启用：下方同时展示两种模式，图形与来源均可阅读。</p></noscript></section>`
}

export function readingInteraction() {
  const section = document.getElementById('reading-analysis')
  if (!section) return
  const buttons = [...section.querySelectorAll('button[data-reading-mode]')]
  function select(mode) {
    section.dataset.readingMode = mode
    section.classList.add('mode-enhanced')
    buttons.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.readingMode === mode)))
    document.getElementById('reading-status').textContent = mode === 'academic' ? '当前：学术模式，关注定义、条件与限制' : '当前：科普模式，从直觉与类比开始'
  }
  buttons.forEach((button,i)=>{
    button.addEventListener('click',()=>select(button.dataset.readingMode))
    button.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
      event.preventDefault()
      const target = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[1-i]
      target.focus(); select(target.dataset.readingMode)
    })
  })
  section.querySelector('[data-reading-controls]').hidden = false
  select(section.dataset.initialMode)
}
