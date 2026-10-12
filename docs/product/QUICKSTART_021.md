# v0.2.1：直接生成与科学图解

SciViz 将输入资料整理成有来源的科学关系图；先生成可查看的结果，再提示来源核对与版权事项。当前默认免费、离线 SVG/HTML，不需要图像生成 API。

## 三分钟试用

在仓库根目录运行（Node.js 24+）：

```powershell
node src/cli.mjs generate examples/wave-explainer-v2.json
```

命令返回新 `evidence/sciviz-*` 目录。在其中双击 `interactive.html`：上半部是可调相位的波形示意，下半部是关系图和解释。点击概念突出显示上下游，点击关系查看两端；可缩放，也可用 Tab、回车及方向键操作。静态 SVG 也保留公式示意、解释和来源。

示例是团队原创理想化教学材料；故意不填写 `verified`。输出应为 `rendered`，同时 `source_review.status=pending`、`blocks_generation=false`。它不是论文实测数据，也不意味着科学真实性已自动验证。

## 在已启用插件的 AGH 中

> 使用 SciViz，将 examples/wave-explainer-v2.json 的内容直接生成互动页面。保持来源字段原样，不补写 verified，不等待人工核对。完成后给出 interactive.html 路径，以及返回的版权和来源核对提示。

`generate_visualization` 内部已经执行评估，可以直接调用；仅在需要单独查看评估时才先调用 `assess_visualization_feasibility`。自动发现工作区失败时再绑定根目录。AGH 自身读取材料的行为由宿主决定；本次移除的是 SciViz 对人工核对标记的阻塞。

## 当前接口变化

`schema_version` 仍为 `1.0`。`sources[].verified` 为可选布尔值，缺省按 `false` 记录。`false` 和省略值均不阻止生成，也不会被自动改为 `true`。空来源引用、不存在的来源、非法边仍需修正；插件不凭空补造依据。

保留可选 `content_kind`（`synthetic_example` 或 `paper_excerpt`）、内容 `limitations` 和 `sources[].url`，避免上游分类与来源链接在规范化时丢失。来源链接只在点击时联网。

可选科学示意模板：

```json
"illustration": {
  "kind": "wave_interference",
  "phase_degrees": 60,
  "source_refs": ["s1"]
}
```

只有材料明确讨论同频、等振幅线性波叠加时使用这个模板；相位范围 0–360°。输入来源必须说明公式或假设。程序绘制 `sin(x)`、`sin(x+φ)` 及其和，纵轴比例一致；180° 的和为零。当前只实现这一个科学示意模板，其他材料使用改进后的关系图，不能承诺任意论文都会自动变成专业定制插图。

## 版权与科学核对

工具返回、assessment、manifest、HTML 页脚和独立 SVG 中都有版权说明，提示权利归属、复制/改编/传播风险、许可与署名责任，并明确声明不能代替授权或自动免责。来源核对和版权授权是不同事项，`verified=true` 从不表示获得版权许可。

## 视觉范围

采用深色画布、青/蓝/紫/金分色、公式与曲线、克制标注；借鉴数学科普图解的视觉原则。通用图按连接关系分层，分支并排、合流共层，回连使用虚线侧通道；关系文字直接写在连线上，关联节点和边可以单独突出显示。层级和回连标记仅用于布局，不额外推断因果或物理含义。

节点仍限制为 3–8 个、边最多 16 条。复杂高密度图仍可能有连线交叉，选择节点或关系可减少视觉干扰。当前未实现任意论文的插图规划、通用数学公式排版或视频动画。
