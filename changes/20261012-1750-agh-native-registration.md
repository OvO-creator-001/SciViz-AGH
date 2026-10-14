# AGH真实注册、MIT授权与原生工具验收

- 类别：AGH接入、架构、证据、运维
- 作者：Codex，依据项目负责人指示
- 日期：2026-10-12（Asia/Shanghai）
- 关联：优先完成AGH；负责人明确授权MIT许可证

## Summary / 摘要

解除路径和UNLICENSED信任阻塞，真实实例安装/信任/启用SciViz 0.1.2，完成三次模型发起工具调用并核验原生事件。

## Technical implementation / 技术实现

package.json开发版本0.1.2及MIT，新增LICENSE。独立运行快照替换此前未启用SciViz包，其他插件保留。新增Run-AghProbe.mjs避免跨shell引号问题；新增真实core trace策略与证据。根索引链接验收记录。

## Interfaces, configuration, and data / 接口、配置与数据变化

无业务输入格式变化；新增ops/trace-policy.agh-core.json。新证据文本采用.gitattributes精确目录规则保留原始字节，策略允许根级.gitattributes。SCIVIZ_AGH_BIN用于探针指定现有启动器。

## Compatibility and migration / 兼容性与迁移

MIT获负责人显式授权，仓库仍私有。既有版本快照/tag不改；0.1.2为开发包不是正式Release。后续源码变化必须重新安装审查新hash。

## Verification / 验证

真实启用状态running/trusted；原生seq336—390中的三个call/result通过现有verify-agh-trace。CLI生成renderer_pending JSON产物，Windows核心测试11项通过。详细命令、hash、状态见docs/architecture/AGH_REGISTRATION_012.md。

## Risks and limitations / 风险与限制

renderer_pending不表示SVG/HTML已生成；示例为合成教学夹具。历史证据带本机Linux路径，跨机需新探针。调用使用实例已有模型，credits为估计，插件external_cost不包含模型费用。

## Rollback / 回滚

可agh package disable sciviz-agh停用本项目插件；代码回滚以新提交实施。MIT授权已授予的权利不会因删LICENSE而追溯消失；旧快照、tag与证据不改写。
