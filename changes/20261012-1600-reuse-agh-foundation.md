# 复用 AGH 基础设施与原生 trace 核验

- 类别：架构、源码、测试、研究、运维、版本
- 作者：Codex（受项目发起人委托）
- 日期：2026-10-12（Asia/Shanghai）
- 关联：Fracta-Proof 团队原创工具箱迁移

## Summary / 摘要

从团队原创 Fracta-Proof v0.3.8 的工程经验中重新实现通用 AGH 插件基础设施、离线替身测试和配置驱动的原生 trace 核验器。未复制旧项目算法、安装器或业务文案。

## Technical implementation / 技术实现

- 使用 Map 按 AGH session.key 隔离状态，并通过 shutdown 钩子清理。
- 工作区定位按显式会话设置、环境变量、当前目录父链和显式搜索根的有界遍历降级。
- 搜索跳过依赖、缓存和系统噪声目录，限制深度与目录枚举预算。
- 错误分类覆盖超时、认证、限流、资源上限、参数无效、权限和依赖缺失。
- trace 核验器解析 AGH 原生 JSONL，验证 seq、origin、toolUseId、sourceEventSeqs、同轮完成和指定工具顺序。
- 产物核验覆盖修改时间、最小大小、格式签名和 SHA-256。
- 所有运行时代码只使用 Node.js 标准库，不引入第三方 npm 依赖。

## Interfaces, configuration, and data / 接口、配置与数据变化

- 新增 AGH 工具 set_sciviz_root 和 inspect_sciviz_workspace。
- 新增环境变量 SCIVIZ_ROOT、AGH_WORKSPACE 和可选 SCIVIZ_SEARCH_ROOT。
- 新增 trace 策略 JSON，字段包括 requiredTools、orderedTools、successfulTools、retryRules 和 artifacts。
- package.json 版本为 0.1.1，运行要求 Node.js 24 或更高版本。

## Compatibility and migration / 兼容性与迁移

- 无既有 SciViz 运行时代码需要迁移。
- Fracta-Proof 插件接口仅作为团队经验来源；新代码使用独立命名空间和工具名。
- 原项目验证于 AGH developer preview；接入当前 AGH 实例前仍需真实注册探针。
- Windows PowerShell 可能拦截 npm.ps1，可运行 npm.cmd；WSL 登录 shell 可直接运行 npm。

## Verification / 验证

- Windows Node.js v24.20.0：npm.cmd test，9 passed / 0 failed。
- WSL Ubuntu Node.js v24.21.0：npm test，9 passed / 0 failed。
- node --check 对全部新增 mjs 文件通过。
- ops/Test-RepositoryPolicy.ps1 通过。
- git diff --cached --check 通过。

## Risks and limitations / 风险与限制

- 当前仅注册基础诊断工具，尚未实现可行性评分和 3D 生成。
- GLB 检查当前验证容器头、版本和长度，不替代完整 glTF Schema 与渲染检查。
- AGH meta 字段和事件 Schema 仍需针对当前平台版本做真实兼容性测试。
- 根级许可证尚未由团队选择，仓库保持私有且 package 标记为 UNLICENSED。

## Rollback / 回滚

回滚本次 PR 即可移除新增基础设施。若 v0.1.1 已发布，不修改该版本目录或标签；通过新补丁版本恢复或替换实现。
