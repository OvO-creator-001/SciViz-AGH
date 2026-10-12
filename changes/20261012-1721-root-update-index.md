# 新增根目录统一更新索引

- 类别：治理与交接
- 作者：Codex，依据项目负责人要求
- 日期：2026-10-12（Asia/Shanghai）
- 关联：让另一方在根目录快速找到每次更新

## Summary / 摘要

新增根目录UPDATES.md，汇总当前三个PR、状态、交接入口和对方下一步；README增加醒目链接。

## Technical implementation / 技术实现

仓库策略白名单加入UPDATES.md；索引保留详细changes/分层，不以摘要替代技术日志。明确每次有效更新须更新根索引并推送GitHub。

## Interfaces, configuration, and data / 接口、配置与数据变化

无运行接口、配置或数据格式变化。

## Compatibility and migration / 兼容性与迁移

无需迁移。当前修改追加到PR #3，不改旧发布版本、tag或旧技术日志。

## Verification / 验证

检查README链接、UPDATES.md中的PR及相对文件路径；执行仓库策略、Git whitespace与GitHub Actions。

## Risks and limitations / 风险与限制

分支中的索引反映提交时状态；PR状态变化后需要后续提交更新。PR #2的详细任务文件位于其独立分支，在合并前不会出现在本分支。

## Rollback / 回滚

用新提交撤销根入口及白名单；保留本技术日志和Git历史。
