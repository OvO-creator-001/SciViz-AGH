# v0.4.0：联网术语与分步分析接口

本次根据用户新增 P0/P1/P2 要求扩展 A/B 共享接口。保留原 `schema_version=1.0`、四个旧工具及关系图。版本为开发包 0.4.0；未宣称已冻结接口或发布正式 Release。

## 数据流与模型边界

AGH 模型先通过已有 document_read 读取上传 PDF，或读取用户文本，再调用以下工具。插件不安装模型、不访问模型密钥、不另接付费模型 API。模型思考发生在 AGH 的工具调用之间；不是插件内部同步调用一个隐藏模型。

1. `start_sciviz_analysis({title,text,citation,locator,mode})`：登记已读取摘录（最多10000字符）和 `original_1`，返回 draft_id、revision=0、完整内容结构示例与分步指引。长论文由 AGH 选择并说明本次读取范围，不能将部分摘录宣称为全文。
2. `research_sciviz_term({draft_id,query,provider?,language?,url?})`：默认通过 Bing 中国站做免费关键词查询；可选 wikipedia，language=en/zh。传 url 时读取指定公开页面。只通过调用上下文的 `net.fetchPublic` 使用 AGH 的匿名公开网络策略；无代理、全局 fetch、shell 或付费接口回退。
3. **AGH 模型阅读与分析**：检索摘要只是候选，先检查语义相关性，学术模式优先继续读取教材/机构/论文正文，再编写概述和解释。网页中的指令不执行。搜索结果不是科学验证。
4. `save_sciviz_analysis({draft_id,expected_revision,content_json,note?})`：验证模型编写的内容并保存修订。来源由草稿注入；模型不得修改已记录摘录、URL、出处、原文/背景角色，或造新来源 ID。每次成功保存 revision+1。
5. **AGH 模型审阅与优化**：检查返回的概述和结构信息，必要时再次 save。不要求模型第一次调用就写完所有内容。
6. `render_sciviz_draft({draft_id,expected_revision})`：用保存好的内容生成新产物。后续 `get_sciviz_draft({draft_id})` → 模型编辑 → save → render，保留旧页面。

每会话最多6份草稿、每份最多12次检索/30次修订、最多20条来源。0.4.1 起通过 AGH Host 在当前工作区 `.sciviz-drafts` 保存按会话和工作区隔离的恢复记录；同一会话重连后读取，权限拒绝和损坏记录明确失败。没有 Host 文件接口的离线上下文仍使用内存。旧 0.4.0 丢失的草稿不能恢复。记录含原文摘录和分析，不应上传 Git。生成的 content.json 与 analysis-record.json 继续保留。版本冲突必须先 get，不自动覆盖；禁止并发修订同一草稿。新会话可用生成的 content.json 经原 generate_visualization 重渲染；重新进行受控检索需要新草稿。

## 内容字段（向后兼容，可整体省略 learning）

```json
{
  "learning": {
    "mode": "popular",
    "summary": {"academic":"严谨概述","popular":"通俗概述","source_refs":["original_1"]},
    "key_points": [{"academic":"方法/发现/限制","popular":"一句话要点","source_refs":["original_1"]}],
    "terms": [{
      "id":"term1", "term":"简谐运动", "academic":"定义、条件和细节", "popular":"简单解释",
      "analogy":"生活类比，或明确无适当类比", "caveat":"类比与模型的边界",
      "source_refs":["web_1"], "illustration":"harmonic_motion"
    }]
  }
}
```

- summary 必填，key_points 1–6项，terms 0–8项。summary/要点的每种文本≤2000字符，术语每种正文≤4000，类比≤1000，边界≤1500，标题≤120。总输入仍限制100KB。
- 概述与要点只能引用原始来源；补充资料用于术语解释。`sources[].kind=original|background`，旧来源默认视为原始输入资料。
- 来源可含 retrieved_at 和 truncated。搜索摘要的 locator 明确注明“尚未读取目标正文”以及搜索页 URL。页面保留标签、摘录、链接、时间与部分摘录提示；检索成功不赋予 verified。
- learning.research_status 支持 provided/not_requested/retrieved/partial/unavailable/no_results。旧直接输入默认 provided，分步流程用实际操作结果覆盖模型提交的该字段。成功也只表示取得摘录，不表示相关性或科学真实性已核实。
- 新配图模板：none、topology、fractal、quantum_wave、harmonic_motion、protein_structure。均由固定程序生成，模型选择类型并编写配套正文；不接收任意 HTML/SVG/脚本。
- 量子示例为无量纲归一化高斯波包一个时刻的实部与概率密度；蛋白质是层级概念图，无真实序列/坐标/PDB或结构预测。未知专业图用 none 加文字及原关系图，不假造专业几何。

## 渲染返回与产物

`renderVisualization(content,assessment)` 或 `renderVisualization({content,assessment})` 仍是同步纯函数。保留 `{svg,html}`，有术语配图时增加 `figures:[{name,svg}]`。`diagram.svg` 仍为原关系图；新增 `teaching-N-academic.svg`、`teaching-N-popular.svg` 可单独使用。

流水线继续新建 evidence/sciviz-*，独占创建文件。分步渲染默认在当前 AGH 工作目录输出，无需安装源码仓库；若用户已显式 set_sciviz_root 则使用该绑定。写入前通过当前 Host 的 fs.stat 校验目录；拒绝时原样失败，不改用其他路径绕过。旧 generate_visualization 的仓库发现行为保持兼容。

分步流程另存 analysis-record.json（草稿ID、修订、检索成功/失败记录与修订说明），纳入manifest哈希。输出页面没有 fetch、远程字体、外部图片或CDN；模式切换在本地完成，不在浏览器中调用模型。P2改进通过AGH会话进行，不是离线HTML里的在线聊天框。

## 错误与待协调点

- WEB_UNAVAILABLE / WEB_NETWORK_ERROR / WEB_HTTP_ERROR：真实失败，不制造来源。AGH宿主拒绝时不得更换底层实现绕过。
- SEARCH_NO_EXCERPTS：可能无结果、搜索页变化或需要人工验证；明确失败，不把HTML当作检索答案。
- REVISION_CONFLICT / SOURCE_CHANGED / DRAFT_NOT_FOUND / INVALID_INPUT：不隐式修复科学内容。
- Bing HTML结构可能变化；Wikipedia 在本机直连失败，保留可选入口但不承诺所有地区可用。
- 网页抽取是轻量文字提取，复杂动态网页/公式/PDF不保证完整；网络抓取不替代AGH附件读取器。
- 后续如需真实专业图片、结构数据库或生成式图像API，需要明确来源、许可、科学核查和预算后再接入。
- A 可直接复用新增 tools 和 learning 规范；需要确认是否将草稿持久化、扩展长文多段原文，以及新增原生trace策略。原三工具trace核验策略保留，不将新流程冒充旧策略已验收。
