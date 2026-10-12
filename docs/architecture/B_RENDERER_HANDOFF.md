# B 侧渲染器交接（待 A 审查，未冻结）

日期：2026-10-12。基线为 A 分支 `82f8a14`，B 分支 `feat/b-svg-interactive`。此文是开发接口交接，不是发布签收或双方契约冻结。

## 入口与行为

`src/render/index.mjs` 导出同步纯函数，无文件写入、网络、模型、时间或随机依赖：

```js
import { renderVisualization } from './src/render/index.mjs'
// A_CORE_HANDOFF_V1.md 的接口：
const { svg, html } = renderVisualization({ content, assessment })
// 原 B 临时契约也支持：
const same = renderVisualization(content, assessment)
```

正常返回 `{ svg: '<svg ...>...</svg>', html: '<!doctype html><html ...>...</html>' }`。
不足返回 `{ svg: null, html: '<!doctype html><html ...>...缺失要求、已有来源...</html>' }`，没有流程图。
无效输入抛 `RenderInputError`，`code='INVALID_INPUT'`，包含 `path` 与中文 `message`。调用方可以捕获后使用 `renderInputErrorPage(error)`，返回安全转义的 HTML 错误页，不接受错误输入来补造图形。

渲染器接受调用方的评估决定，不重复实现 A 侧证据评估，也不把 `supported` 宣称为科学验证。它负责展示前结构约束、引用存在性、文本转义。输入不修改；相同输入得到相同字符串。

## A 侧 1.0 适配

`src/render/contract.mjs` 是唯一字段适配边界，输出供 SVG 和页面共享的内部模型。

| 字段 | 1.0 契约与限制 |
|---|---|
| schema_version | 字符串 `1.0`；兼容临时 `0.1` |
| title / goal / audience | 标题最长 200，goal 最长 2000，受众仅 undergraduate |
| nodes | 3–8；唯一 ID；label ≤120，explanation ≤2000；source_refs 必须存在 |
| edges | 0–16；from/to 必须存在，不接受自环或重复有向边；label ≤120；source_refs 必须存在 |
| sources | 0–20；id、citation、locator、excerpt、verified；摘录 ≤10000，其他文本 ≤2000 |
| assessment | decision 为 supported 或 insufficient_evidence；limitations、missing_requirements 为文本数组 |
| recommended_format | supported 接受 interactive_2d/svg_diagram；不足接受 evidence_report/interactive_2d（兼容早期示例） |
| constraints | 若提供，仅接受 allow_paid=false、external_budget=0、offline_required=true；不接受其他键 |
| 扩展展示字段 | 可选 content_kind=synthetic_example/paper_excerpt、limitations、sources[].url；A 当前 normalizeInput 会丢弃这些扩展 |

长度按 JS UTF-16 code unit 计，与 A 字段上限一致；总序列化内容限制 100000 字符（A 的入口另有 100KB 字节限制）。拒绝 XML 非法控制字符与不成对代理字符。不截断标签、不丢弃节点、不补引用。空引用可以展示为“未提供”；是否证据不足由 A 决定。

`verified` 只展示“提交者标记为已核对”，不是自动验证。`0.1` 没有这个标记，显示“未提供标记”。URL 扩展仅 HTTP/HTTPS 且无内嵌凭据；其他 URL 原样作为文本显示。不存在运行时 fetch、本地 JSON 下载、CDN 或字体请求。

## 原始临时 0.1 契约（完整保留）

建议函数签名 `renderVisualization(content, assessment) -> { svg, html }`，返回字符串，调用方负责保存。以下为开发夹具，不是真实论文案例。

```json
{
  "schema_version": "0.1",
  "title": "教学合成示例：数据处理流程",
  "audience": "undergraduate",
  "content_kind": "synthetic_example",
  "nodes": [
    {"id":"n1","label":"输入数据","explanation":"准备待处理的数据。","source_refs":["s1"]},
    {"id":"n2","label":"处理数据","explanation":"按照指定步骤处理。","source_refs":["s1"]},
    {"id":"n3","label":"查看结果","explanation":"观察输出并检查限制。","source_refs":["s1"]}
  ],
  "edges": [
    {"from":"n1","to":"n2","label":"下一步","source_refs":["s1"]},
    {"from":"n2","to":"n3","label":"下一步","source_refs":["s1"]}
  ],
  "sources": [
    {"id":"s1","label":"团队编写的教学样例","locator":"示例说明第1段","excerpt":"准备数据，处理数据，再查看结果。"}
  ],
  "limitations": ["用于验证页面，不代表真实论文结论。"]
}
```

```json
{
  "decision": "supported",
  "recommended_format": "interactive_2d",
  "limitations": ["本结果只用于界面开发。"],
  "missing_requirements": []
}
```

另支持 decision=`insufficient_evidence`，显示缺失要求和已有来源，svg=null。`0.1` 的 sources[].label 仅在适配器映射成 citation；不凭空生成 verified。页面明确标注“教学合成示例”，不将这个决定写成“科学正确性已验证”。真实案例必须另行核对来源与主张。

## 运行与接入

Node.js ≥24，无新增依赖：

```powershell
node --test tests/*.test.mjs
node examples/b-side/generate-demo.mjs
node examples/b-side/generate-demo.mjs examples/b-side/content.json examples/b-side/assessment-insufficient.json
node src/cli.mjs generate examples/core-content-v1.json
```

B 脚本每次创建 `evidence/b-demo-v1-*`，含 interactive.html、可选 diagram.svg 和 report.json。第三个位置参数可指定新的输出目录，已有目录直接 EEXIST；文件使用 wx 创建。无效 JSON/结构保存错误页，进程返回 1；文件读取失败直接报错。B report 是开发夹具运行说明，不是 A 的评估报告或 AGH trace。

A 的 `loadRenderer()` 已自动发现本文件；无须改核心、CLI 或 AGH 文件。正常 A CLI 将生成 `evidence/sciviz-*/interactive.html` 和 diagram.svg，manifest 状态 rendered。A 不足路径目前跳过渲染器，只生成 JSON 报告；B 的不足 HTML 仅由独立调用/脚本生成。没有把 CLI 调用当作真实 AGH 验收。

## 布局与交互

固定纵向布局，按输入顺序摆放；相邻前向边走中线，其他边走右侧固定通道。E1…E16 与完整关系列表对应，不从关系推断因果。120 字符标签完整换行；完整解释与来源在详情面板。点击、Tab+Enter/空格、方向键、Home/End 可选择；“显示全部解释”恢复全文。禁用 JS 时全部解释仍在页面；静态 SVG 内附节点、边、摘录与限制，可独立阅读。复杂连线可能交叉，边编号和文字列表是补充，未实现通用图布局。

## 待协调与交付边界

- 请 A 审查后共同冻结 1.0 接口；B 现支持双调用形式，不表示双方已签收。
- content_kind、内容限制和来源 URL 在 A 规范化时丢失；需要 A 决定是否保留。真实论文来源类型不从标题自动推断。现有 A 夹具标题/引文明确写非真实论文，B 独立夹具有醒目标记。
- A 不足路径是否调用报告页导出，由 A 决定；当前 B 不修改 pipeline。
- 根级 UPDATES、README、CHANGELOG 仅增加 B 功能入口和未发布记录，以满足仓库治理；无依赖/脚本配置更改。
- 本次新证据目录内的 .gitattributes 固定 LF，避免 Windows 检出改变 manifest 对应的字节与哈希，不改变旧证据或根级 Git 配置。
- 真实论文核对、真实 AGH 调用、另一位成员复现、视频正式规格与录制尚需团队完成。正式版本与不可变快照留给发布流程。

验证事实见 `docs/product/B_DEMO_GUIDE.md` 的记录指引及本次 changes 条目；测试与浏览器实测分开记录。
