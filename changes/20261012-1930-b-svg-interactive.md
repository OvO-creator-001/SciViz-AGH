# B 侧固定 SVG 与离线互动页

- 作者：miku（Codex 辅助）；日期：2026-10-12；分支 feat/b-svg-interactive，基于 A 的 82f8a14。关联 PR：本分支 draft PR，目标 feat/a-core-pipeline（创建后补链接）。
- 类别：主要为源码 05；测试 06、示例 07、证据 08 与交接/演示说明为同一可复现交付的必要配套。

## 实现

新增 src/render/{index,contract,text,svg}.mjs 与 src/ui/page.mjs：纯同步渲染、集中契约适配、3–8 节点纵向 SVG、最多 16 边的固定侧通道、HTML 节点高亮/键盘操作/来源与限制、不足报告及错误页。静态 SVG 附全文解释和来源；无新增依赖，无网络/模型调用。

新增 examples/b-side/ 夹具与独立生成器、tests/b-renderer.test.mjs、B_RENDERER_HANDOFF、B_DEMO_GUIDE。UPDATES/README/CHANGELOG 添加入口与未发布摘要，不修改历史发布。A 核心、AGH、CLI、ops 和根级依赖未改。
本次新运行目录用局部 .gitattributes 固定 LF，避免 Windows 检出破坏 JSON 字节哈希；旧证据目录不改。

## 接口与迁移

支持 A 的 renderVisualization({content, assessment}) 与原临时双参数调用；schema 1.0 / 0.1 的字段兼容只在 contract.mjs。正常 {svg,html}，不足 {svg:null,html}，无效抛带 path 的 INVALID_INPUT。A 的既有 loader 自动接入，不需要共享配置变更。

A 当前规范化会丢弃 content_kind/内容 limitations/source URL；不足时跳过渲染。以上待 A 审查，不宣布冻结，不代替 A 修改规则。

## 验证

`node --test tests/*.test.mjs`：17/17 通过。三条实际生成命令、产物位置、测试修正过程与人工浏览器反馈详见 evidence/b-validation-v1-20261012/RESULTS.md。用户确认正常页面与点击/方向键/来源交互正常；代理浏览器 file:// 访问被策略拒绝，未绕过。物理断网和恶意文本浏览器实测仍未完成，不把代码测试写成浏览器通过。

## 安全、限制与回滚

所有输入作为转义文本或经过 HTTP/HTTPS 白名单验证的链接；脚本不插值输入，不调用 innerHTML；CSP 限制资源和连接。固定内嵌脚本依赖 unsafe-inline，主要注入防线是转义，不把 CSP 当清洗器。保持内容，不静默删改。输出新目录、wx 文件，已有目录拒绝覆盖。

复杂边可能交叉，以编号与完整关系表辅助；不是通用布局。没有真实论文、科学真实性验证、PDF/OCR、3D、付费 API 或模型。尚待 A 非作者审查、真实 AGH 验收、正式视频要求和录制。没有创建正式发布快照。

回滚：对 B 实现提交执行 git revert 并审查；保留原 evidence 与历史变更。移除渲染器后 A 原有 loader 将回到 renderer_pending；不需回退 A 的提交。
