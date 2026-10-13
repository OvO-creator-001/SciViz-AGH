# 0.4.2 验证记录

日期：2026-10-13。此目录是教学合成示例与插件验证，不是用户论文分析结果。

## 代码与接口

- `node --test tests/*.test.mjs`：36项通过。覆盖术语上下文、结果过滤/去重、教材选择、拒绝传播、来源引用、页面顺序及既有功能。
- `node D:/Apps/agh/node_modules/tsx/dist/cli.mjs tmp/check-agh-tool-schema.ts`：本机官方 AGH checkToolDef 检查9个工具通过。
- 上述 tmp 下的脚本为本机诊断脚本，不是插件运行依赖。

## 实际网络读取（与单元测试分开）

通过 AGH 官方 createPublicFetch 执行，未使用绕过 Host 的 fetch 或代理。

- [最终读取记录](public-research-final.json)：Transformer、IoU、注意力机制均取得中文《动手学深度学习》页面标题和正文摘录。
- [早期尝试记录](public-research.json)：保留通用学术检索的失败与直接教材读取结果。Bing 在本机对部分查询返回无关词条，过滤后明确失败；不能声称通用搜索质量已全部解决。
- 来源 URL、时间和截断标记在 JSON 中保留。教材内容为来源摘录，版权归原作者；不代表 SciViz 原创，不代表对论文结论的科学验证。

## 实际浏览器检查

使用现有 Playwright 与 Edge 155.0.4283.45，在 offline=true 的浏览器上下文打开本地 HTML；未安装新依赖。

[browser-checks.json](browser-checks.json) 记录：模式切换、键盘切换、来源展开、未引用候选折叠、指南在关系图之前、节点选择通过；页面错误与网络请求均为空。离线模拟不等于所有浏览器/所有实际网络条件验收。

可双击 [interactive.html](interactive.html)，静态替代为 [diagram.svg](diagram.svg)。截图 [读图顺序](guide-before-diagram.png)、[解释中的来源](inline-sources.png) 已检查。本示例仅用于界面验证。

## 安装

[installed.json](installed.json) 记录 AGH 官方 SDK 更新操作 completed，version/actualVersion 均为0.4.2，actual=running、trusted=true、desired=enabled。

来源：`file:./work/sciviz-agh-0.4.2-research-reading-20261013`。

完整性：`sha256-496352fad90055851546db8bf58c15c094954579e96719b42a378c2a1f51246d`。

无新增权限、依赖或服务授权；保留0.4.1回退目标。本轮没有让 AGH 模型分析用户 PDF，没有录视频，真实论文输出质量由用户继续测试。旧 HTML 需重新生成；旧草稿若未引用背景资料，需先核对后补上 source_refs。
