# v0.3.1 真实 AGH 页面入口验证

日期：2026-10-12；WSL Ubuntu-26.04、Node 24.21.0、现有 AGH 实例。输入为团队原创 `examples/gallery-v3/evidence-tree.json`，没有 verified。

## 结果

- `sciviz-agh@0.3.1 desired=enabled actual=running trusted=true`；其他四个插件未改动。
- 最终安装快照 integrity：`sha256-291d8656fc5edb47d222f7a9426d8166fe410c58b82ebe6062fcd1e436c20e5c`；capability hash：`e3de4e5f2da4b8aa2650af5c4f822d397c2dadd7a6695e5071c0444d26a22b01`。
- 原生轮次 seq 767–822 completed；set root 777/782、assess 778/786、generate 799/803，均 `isError=false`。
- 实际输出 `evidence/sciviz-MxKo3r/`，`status=rendered`、`entrypoint=interactive.html`、来源核对 pending/nonblocking；全部产物 SHA-256 复核通过。
- 工具返回 `/mnt/c/.../interactive.html` 路径、Windows `file:///C:/.../interactive.html` URI 及完整 Markdown。
- 模型最终回复逐字包含工具返回的 `[打开互动页面](file:///C:/...)`，单独成行；也包含绝对路径备用入口，没有只给 manifest。
- `link-checks.json` 程序化验证上述字段、文件存在、WSL→Windows 映射、模型输出包含关系。`verification.json` 验证原生调用来源、顺序、配对、完成状态和 manifest 新鲜度/哈希。

## 兼容性探针

第一次实现尝试在工具结果增加 `text/html` 的 `resource_link`。当前 AGH 已实际执行并写出页面，但宿主将结果投影为 `TOOL_OUTCOME_UNKNOWN`，模型无法获得结构化结果。因此正式实现移除该块，沿用已验证的单一 text 内容块，并把链接作为 structured/text JSON 字段返回。第二次调用成功，最终回复展示链接。

失败探针产物和完整原生导出保留在未提交的本地 evidence/work 中用于排查，不作为成功证据，也未覆盖任何旧目录。本证据只提交成功轮的 8 条原始 turn/tool 事件，不含模型完整消息或内部推理；最终回复仅由 `link-checks.json` 记录布尔检查与实际链接。

## 使用边界

`file:///` 是否可点击由客户端 Markdown 渲染和浏览器安全策略决定。该 URI 已指向同一 Windows 主机的真实文件；若点击被禁止，模型同时显示 `interactive_html_path`，可复制到资源管理器打开。本实现不启动 HTTP 服务、不开放端口，也不是跨设备下载方案。

插件生成成功和可打开不表示来源已核对、科学主张已认证或获得版权授权；页面末尾仍显示版权与使用说明。
