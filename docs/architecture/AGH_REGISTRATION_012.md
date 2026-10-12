# AGH真实接入验收记录 v0.1.2

2026-10-12（Asia/Shanghai）。这是对A_CORE_HANDOFF_V1.md中接入阻塞的后续解决记录，旧文档保留历史。

## 结果

在现有WSL AGH实例完成inspect、install、trust、enable，实际状态为sciviz-agh@0.1.2 desired=enabled actual=running trusted=true。随后真实模型会话执行set_sciviz_root、assess_visualization_feasibility、generate_visualization，均成功。

评估返回supported，生成返回renderer_pending并写入evidence/sciviz-IbR8bd/；没有渲染器，未生成SVG/HTML。此次仅验证A侧接入，不宣称科学论文或完整页面验收完成。输入是已明确标注的合成教学夹具。

## 阻塞根因与修复

绝对file:路径不符合本机协议，仅支持file:./相对路径；相对来源按守护进程workspace source解析。通过/proc/<daemon PID>/cwd确认该实例源目录为本项目，准备work/agh-runtime-012-mit独立快照后检查成功，无需重启实例。

初次UNLICENSED快照安装成功但trust被拒绝。查本机trust-gate.ts确认许可证白名单不含UNLICENSED。项目负责人明确授权采用MIT后，新增LICENSE、package.json改MIT并将开发版本改0.1.2。原未启用SciViz快照被移除，新快照重新安装；仅处理本项目包，没有改动其他插件或公开仓库。

本次安装integrity为sha256-0acd234e6b6b87f5f62c8836fb8ea6fbbea63530c45024291d9024f5d0cec2be；能力哈希e3de4e5f2da4b8aa2650af5c4f822d397c2dadd7a6695e5071c0444d26a22b01。preview显示contributions none是当前静态预览；真实工具是否可用由启用和工具调用事件证明。

## 原生证据

会话：agnes:local:local-dev:cli:workspace:b2f3efc2a0e59b31。
宿主：agh 0.0.0，Node 24.21.0，协议_agnes/v1。
使用当前实例已有模型deepseek-flash，没有强制切换模型或购买新额度。本次成功工具会话CLI估计credits used=0.000944，source=estimated；不是现金报价或精确账单。插件本身external_cost=0仅指插件没有外部服务请求。

原始会话由agh export --raw导出到本地work/；仓库只保存最后完整轮次的turn/start、tool/call、tool/result、turn/end原始行，保持原seq、origin、timestamp和配对引用，未重写事件。滤除了模型请求/响应和其他会话内容；这是原生工具事件摘录，不是整段会话或内部思维链。

- turn/start seq=336，turn/end seq=390（completed）。
- set_sciviz_root call=346、result=351。
- assess_visualization_feasibility call=347、result=355。
- generate_visualization call=368、result=372。
- calls的origin=model，results对应tool:<工具名>且isError=false。
- 核验器已验证同轮配对、调用顺序、成功结果及本轮新产物JSON。

文件：evidence/agh-registration-012/native-tools.jsonl、verification.json；实际新产物在evidence/sciviz-IbR8bd/。证据含本机路径，在别的机器需要按当地根重新执行探针，不应改写历史轨迹中的路径。

## 复现

使用已有Node/AGH，不重新安装运行时。在AGH守护进程认可的workspace source中准备新的插件快照目录，不覆盖旧目录。依次：
agh package inspect file:./<快照目录>
agh install file:./<快照目录>
agh package trust sciviz-agh <实际integrity> <实际capabilityHash>
agh package enable sciviz-agh
agh package status

安装需确认当前代码哈希；更新代码之后哈希必须重新检查，不能照抄本次哈希。

在目标项目根运行node ops/Run-AghProbe.mjs；若agh未在PATH，将SCIVIZ_AGH_BIN设为现有启动器绝对路径。脚本直接传参数，避免PowerShell→WSL嵌套引号让prompt变成单个词。当前AGH的standalone模式曾返回INTERNAL_ERROR，正式探针使用正常CLI工作区会话。

导出本地原生轨迹后，以最后成功轮的工具事件摘录核验：
node ops/verify-agh-trace.mjs --ledger evidence/agh-registration-012/native-tools.jsonl --policy ops/trace-policy.agh-core.json --out <新的核验输出.json>

现有历史输出禁止覆盖。核验必须在此次Linux根路径有效的环境执行；跨机交接优先重新运行探针。

## 任务状态与剩余事项

A02真实基础工具与业务接入已通过；A04共享核心及AGH调用已通过，渲染端尚待接入；A05原生trace配对和新产物核验已通过。B接口确认、真实论文科学语义复核、页面联调与视频仍未完成。本次按用户要求集中AGH，不实现B侧功能。

Windows核心测试11/11通过，AGH原生工具核验通过。没有增加大规模标定或重复全量平台测试。0.1.2目前仅开发包版本，不新建/移动已发布tag，不声称已经发布正式Release。MIT授权用于项目源码，不替第三方论文/数据授予使用权。
