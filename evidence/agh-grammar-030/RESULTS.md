# v0.3.0 真实 AGH 验证

2026-10-12，WSL Ubuntu-26.04，Node 24.21.0。`sciviz-agh@0.3.0 desired=enabled actual=running trusted=true`；其他四个 AGH 插件保持原状态。

## 安装与调用

- 独立快照 `work/agh-runtime-030`；旧版快照与历史产物均保留。
- integrity：`sha256-a6d76be00a6e874610380233a175ddf6b86b5c017ede7b9f2d2165aa8a83acd2`。
- capabilityHash：`e3de4e5f2da4b8aa2650af5c4f822d397c2dadd7a6695e5071c0444d26a22b01`。静态预览无 contributions，实际注册和原生调用另行验证。
- 本机不允许直接覆盖同名已安装包；通过 disable/remove 旧 SciViz 登记后，重新 inspect/install/trust/enable。没有删除旧产物和快照；安装命令需交互 TTY 确认，管道输入和 --yes 不适用于该版本。
- 输入：`examples/gallery-v3/model-comparison.json`。原生调用参数与该文件逐字段一致，缺省 verified 原样传入。
- 会话 `agnes:local:local-dev:cli:workspace:b2f3efc2a0e59b31`；完成轮次 seq 573–627。
- set_sciviz_root call 583 / result 588；assess call 584 / result 592；generate call 605 / result 609。
- 生成 `evidence/sciviz-jtYJBx/`，状态 `rendered`，renderer_error=null，来源核对 pending 且 blocks_generation=false。

`native-tools.jsonl` 只保存这一轮原始的 8 条 turn/tool 事件，保留原行与配对，不保存模型消息/内部推理。完整导出只在忽略目录 work/。`verification.json` 验证宿主顺序、来源、配对和新产物；`bundle-checks.json` 验证所有产物字节与 SHA-256，并确认图表数值完整保留。

## 真实生成页面的浏览器验证

对实际 AGH HTML（非重新由 Node 渲染的替代页）执行：6 个输入数值点、系列显示切换、键盘聚焦显示 82、完整数值表、来源跳转展开、逐步讲解、单关系高亮、版权页脚、390×844 手机无文档溢出、SVG XML 解析。无 pageerror，无外部 HTTP/HTTPS 请求。

详情 `browser-checks.json`；`desktop.png` 和 `mobile.png` 来自这份实际 AGH 产物。正文与数据均明确标为合成教学示例，不可作为论文实验结论。

## 复现

在已启用插件的当前工作区运行（使用已有 AGH 启动器）：

```sh
SCIVIZ_AGH_BIN=/home/lenovo01/.local/bin/agh node ops/Run-AghProbe.mjs "$PWD" examples/gallery-v3/model-comparison.json
node ops/verify-agh-trace.mjs --ledger evidence/agh-grammar-030/native-tools.jsonl --policy ops/trace-policy.agh-core.json
```

历史 trace 含本机绝对路径；跨机器需重新运行探针，不修改历史证据。AGH 转译可能改变 HTML 字节格式，因此不承诺与 CLI 字节相等；每份 manifest 均计算实际哈希。插件免费离线不等于 AGH 模型推理免费。

本版仍是开发包，不表示 PR 已合并或正式 Release 已发布。六类渲染和科学真实性是不同验收，真实论文语义、来源支持与单位可比性仍需人工复核。
