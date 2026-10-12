# A侧免费评估核心与CLI首批实现

- 类别：源码、架构、测试、示例和证据
- 作者：Codex，项目负责人选择A部分并授权实施
- 日期：2026-10-12（Asia/Shanghai）
- 关联：66小时A侧任务，减少重复校验

## Summary / 摘要

实现规则评估、不可覆盖JSON产物、CLI及两个AGH业务工具；B渲染器通过固定函数接入，缺失时明确renderer_pending。

## Technical implementation / 技术实现

新增src/core/与src/cli.mjs，规范化来源/节点/边；默认免费离线且拒绝付费配置。使用独立目录、wx和SHA-256。package files包含src整体。新增合成夹具、关键测试和B交接文档。保留CLI示例证据，不包含用户论文或密钥。

## Interfaces, configuration, and data / 接口、配置与数据变化

Schema 1.0；工具content_json封装共享契约；renderVisualization({content,assessment})返回svg/html。manifest标执行来源但不作为真实性证明。无第三方依赖。

## Compatibility and migration / 兼容性与迁移

基于PR #1分支，基础工具保留；新业务接口尚未发布。旧版本不修改，不重新安装Node/WSL。

## Verification / 验证

Windows node --test运行11项通过。CLI generate生成evidence/sciviz-3BhKup，正确返回renderer_pending。真实AGH版本/扩展检查通过，但包来源未被当前daemon接受，未安装或调用成功。详情见docs/architecture/A_CORE_HANDOFF_V1.md。

## Risks and limitations / 风险与限制

科学语义依赖人工核对；B渲染器未接入，A02真实宿主探针未完成。固定受信任同进程渲染器没有硬超时。不以本地测试冒充真实trace。

## Rollback / 回滚

在新提交中撤销业务工具注册和核心引用可回到基础工具；保留历史证据与技术日志。不得覆盖旧发布快照或移动tag。
