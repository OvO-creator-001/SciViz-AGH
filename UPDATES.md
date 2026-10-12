# 更新入口

另一位协作者每次拉取或打开仓库后，先看本文件。这里提供简短索引；完整技术细节仍保存在changes/，已发布版本见CHANGELOG.md和releases/。

## 当前协作状态

| 日期 | 更新 | 状态 | 快速入口 |
|---|---|---|---|
| 2026-10-12 | B 侧固定 SVG、离线互动页与临时契约适配 | PR #4 草稿待审查，未合并；17 项测试通过；用户确认正常页面交互；正式录制待完成 | [PR #4](https://github.com/OvO-creator-001/SciViz-AGH/pull/4) · [B 交接](docs/architecture/B_RENDERER_HANDOFF.md) · [演示指南](docs/product/B_DEMO_GUIDE.md) · [技术日志](changes/20261012-1930-b-svg-interactive.md) |
| 2026-10-12 | 根目录统一更新索引与README入口 | 随PR #3上传；详细记录持续归changes/ | [本次技术日志](changes/20261012-1721-root-update-index.md) |
| 2026-10-12 | A侧免费评估核心、CLI、AGH业务工具代码及B侧渲染契约 | PR #3待另一方审查；自动检查通过；真实AGH安装调用和B侧联调未完成 | [PR #3](https://github.com/OvO-creator-001/SciViz-AGH/pull/3) · [交接说明](docs/architecture/A_CORE_HANDOFF_V1.md) · [技术细节](changes/20261012-1711-a-core-pipeline.md) |
| 2026-10-12 | AGH基础设施、会话隔离、工作区发现与trace核验 | PR #1待另一方审查；自动检查通过 | [PR #1](https://github.com/OvO-creator-001/SciViz-AGH/pull/1) · [架构说明](docs/architecture/AGH_FOUNDATION.md) · [技术细节](changes/20261012-1600-reuse-agh-foundation.md) |
| 2026-10-12 | 免费优先方案与66小时双人任务安排 | PR #2待另一方审查；自动检查通过；该分支的根目录包含TASKS.md | [PR #2](https://github.com/OvO-creator-001/SciViz-AGH/pull/2) |

## 对方现在可以做什么

1. 先审查并合并PR #1；PR #3以它为基础。
2. B侧根据A_CORE_HANDOFF_V1.md实现src/render/index.mjs，导出renderVisualization({ content, assessment })。
3. 在PR #3评论确认或提出契约修改，不要在两个分支同时修改同一文件。
4. PR #2用于方案和任务安排，可独立审查；合并冲突时保留README、TASKS.md和本索引入口。

## 更新规则

每次有效更新必须同时做到：新增changes/YYYYMMDD-HHMM-主题.md；在本文件表格顶部新增一行；README的根目录入口保持有效；提交并推送GitHub，注明分支/PR、检查结果及未完成项。旧行只在状态变化时更新状态，不删除历史记录，不把PR已上传写成已合并。
