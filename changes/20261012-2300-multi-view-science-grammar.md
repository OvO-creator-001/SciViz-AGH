# v0.3.0 多视图科学图解

作者：项目 A 侧 / Codex；日期：2026-10-12；关联：PR #3，feat/a-core-pipeline。

## Summary

主分类 05 源代码；关联 04 接口、06 测试、07 示例、08 证据、11 日志。将仅波叠加专用插图升级为适合不同论文表达需求的图解语法，不局限物理公式。

## Technical implementation

- src/render/scene.mjs：根据连接拓扑选取横向单链、分层分支/合流、环形网络；保留原始索引与所有边。process 与实际结构不匹配时解释降级；网络连线编号对应完整文本。增加六种抽象角色 SVG 符号。
- src/render/chart.mjs：零依赖柱状/折线/散点图；数值轴保持比例、整齐刻度、柱形零基线及负值、系列统一范围。仅绘制输入点，不拟合、不新增统计结果。
- src/ui/chart-panel.mjs 与 page.mjs：图例切换、精确值、来源关联数值表、键盘操作、逐步讲解、概念/关系高亮与手机区域滚动。
- assessment/contract 共享 visual-spec 校验，chart 来源参与证据引用及生成后核对提示。AGH 工具描述更新，旧 verified 非阻塞及版权页脚不变。

## Interfaces, configuration, and data

开发版本 0.3.0，schema_version 保持 1.0。增加可选 nodes[].visual_role、visualization.layout 和 visualization.chart（kind/title/x_label/y_label/series/points/source_refs），详细字段与边界见 QUICKSTART_030.md。图表由调用者提供，图布局可自动选择；不存在从标题自动生成科学数据。

无新增生产依赖、API Key 或付费服务。AGH 推理沿用现有环境。波叠加模板继续保留。

## Compatibility and migration

旧 0.1/1.0 渲染输入继续兼容；不填 visualization 时自动选拓扑布局，规范化保存 layout=auto。历史文件不变。新画廊生成器每次创建新 outputs/sciviz-gallery-v030-*，实际 AGH 输出仍为新 evidence/sciviz-*。

当前宿主先禁用/移除旧 SciViz 安装登记，再从独立快照安装、按实际完整性哈希信任并启用；旧快照保留，其他插件未改动。安装状态已实测 0.3.0 running/trusted。

## Verification

- node --test tests/*.test.mjs：26/26 通过。
- node examples/generate-gallery-v3.mjs：生成六类原创教学页面；现有 Edge 对六页检查桌面/手机、交互、SVG、版权，无脚本错误或外部请求；记录 evidence/visual-grammar-030/。
- 真实 AGH 使用 model-comparison.json，原生轮次 573–627，返回 rendered；核验器和所有产物 SHA-256 通过，输入图表逐字段保留。
- 实际 AGH HTML 的浏览器检查通过，记录 evidence/agh-grammar-030/。本地原始导出不提交，只提交工具事件摘录。

## Risks and limitations

3–8 概念、最多 16 边；密集网络可能交叉。图形角色是抽象符号，不是科学几何。图表需精确数据和出处，不自动提取 PDF、不生成任意分子/几何、不提供通用 LaTeX 或动画，也不认证科学结论、测量单位可比性或版权授权。6 个示例全部合成，不能冒充真实论文实验。

保持输入转义、链接限制、离线 CSP、无任意脚本/表达式执行。系列需保留至少一个可见项，切换时坐标不变，避免隐藏系列造成比例误导。浏览器请求观察不是物理断网认证。

## Rollback

不改写历史或 releases。需要回退时用新提交恢复至先前源码（上一版提交 2f2df05），或重新安装保留的 work/agh-runtime-021 并核对其哈希。新输入 chart/visual_role 在旧版不受支持，不应静默丢弃；回退时保留新数据和产物并使用旧样例复现。
