# 六类跨学科页面验证 / v0.3.0

日期：2026-10-12；环境 Windows Node.js 24.20.0、现有 Microsoft Edge headless。

输入为 `examples/gallery-v3/` 的六个团队原创合成教学 JSON。通过 `node examples/generate-gallery-v3.mjs` 生成新的 `outputs/sciviz-gallery-v030-*` 画廊，再逐页检查。

- 26/26 Node 测试通过（原有 20 项继续通过，新增 6 组视觉语法测试）。
- 自动识别单链、分支合流、回连/密集网络；保留全部节点和边，非法 process 强制选择不会丢掉分支。
- 柱状、折线、散点均保留输入数值；来源完整、未验证来源不阻塞，无数据时不创建数据图。
- 覆盖负值、零基线、常量数值、非均匀横轴、长标签、未知引用、NaN/Infinity、重复类别、错序折线、转义与离线约束。
- 浏览器对六页逐一检查讲解前进/后退、单关系高亮、图表系列切换、键盘精确值、完整表格、来源展开、版权页脚、390×844 手机无页面横向溢出、独立 SVG XML 可解析。
- 浏览器未出现脚本错误，HTTP/HTTPS 请求数为零。不是物理断网或任意浏览器兼容性认证。

`browser-checks.json` 是此次六页检查结果；`method.png`、`network.png`、`bar.png` 为 1600×1100 桌面截图。截图可能只展示当前视口，图形内部可滚动/缩放。

浏览器辅助依赖仅装在被忽略的 `work/browser-check/`；没有加入插件运行时。检查脚本位于本次本地 `work/preview-v030.mjs`；跨机器可用任意浏览器按以上步骤复核，不需安装此辅助依赖。

真实 AGH 工具验证另外存放在 `evidence/agh-grammar-030/`，不要将本目录的直接 Node 渲染截图冒充为宿主调用证据。
