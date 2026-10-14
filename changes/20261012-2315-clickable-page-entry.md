# v0.3.1 可点击页面入口

作者：项目 A 侧 / Codex；日期：2026-10-12；关联：PR #3，feat/a-core-pipeline。

## Summary

主分类 05 源代码；关联 02 使用说明、06 测试、08 证据和 11 日志。生成成功后不再要求用户从 manifest 路径推导网页位置，工具直接向模型提供互动 HTML 入口。

## Technical implementation

- `pageAccess()` 只在 `status=rendered` 时生成 `interactive_html_path`、`interactive_html_uri` 和 `open_page_markdown`；manifest 用相对 `entrypoint=interactive.html` 保持可迁移。
- WSL `/mnt/<盘符>/...` 映射为 Windows `file:///<盘符>:/...`，每个路径段进行 URI 编码；其他环境使用标准 `pathToFileURL()`。
- generate_visualization 的结构化 JSON 增加链接字段；工具描述要求最终回答单独展示 Markdown 链接并保留路径兜底，禁止只给 manifest。
- 实测发现当前 AGH 不接受工具输出中的非图像 HTML `resource_link`：文件已写入但调用结果变为 `TOOL_OUTCOME_UNKNOWN`。因此移除该资源块，继续使用当前宿主已验证的 text + structured 结果承载链接。
- 实际 HTML 内容、版权说明、来源核对、全新目录和无覆盖策略不变。

## Interfaces, configuration, and data

开发包版本由 0.3.0 更新为 0.3.1。generate_visualization 成功结果增加三个字符串字段；非 rendered 结果不返回伪链接。manifest 增加可空 `entrypoint`。没有新增依赖、网络服务、端口或配置。

## Compatibility and migration

属于向后兼容的附加字段；已有调用者可忽略。消费方应优先显示 `open_page_markdown`，无法打开本地 URI 时显示 `interactive_html_path`。本地浏览器能否从网页打开 `file:///` 由客户端安全策略决定，不能把路径存在等同于点击一定成功。

已安装 0.3.0 的 AGH 需要按现有本地包更新流程重新安装 0.3.1；不覆盖旧快照和产物。

## Verification

- `node --test tests/*.test.mjs`：27/27 通过；覆盖 WSL 路径、空格编码、成功/非成功返回、manifest entrypoint 和真实工具 text/structured 中的链接字段。
- 真实 AGH 0.3.1（integrity `sha256-291d8656fc5edb47d222f7a9426d8166fe410c58b82ebe6062fcd1e436c20e5c`）原生轮次 767–822 completed，generate 799/803 成功返回 rendered。
- 原生 trace 核验、manifest 新鲜度与全部产物 SHA-256 通过；程序确认工具的完整 Markdown 和备用路径逐字出现在模型最终回复。证据见 `evidence/agh-page-link-031/` 与 `evidence/sciviz-MxKo3r/`。
- 验证证明“模型输出中存在链接”，不把它扩大为所有客户端都允许 file URI 跳转；浏览器策略限制仍保留路径兜底。
- repository policy 与 Git diff whitespace 检查随提交执行。

## Risks and limitations

浏览器可能阻止 HTTP 页面跳转本地 file URI，远程 AGH 客户端也未必能访问执行机文件系统；绝对路径是同机使用的兜底，不是跨机下载链接。未启动本地服务器，避免引入端口生命周期和访问控制风险。链接暴露的路径与原工具既有 output_path 同等级，不包含论文正文或凭据。失败的 resource_link 探针生成了独立新目录，未覆盖任何产物；不作为成功证据。

## Rollback

用新提交恢复到 a6966df 的工具返回格式，或让消费方忽略新增字段。不得改写已推送历史、旧 changes 条目或 evidence；回退后仍可按 directory/interactive.html 手工打开。
