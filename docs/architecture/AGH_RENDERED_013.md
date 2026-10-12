# AGH 真实渲染验收记录 v0.1.3

日期：2026-10-12（Asia/Shanghai）。PR #4 的 B 侧离线渲染器已经由 A 审查并通过合并提交 `4c66175` 进入 `feat/a-core-pipeline`。本记录只证明工程调用闭环，不证明教学夹具或未来论文内容的科学正确性。

## 结论

集成包 `sciviz-agh@0.1.3` 已在现有 WSL AGH 实例完成安装、信任、启用和真实模型工具调用。包状态为 `desired=enabled actual=running trusted=true`。同一 AGH 会话中的历史 0.1.2 调用返回 `renderer_pending`；0.1.3 调用返回 `rendered`，并在全新目录 `evidence/sciviz-JnpumL/` 写入 `content.json`、`assessment.json`、`diagram.svg`、`interactive.html` 和 `manifest.json`，没有覆盖旧产物。

本次输入是仓库内明确标注的合成教学夹具，不是真实论文。`verified: true` 是提交者的人工作证标记，不是插件自动验证科学真实性。`rendered` 只表示渲染器返回了符合接口的 SVG/HTML 且文件成功落盘。

## 包与运行环境

- AGH：`agh 0.0.0`，协议 `_agnes/v1`。
- Node.js：WSL v24.21.0，沿用现有安装，没有增加第三套运行时。
- 包：`sciviz-agh@0.1.3`，MIT。
- integrity：`sha256-6018b16b2e7949c9f042dd1ef7a6472889e10ebb551f378ed84ac932586fa8dc`。
- capability hash：`e3de4e5f2da4b8aa2650af5c4f822d397c2dadd7a6695e5071c0444d26a22b01`；静态预览仍为 `contributions none`，实际工具可用性由启用状态和原生工具事件证明。
- 渲染方案：本地、离线、零新增依赖、`external_cost=0`；AGH 模型推理成本不包含在插件外部成本中。

## 原生调用证据

会话：`agnes:local:local-dev:cli:workspace:b2f3efc2a0e59b31`。成功轮从 seq 395 到 449，正常 `completed`：

- `set_sciviz_root`：call 405，result 410。
- `assess_visualization_feasibility`：call 406，result 414，decision=`supported`。
- `generate_visualization`：call 427，result 431，status=`rendered`。

`evidence/agh-rendered-013/native-tools.jsonl` 只保留上述轮次的 `turn/start`、三组 `tool/call`/`tool/result` 和 `turn/end` 原始行；未提交完整模型会话或隐藏推理。`verification.json` 由仓库核验器生成，确认调用来源、顺序、配对、无错误结果、完成状态、manifest 格式、新鲜度和 SHA-256。原始完整导出只保留在被忽略的本地 `work/` 目录。

## 产物

`evidence/sciviz-JnpumL/manifest.json` 记录 `execution_origin=agh`、`status=rendered`、`assessment_decision=supported`、`renderer_error=null`。核心渲染产物为：

- `diagram.svg`：5396 bytes，SHA-256 `d41d3c708fb339b220df3269e08c6b1dd46c723ae2d1ee35ea3161ea50b71eb5`。
- `interactive.html`：9471 bytes，SHA-256 `bf528bc5dffa33a2aaddb1f66f9ef8a5f6476ae1c1ebaa339ef01ec238b400d7`。

同一输入此前的 0.1.2 证据目录 `evidence/sciviz-IbR8bd/` 保持不变，可直接对照 `renderer_pending` 与本次 `rendered`。

## 验证范围与剩余工作

本次按时间约束保留关键验证：17 项 Node 测试、一次 CLI 实际生成、一次真实 AGH 三工具闭环、原生 trace 核验和仓库策略检查；没有重复进行大规模双平台全量测试。

仍需完成真实论文来源/主张人工核对、最终视觉验收、物理断网演示（如作为展示要求）、视频录制和正式发布快照。固定布局不是通用图布局；当前不含 PDF/OCR、3D、付费 API 或科学模拟。
