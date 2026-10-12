# 仓库交接治理初始化

- 类别：治理、文档、运维、协作自动化
- 作者：Codex（受项目发起人委托）
- 日期：2026-10-12（Asia/Shanghai）
- 关联：初始建仓

## Summary / 摘要

初始化 SciViz-AGH 私有交接仓库，建立不可变版本、技术日志和严格内容分类制度。

## Technical implementation / 技术实现

- 新增十一类目录和分类规则。
- 用独立 `changes/` 条目记录每次更新，避免多人同时改写一个日志文件。
- 新增 `ops/Test-RepositoryPolicy.ps1`，检查变更日志模板、目录合法性及已跟踪版本是否被改写。
- 新增 GitHub Actions，在 PR 与 `main` 推送时自动运行策略检查。
- 新增 PR 模板，把分类、验证、兼容性、回滚和秘密信息检查变为必填项。

## Interfaces, configuration, and data / 接口、配置与数据变化

- 暂无运行时 API 或数据 Schema。
- 引入 `releases/vX.Y.Z/` 作为交接版本命名约定。

## Compatibility and migration / 兼容性与迁移

初始版本，无迁移要求。

## Verification / 验证

运行：`pwsh -File ops/Test-RepositoryPolicy.ps1`。

预期：分类目录、日志字段和不可变版本检查全部通过。

## Risks and limitations / 风险与限制

- GitHub 分支保护仍依赖仓库设置和账号套餐能力。
- 自动检查可以阻止常规 PR，但仓库管理员仍应避免绕过规则或强推。

## Rollback / 回滚

回滚初始化提交；若仓库已经交接使用，应发布新补丁版本修正规则，不改写历史。
