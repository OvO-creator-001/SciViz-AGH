# SciViz-AGH

论文可视化可行性评估与互动式 3D 科普内容生成插件。

本仓库用于项目协作与人员交接。所有贡献者必须遵守两条底线：

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

仓库目前已具备交接治理骨架、AGH 插件通用基础设施和原生 trace 证据核验器。论文可视化评分、3D 生成和互动页面业务工具仍待实现。

## 开发验证

要求 Node.js 24 或更高版本。运行 npm test 执行离线测试；使用 ops/verify-agh-trace.mjs 和 ops/trace-policy.example.json 核验 AGH 原生 trace。

AGH 基础设施说明见 docs/architecture/AGH_FOUNDATION.md，Fracta-Proof 复用边界见 docs/research/FRACTA_PROOF_REUSE.md。
