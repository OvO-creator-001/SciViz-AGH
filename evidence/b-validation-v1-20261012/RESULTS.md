# B 侧首次验证记录

日期：2026-10-12，Windows、Node.js v24.21.0。基线 A 提交 82f8a14。最终代码版本以包含本记录的 B 提交为准。仅功能验证，无科学准确率声明。

## 自动测试

命令：`node --test tests/*.test.mjs`。最终 17 项通过、0 失败（原有 11 项 + B 侧 6 项聚合测试）。

- 正常：同步确定性、不改变输入；0.1 双参数与包装参数输出一致；A 的真实 loadRenderer + generateVisualization 返回 rendered，四个产物。
- 不足：svg=null；HTML 没有 SVG，含缺失项和已有来源；A 未确认来源输入可展示不足报告。
- 无效：不存在来源、重复节点、非法端点、重复边、节点少于 3、121 字符标签、XML 非法字符、空来源对象、未知 decision、矛盾 missing_requirements 被识别。
- 上界：8 节点、120 字符标签、非相邻回指边完整保留。
- 文本与链接：恶意标签被转义；输入不进入内嵌脚本；不启用 javascript/data/协议相对/内嵌凭据 URL；合法 HTTPS 可点击。没有远程脚本、样式、字体下载、fetch 或 innerHTML。
- 输出：新运行目录不同；已有目录 EEXIST；旧页面不变；非法 JSON 保存错误说明页，未生成 SVG。

首轮测试出现两处断言误报：把转义文本中的 onload 字样、SVG 内部 url(#arrow) 当成不安全内容。修正断言只识别实际标签属性与非片段资源引用后，全套通过；不宣称最初运行通过。

## 实际生成

- `node examples/b-side/generate-demo.mjs` → `evidence/b-demo-v1-D37AAL`，rendered。
- `node examples/b-side/generate-demo.mjs examples/b-side/content.json examples/b-side/assessment-insufficient.json` → `evidence/b-demo-v1-U7DQmY`，evidence_report。
- `node src/cli.mjs generate examples/core-content-v1.json` → `evidence/sciviz-GtIzkq`，rendered；原始 manifest 含实际文件 SHA-256。

以上目录和原始产物保留，不重写旧运行。B 的 assessment 是提供的开发夹具；A CLI 运行实际规则，均不代表 AGH 原生调用。

## 浏览器与人工检查

浏览器自动化工具未提供 Chrome 连接；内置浏览器拒绝 file:// 协议，未绕过该限制。代理没有完成浏览器自动化验收或截图验收。

用户在本机双击 `evidence/b-demo-v1-D37AAL/interactive.html`，按提示检查点击“处理数据”、方向键切换、[s1] 来源跳转，于本次对话明确回复“页面和交互均正常”。这是用户实测反馈，浏览器版本未记录。

尚未实际验证：物理断网后的浏览器加载与交互、禁用 JS 的浏览器展示、长标签/恶意文本浏览器实测、跨浏览器、屏幕阅读器。代码静态检查证明产物无远程资源依赖，不等同于上述浏览器验收。

尚未完成：真实论文内容核对、真实 AGH 调用、另一位成员复现签收、官方视频规则核对与录制。
