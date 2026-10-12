# AGH 插件基础设施

本阶段只迁移与业务无关的平台能力，不实现论文评分或 3D 生成业务。

## 组件

- src/agh/session-state.mjs：按 session.key 隔离状态并在会话关闭时清理。
- src/agh/workspace-discovery.mjs：环境变量、当前工作区父链和显式允许的有界搜索。
- src/agh/errors.mjs：区分可由模型调整的错误与必须由用户修复的环境错误。
- src/agh/index.mjs：AGH 插件最小入口，目前只注册工作区设置与检查工具。
- ops/verify-agh-trace.mjs：基于 AGH 原生 JSONL 事件的可配置证据核验器。

## 设计边界

- 不复制 Fracta-Proof 的分形、渗流、孔隙率、HUD 或数值阈值。
- 不把模型自然语言自述当作成功证据。
- 不记录或暴露模型不可验证的内部思维链；trace 只保存结构化决策依据、工具调用、参数、错误、重试和产物证据。
- 自动搜索只会遍历调用方明确提供的 SCIVIZ_SEARCH_ROOT，不会默认扫描整个主目录。
- 所有搜索有深度和目录枚举预算，避免昂贵或越权遍历。

## 当前工具

### set_sciviz_root

把当前会话绑定到含 package.json、src/ 和 docs/ 的仓库根。绑定不落盘，也不影响其他会话。

### inspect_sciviz_workspace

只读检查当前会话的工作区绑定；顺序为：

1. 当前会话显式设置；
2. SCIVIZ_ROOT / AGH_WORKSPACE；
3. 会话工作区及其父目录；
4. 用户显式设置 SCIVIZ_SEARCH_ROOT 后的有界搜索；
5. 明确返回失败及实际检查位置。

## trace 核验策略

ops/trace-policy.example.json 是目标 3D 工作流的策略草案。核验器可检查：

- 事件序号严格递增；
- 工具调用必须由模型发起；
- 调用和结果必须唯一配对、同一轮完成并互相引用；
- 指定工具必须按顺序出现并成功；
- 故障注入后必须出现指定错误码和成功重试；
- 产物必须为本轮新生成，并通过格式签名、大小及 SHA-256 检查。

命令示例：node ops/verify-agh-trace.mjs --ledger evidence/session.jsonl --policy ops/trace-policy.example.json --out evidence/verification.json

输出文件使用独占创建，已存在时拒绝覆盖，以避免证据被静默改写。

## 兼容性状态

基础结构来自团队原创 Fracta-Proof v0.3.8 的验证经验，但已经去除业务耦合并重新实现。原实现验证环境为 AGH developer preview、WSL2 Ubuntu 和 Node.js 24。当前代码使用 Node.js 24 运行离线单元测试；在接入业务工具前仍需针对当前 AGH 实例执行真实注册探针。
