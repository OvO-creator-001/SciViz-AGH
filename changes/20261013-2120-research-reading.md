# 0.4.2：术语学术来源与页面阅读顺序

- 类别：源码、测试、架构、产品、证据；文档与证据用于解释同一插件修复。
- 作者：miku（Codex辅助）
- 日期：2026-10-13，Asia/Shanghai
- 关联：PR #5，feat/b-research-modes；开发包更新，非正式 Release。

## 摘要与实现

此前英文歧义词检索会混入词典词条，背景来源与解释关联不明显，读图指南在关系图后面。

- src/agh/research.mjs：默认 academic/zh，完整术语搭配公开学科 context，学术域名与关键词筛选、词典过滤、结果去重；部分明确技术术语优先读取中文 D2L 教材。提取真实标题与正文段落，默认不依赖 Wikipedia。
- src/agh/learning-tools.mjs：模型指引要求核对背景并在术语 source_refs 中引用；保存返回使用统计与未引用警告。不擅自分配引用。
- src/ui/learning-panel.mjs、page.mjs：两种模式解释旁都有来源链接；原文、采用背景、未采用候选分组；候选折叠，指南移到关系图前。
- tests/b-learning.test.mjs：补充过滤、教材路由、拒绝、引用与顺序测试。package.json 更新0.4.2，无新增依赖。

## 接口与迁移

research_sciviz_term 新增可选 context（最多120字符，公开学科背景）；provider 默认由 bing 改为 academic，保留显式 bing/wikipedia 和 url。裸歧义词可返回 TERM_CONTEXT_REQUIRED，调用方须补背景。原渲染接口及内容结构不变；旧 HTML 不原地更新，需重新生成。已有无引用草稿须先核对资料，再补 learning.terms[].source_refs。共享接口说明同步在 ANALYSIS_WORKFLOW_040.md，未宣称契约冻结。

## 验证

Windows、现有 Node.js/AGH/Edge 环境：`node --test tests/*.test.mjs` 36项通过；官方 checkToolDef 9工具通过。实际 Host 读取3个中文教材页面成功；实际离线 Edge 页面交互与来源展开通过。详情与安装记录见 [RESULTS](../evidence/b-research-042/RESULTS.md)，网络、代码、浏览器验证分别记录。

AGH 官方 SDK 已完成更新，actualVersion=0.4.2、running、trusted。快照摘要：sha256-496352fad90055851546db8bf58c15c094954579e96719b42a378c2a1f51246d。未新增权限。

## 限制与安全

域名/词语筛选不等于科学相关性判定；教材优先映射只覆盖部分术语，不承诺所有学科。通用 Bing 实测仍可能返回无关结果，过滤后会失败；不得补造来源。当前教材在本机网络可读，不保证所有中国网络可访问。摘录可能截断、公式不完整，模型仍须核对。联网只发送术语和公开背景，不得发送私有摘录；拒绝原样传播。不接商业 API，不执行外部文字。未测试用户真实论文分析，未录视频。

## 回滚

保留 D:/Apps/agh/work 下独立0.4.1与0.4.2快照；使用 AGH 支持的 rollback 回到0.4.1，核对 actualVersion/running/trusted。不要覆盖或删除运行快照。代码需要撤销时用新的 git revert 提交，不强推；旧生成页继续保留。
