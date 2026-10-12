# A侧核心与B侧交接契约 v1

日期：2026-10-12。A侧首批实现；B侧尚未确认，不宣称双方已冻结接口。

## 已实现

src/core/assessment.mjs：规范化JSON输入、来源引用检查、免费离线约束；返回supported或insufficient_evidence。verified是提交者的人工确认标记，不是算法对科学真实性的证明。无证据引用/未确认来源返回不足；不存在的引用和不合法输入抛INVALID_INPUT。

src/core/pipeline.mjs：每次在工作区evidence/sciviz-*新目录保存content.json、assessment.json、manifest.json，包含文件哈希、状态和执行来源。生成代码无网络调用。缺证据不执行渲染器。

src/cli.mjs：assess/generate共用核心。src/agh/index.mjs注册两个业务工具，工具以content_json字符串接收同一契约，写入工具replay=never且仅在绑定工作区新建目录。基础工具仍保留。

## B方直接使用

1. 从examples/core-content-v1.json开始；这是合成教学夹具，不是真实论文。用核实过的论文替换citation、locator、excerpt、节点和边，不能只换标题。
2. 实现src/render/index.mjs，导出异步或同步renderVisualization({content, assessment})，返回{svg: string, html: string}。这是受信任的本地代码接口，不接受用户指定模块路径。
3. content含schema_version=1.0、title、goal、audience=undergraduate、sources、nodes、edges、constraints。节点3—8，边最多16。每个节点和边用source_refs关联sources[].id。label最长120字，解释最长2000字。输入不允许付费或在线模式。
4. B负责转义输入文本、离线资源、来源面板、实际渲染有效性和交互；A只检查字符串类型及基础签名，不将签名检查视为页面验收。
5. 无渲染器返回renderer_pending并保存JSON；缺证据返回evidence_report；渲染异常返回renderer_failed并保留报告；只有渲染器返回SVG和HTML且文件保存后才返回rendered。

运行：node src/cli.mjs assess examples/core-content-v1.json
运行：node src/cli.mjs generate examples/core-content-v1.json
验证：node --test tests/*.test.mjs

产物output_path指manifest.json，不是HTML；实际页面为同目录interactive.html。CLI记录execution_origin=cli；AGH工具上下文记录agh，但仅这一字段不能证明真实宿主调用，仍需原生trace。

## A侧状态与精简验证

A01契约草案已实现，待B确认；A03已实现结构和来源检查；A04核心/CLI与业务工具代码已实现，待真实宿主和B联调；A05最小清单已实现，真实trace适配仍待实际事件。A06完成一次关键本地测试，不宣称冻结后的验收完成。A07录像和A08双人交付尚未开始。

2026-10-12 Windows Node测试11/11通过（含9项已有测试及2项聚合核心测试）。新增重点为正常、缺证据、非法引用、禁止付费、重复生成、缺证据跳过渲染、渲染异常和接口成功替身。不增加大规模标定、双平台重复全量运行或视觉测试。CLI实际生成evidence/sciviz-3BhKup/，状态renderer_pending，未生成页面。

## AGH探针结果与下一步

WSL已有agh 0.0.0、Node 24.21.0、协议_agnes/v1；守护进程运行，内置扩展可用。没有安装新运行时。

尝试package inspect绝对file路径触发/source Expected union value；查本机协议发现只接受file:./相对路径。改用相对路径后返回The package source could not be accepted。官方本机docs/guide/packages.md明确相对file路径相对守护进程workspace source解析，不相对CLI当前cwd。因此尚未检查/安装/信任/启用本插件，也未产生真实业务调用trace。

下一步应确认当前daemon来源目录，在认可的来源目录准备本插件不可变快照，或使用隔离AGH实例启动目录；然后inspect、审查实际hash和能力、安装、信任、启用，最后实际调用。不要重启或替换已有实例以冒险绕过问题。A02保持未完成；需要接入环境协调，不把替身测试记作宿主验收。

## 已知限制

不解析PDF，不判断引文与科学结论是否语义一致；需人工核对。没有自动布局和B侧渲染。渲染器是受信任同进程函数，当前无进程级硬超时；若B渲染不受控须另加隔离。独立目录与wx防常规覆盖，不声称防御恶意本地并发文件系统攻击。包版本暂为未发布开发态0.1.1，正式交接前另定新版本，不移动旧tag。
