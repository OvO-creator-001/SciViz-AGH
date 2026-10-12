# v0.2.1 实际验证记录

2026-10-12（Asia/Shanghai）。输入 `examples/wave-explainer-v2.json` 为原创教学示例，sources 中没有 verified。未把来源核对标记自动改成 true；规范化后 false 仅表示待核对。

## 结果

- Windows Node 24：20/20 测试通过。覆盖缺省/false verified、非法类型、引用缺失、无覆盖生成、来源类型与 URL 保留、版权字段、分层/分支/回路及长标签、安全转义、相位抵消等。
- WSL Node 24.21.0，AGH 0.0.0 / `_agnes/v1`：`sciviz-agh@0.2.1 desired=enabled actual=running trusted=true`。
- 包 integrity：`sha256-ffaa07cfb5761be549c06cade2617513e919c61cc14ff7a12e25e7397acbe4ad`；静态 capability hash：`e3de4e5f2da4b8aa2650af5c4f822d397c2dadd7a6695e5071c0444d26a22b01`。
- 原生轮次 514–568 completed：set_sciviz_root 524/529；assess_visualization_feasibility 525/533；generate_visualization 546/550，所有结果 isError=false。
- 输出 `evidence/sciviz-DlxoRp/` 为 rendered，source_review.status=pending，blocks_generation=false，renderer_error=null；返回与页面均附版权说明。
- 原生 trace 只摘录该轮的 8 条边界/工具事件，保留原行；没有提交模型消息或完整会话。
- `verification.json` 核验配对、来源、顺序、完成状态及本轮 manifest 的新鲜度与哈希；`bundle-checks.json` 核验全部产物字节和哈希，并确认原生输入没有 verified。

## 真实产物浏览器验收

使用本机已有 Microsoft Edge（headless）和仅位于忽略目录 work/ 的 playwright-core 检查 **AGH 实际生成的 HTML**；插件未增加运行时依赖，也未下载浏览器。

1. 1440×1050 桌面打开页面，无 pageerror。
2. 点击波 A：高亮节点及两条相关边；方向键切到波 B。
3. 点击单一关系：只有该边高亮，并显示两端概念说明。
4. 滑块设为 180°：合成振幅为 0.00，所有采样点位移为零。
5. 缩放至 125%，恢复适应宽度；来源链接可展开对应资料。
6. 390×844 移动视口：页面无横向溢出，波形区可独立横向滚动保持文字可读。
7. HTML 页脚显示版权与使用说明；独立 SVG 无 XML 解析错误，包含波形图。
8. 整个操作期间 HTTP/HTTPS 请求数为 0；这是浏览器请求观察，未宣称物理断网测试。

`desktop.png`、`relations.png`、`mobile.png` 来自这份实际 AGH HTML。静态截图中的公式与波形不是论文实测数据。

## 复现与限制

在已启用相同包的 WSL 工作区运行：

```sh
SCIVIZ_AGH_BIN=/home/lenovo01/.local/bin/agh node ops/Run-AghProbe.mjs "$PWD" examples/wave-explainer-v2.json
node ops/verify-agh-trace.mjs --ledger evidence/agh-atlas-021/native-tools.jsonl --policy ops/trace-policy.agh-core.json
```

第二条历史核验仅适用于原 trace 的 Linux 绝对路径仍有效且保留原产物时间的环境；另一台机器优先重新生成新证据，不改写旧 trace。插件本身外部费用为零，AGH 模型推理不包含在此费用中。

开发态 0.2.0 在 AGH 中虽生成文件，但浏览器验证发现导入函数引用被宿主转换，导致波形初始化失败；该产物未作为本版验收交付。0.2.1 显式传入浏览器函数依赖修复，已对真实产物复测。AGH 转换会添加分号，因此其 HTML 可与直接 Node CLI 的 HTML 字节不同；各自 manifest 记录真实哈希，不承诺跨宿主字节一致。旧版/新版 HTML 的差别来自代码变化，不是生成时间戳。

这是工程与教学模型验证；未验证任意论文的科学主张或版权授权。专用示意目前仅支持线性波叠加；其他主题使用通用关系图。
