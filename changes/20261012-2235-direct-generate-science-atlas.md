# 直接生成、版权提示与科学图解升级

- 作者：Codex，按项目负责人要求实施；日期：2026-10-12（Asia/Shanghai）。
- 分支：feat/a-core-pipeline；关联 PR #3。
- 分类：源码与接口为主；测试、示例、证据和交接文档是可复现交付配套。

## Summary

人工 verified 步骤拖慢生成，旧图按输入顺序堆叠且关系标签不直观。本次改为来源核对不阻塞生成，结果与页面末尾提示版权风险；以深色科学图解和按连接关系分层的布局提高可读性，并提供一个带公式与相位滑块的波叠加教学模板。

## Technical implementation

assessment 将 verified 改为可选布尔值，缺省 false；仅来源引用和结构要求影响可呈现决定。新增共享 notices，将 copyright_notice、source_review 和 warnings 写入 assessment、生成结果及 manifest。AGH 工具说明明确无需询问人工核对，生成内部已经评估，可省去单独的 assessment 调用。

layout 通过遍历识别回连、对其余边分层，按父节点顺序排列分支。节点和关系文字按长度换行分配空间；所有边和标签保留，回连走侧通道。页面支持节点上下游高亮、单关系聚焦、键盘操作、缩放、来源展开、无 JS 阅读及版权页脚。

可选 wave_interference 根据 sin(x)、sin(x+φ) 和其和绘制同尺度曲线；只在显式指定模板与来源时使用。180° 抵消和同相振幅用测试验证。页面脚本以显式参数传入 wavePoints，避免 AGH 模块转换后留下不可用的导入别名；发现此宿主差异后开发包从 0.2.0 修正至 0.2.1。

## Interfaces, configuration, and data

schema_version 保留 1.0，源 verified 从必填改为可选，不自动假造人工核对。新增生成后提示字段；支持保留 content_kind、limitations、sources[].url；新增可选 illustration={kind:wave_interference,phase_degrees:0..360,source_refs}。非法引用、非法相位或缺少引用仍返回明确错误/报告。

新增 examples/wave-explainer-v2.json；ops/Run-AghProbe.mjs 可传第三个参数选择输入文件，默认旧示例不变。无生产依赖、CDN、付费服务或外部生成请求。浏览器检查工具仅装在忽略的 work/，使用既有 Edge。

## Compatibility and migration

原有 true/false verified 输入继续接受，false 的行为改为生成并提示；旧不足报告仅适用于当时版本。旧日志、发布快照、tag、历史产物均保留。UI、模型说明与新版三分钟指南同步，B 方请以此版为准，勿套用旧 fixed-layout/人工核对门禁描述。

## Verification

20/20 Node 测试通过；真实 AGH 0.2.1 在完全省略 verified 的情况下生成 rendered，轮次 514–568。原生工具配对和产物哈希通过。实际 AGH HTML 在 Edge 完成节点/关系选择、键盘、来源、相位抵消、缩放、移动端、版权页脚检查；无脚本错误，无外部资源请求。详细事实及截图见 evidence/agh-atlas-021/RESULTS.md。

## Risks and limitations

版权说明不能代替许可或自动免责；来源核对不等于版权授权。取消人工门禁加快生成，但科学内容仍需后续核对。当前只有线性波叠加专用示意，其他材料使用通用关系图；尚不具备任意论文的定制插图生成或动画制作能力。高密度图仍可能有交叉边，可用关系聚焦辅助。AGH 对函数源码的格式转换可能使 HTML 哈希与 CLI 不同，分别保存实际哈希。

## Rollback

用新提交 revert 本次源码/UI变更，保留本日志及证据。在 AGH 中停用该开发包，再从已保留的旧快照重新安装、审查实际哈希后信任启用。旧版本会恢复 verified 门禁与旧图样式，不覆盖既有产物、不重写共享历史。
