# 免费优先与按需可视化方案修订R2

- 类别：产品；技术更新日志为必要协作记录
- 作者：Codex，依据项目负责人指示
- 日期：2026-10-12 16:36（Asia/Shanghai）
- 关联：当前会话“每项工具提供免费基础替代，免费优先，不强求3D”；尚未创建新PR

## Summary / 摘要

新增docs/product/SCIVIZ_PLAN_R2_FREE_FIRST.md，将3D必选路线调整为基于证据的2D/3D选择；逐环节列出免费默认与低依赖替代。outputs/提供同内容交接副本，不纳入Git。

## Technical implementation / 技术实现

仅产品设计文档：以Node共享核心、SVG、基础HTML为首版；AGH模型费用与插件软件成本分开；Tripo改为可选升级；定义证据准入、免费降级、可编辑内容JSON和分阶段验收。未改运行代码、依赖或已发布版本。

## Interfaces, configuration, and data / 接口、配置与数据变化

文档提出generate_visualization、推荐格式及证据判定字段；prefer_free=true、allow_paid=false、external_budget=0、offline_required=true均是拟议默认值，尚未写入运行配置。核心生成30秒上限为待测设计目标。

## Compatibility and migration / 兼容性与迁移

现有基础工具不变，无运行迁移。后续产品开发以R2为依据，旧规划保留历史。方案号R2不是package版本，不创建或移动软件tag。

## Verification / 验证

使用PowerShell读取新增UTF-8文件，核对免费优先、零外部预算、2D/3D分流、当前实现边界及工具替代清单；对仓库文档和outputs交接副本执行Get-FileHash -Algorithm SHA256确认一致。此项为文档检查，不代表业务功能测试通过。

## Risks and limitations / 风险与限制

免费工具仍有硬件、人工及维护成本；集成前需核对版本、许可证、数据授权和宿主兼容性。完全免费AGH推理链路尚未验证。本文无实测性能或科学效果结论。

## Rollback / 回滚

未改变运行行为，无运行回滚需要。如方案需修正，新增后续修订文档与技术日志并说明取代范围，不改写旧版本和本条记录。
