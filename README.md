# SciViz-AGH

论文可视化评估与科普内容生成插件。免费离线生成流程、分层、网络及带来源的数据图、SVG 和互动页面；先生成，再提示来源核对与版权事项。

本仓库用于项目协作与人员交接。所有贡献者必须遵守两条底线：

**协作者快速入口：[最新更新、PR状态与下一步](UPDATES.md)。**

**新版试用：[v0.3.0/0.3.1 六类图解与页面入口](docs/product/QUICKSTART_030.md) · [流程截图](evidence/visual-grammar-030/method.png) · [真实页面入口证据](evidence/agh-page-link-031/RESULTS.md)。**

1. **历史版本只新增、不覆盖**：每次正式交接创建新的 `releases/vX.Y.Z/` 快照；已提交的版本目录禁止修改、重命名或删除。
2. **技术变更可追溯**：每个 PR 必须同时新增 `changes/` 下的技术更新条目，写清实现、接口/数据变化、验证方法、风险与回滚方式。

详细规则见 [交接规范](docs/governance/HANDOFF.md) 与 [内容分类规范](docs/governance/CLASSIFICATION.md)。

## 仓库分类

| 分类 | 目录 | 内容 |
|---|---|---|
| 治理与交接 | `docs/governance/` | 交接规则、分类规则、决策记录 |
| 产品与需求 | `docs/product/` | 项目规划、需求、里程碑、验收标准 |
| 研究与依据 | `docs/research/` | 论文笔记、竞品、评估依据、引用 |
| 架构与接口 | `docs/architecture/` | 架构、API、数据模型、安全与技术设计 |
| 源代码 | `src/` | 插件和工具的可执行源码 |
| 测试与验证 | `tests/` | 单元、集成、端到端测试及夹具 |
| 示例与演示 | `examples/` | 示例输入、演示配置、教程场景 |
| 证据与产物 | `evidence/` | 评估报告、trace、清单和可复现证据 |
| 运维与复现 | `ops/` | 环境、部署、构建、复现脚本 |
| 不可变版本 | `releases/` | 每次正式交接的只读版本快照 |
| 技术更新日志 | `changes/` / `CHANGELOG.md` | 每次变更的细节及发布汇总 |
| 协作自动化 | `.github/` | PR 模板、工作流、责任人规则 |

未能明确归类的文件不得直接合入；先在 `docs/governance/` 补充分类决策。

## 一次标准更新

1. 从 `main` 创建分支。
2. 只在对应分类目录内修改内容。
3. 新增 `changes/YYYYMMDD-HHMM-简述.md`，不要修改旧条目。
4. 正式交接时运行 `pwsh ops/New-Handoff.ps1 -Version X.Y.Z` 创建新快照。
5. 提交 PR，按模板完成检查；合并后保留分支和 Git 历史，禁止强推 `main`。

## 当前阶段

当前开发包 `sciviz-agh@0.3.1` 在 v0.3.0 多视图渲染基础上，为成功生成结果增加可点击页面 Markdown、文件 URI 和绝对路径备用入口。自动按连接结构选择流程/分层/网络，支持有来源的柱状/折线/散点图、角色符号、逐步讲解、精确数值表和来源跳转。省略 `verified` 仍直接生成，结果和页面末尾保留版权与核对提示。

输入仍需整理为带来源的结构化材料；当前验收使用团队合成教学内容。任意论文的专业定制插图、自动 PDF 解析、3D、科学真实性认证尚未实现。真实案例复核、正式录屏和发布仍待完成。

## B 侧页面快速运行

```powershell
node examples/generate-gallery-v3.mjs
node src/cli.mjs generate examples/gallery-v3/model-comparison.json
node src/cli.mjs generate examples/wave-explainer-v2.json
node examples/b-side/generate-demo.mjs
node src/cli.mjs generate examples/core-content-v1.json
```

在返回的新目录中双击 interactive.html。静态 diagram.svg 可独立阅读；旧产物不会覆盖。
当前生成行为、接口与试玩方法见 [v0.3.0 指南](docs/product/QUICKSTART_030.md)。旧版指南保留用于追溯；固定布局、verified 阻塞与“仅波形专用图解”的旧描述均已由新版本取代。

## 开发验证

要求 Node.js 24 或更高版本。运行 npm test 执行离线测试；使用 ops/verify-agh-trace.mjs 和 ops/trace-policy.example.json 核验 AGH 原生 trace。

AGH 基础设施说明见 docs/architecture/AGH_FOUNDATION.md，真实渲染验收见 docs/architecture/AGH_RENDERED_013.md，Fracta-Proof 复用边界见 docs/research/FRACTA_PROOF_REUSE.md。
