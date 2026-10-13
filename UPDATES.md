# 更新入口

另一位协作者每次拉取或打开仓库后，先看本文件。这里提供简短索引；完整技术细节仍保存在changes/，已发布版本见CHANGELOG.md和releases/。

## 当前协作状态

| 日期 | 更新 | 状态 | 快速入口 |
|---|---|---|---|
| 2026-10-13 | U382赛事材料与评委复现入口 | 固定B侧0.4.2；36项测试及四组样例通过；私人日志仅本机打包，不上传仓库 | [提交说明](docs/submission/U382/README.md) · [技术日志](changes/20261013-2240-u382-submission-materials.md) |
| 2026-10-12 | v0.3.1：生成后直接打开页面 | 27项测试通过；真实AGH rendered，模型最终回复逐字展示Markdown链接和备用路径；上传A分支/PR #3，未合并 | [使用说明](docs/product/QUICKSTART_030.md) · [真实验证](evidence/agh-page-link-031/RESULTS.md) · [技术日志](changes/20261012-2315-clickable-page-entry.md) |
| 2026-10-12 | v0.3.0：流程/分层/网络 + 三类数据图 | 26项测试、六类页面浏览器检查与真实AGH rendered 通过；上传A分支/PR #3，未合并 | [画廊与接口](docs/product/QUICKSTART_030.md) · [真实验证](evidence/agh-grammar-030/RESULTS.md) · [技术日志](changes/20261012-2300-multi-view-science-grammar.md) |
| 2026-10-12 | v0.2.1：直接生成、版权页脚与科学图解升级 | 缺省/false verified 不阻塞；真实AGH rendered、浏览器交互与20项测试通过；通过PR #3交付 | [三分钟试用](docs/product/QUICKSTART_021.md) · [效果截图](evidence/agh-atlas-021/desktop.png) · [验证记录](evidence/agh-atlas-021/RESULTS.md) · [技术日志](changes/20261012-2235-direct-generate-science-atlas.md) |
| 2026-10-12 | A/B端到端联调与真实AGH渲染验收 | PR #4代码已审查并合入A开发分支；AGH 0.1.3实际返回rendered并生成SVG/HTML；随本次提交更新PR #3 | [验收记录](docs/architecture/AGH_RENDERED_013.md) · [原生证据](evidence/agh-rendered-013/verification.json) · [技术日志](changes/20261012-2005-ab-rendered-integration.md) |
| 2026-10-12 | MIT授权，AGH安装/信任/启用及三次真实工具调用通过 | A02接入已通过；该次历史生成状态为renderer_pending | [验收记录](docs/architecture/AGH_REGISTRATION_012.md) · [技术日志](changes/20261012-1750-agh-native-registration.md) |
| 2026-10-12 | B侧固定SVG、离线互动页与契约适配 | PR #4代码已由A审查并合入开发分支；正式录制待完成 | [PR #4](https://github.com/OvO-creator-001/SciViz-AGH/pull/4) · [B交接](docs/architecture/B_RENDERER_HANDOFF.md) · [演示指南](docs/product/B_DEMO_GUIDE.md) · [技术日志](changes/20261012-1930-b-svg-interactive.md) |
| 2026-10-12 | 根目录统一更新索引与README入口 | 随PR #3上传；详细记录持续归changes/ | [本次技术日志](changes/20261012-1721-root-update-index.md) |
| 2026-10-12 | A侧免费评估核心、CLI、AGH业务工具代码及B侧渲染契约 | PR #3待另一方审查；真实AGH接入后续已通过；B侧联调未完成 | [PR #3](https://github.com/OvO-creator-001/SciViz-AGH/pull/3) · [交接说明](docs/architecture/A_CORE_HANDOFF_V1.md) · [技术细节](changes/20261012-1711-a-core-pipeline.md) |
| 2026-10-12 | AGH基础设施、会话隔离、工作区发现与trace核验 | PR #1待另一方审查；自动检查通过 | [PR #1](https://github.com/OvO-creator-001/SciViz-AGH/pull/1) · [架构说明](docs/architecture/AGH_FOUNDATION.md) · [技术细节](changes/20261012-1600-reuse-agh-foundation.md) |
| 2026-10-12 | 免费优先方案与66小时双人任务安排 | PR #2待另一方审查；自动检查通过；该分支的根目录包含TASKS.md | [PR #2](https://github.com/OvO-creator-001/SciViz-AGH/pull/2) |

## 对方现在可以做什么

1. 拉取feat/a-core-pipeline，先看本表第一行，再复核PR #3中的真实AGH证据与渲染产物。
2. PR #4的代码已经进入A分支；后续共同修改基于feat/a-core-pipeline，避免继续分叉同一文件。
3. 运行 `node examples/generate-gallery-v3.mjs` 体验六类新版图解；B 可按 QUICKSTART_030 整理真实论文的关系、数值与出处，再准备录屏。不要把合成示例当成论文实验，也不要按旧交接覆盖回固定纵向布局。
4. PR #1和PR #2仍可独立审查；合并冲突时保留README、TASKS.md和本索引入口。

## 更新规则

每次有效更新必须同时做到：新增changes/YYYYMMDD-HHMM-主题.md；在本文件表格顶部新增一行；README的根目录入口保持有效；提交并推送GitHub，注明分支/PR、检查结果及未完成项。旧行只在状态变化时更新状态，不删除历史记录，不把PR已上传写成已合并。
