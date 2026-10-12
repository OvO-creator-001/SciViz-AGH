# A/B 渲染集成与真实 AGH rendered 验收

- 类别：源码集成、测试验证、证据与交接
- 日期：2026-10-12（Asia/Shanghai）
- 分支：`feat/a-core-pipeline`
- 关联：PR #3、PR #4

## Summary

审查 PR #4 的离线 SVG/HTML 渲染器后，将其合入 A 开发分支。合并代码通过 17 项测试和 CLI 实际生成；随后以开发包 0.1.3 在真实 AGH 中完成三工具调用，最终状态从历史 0.1.2 的 `renderer_pending` 变为 `rendered`。

## Technical implementation

保留 B 的集中契约适配、XML/HTML 转义、URL 白名单、固定布局 SVG 和自包含互动页；修复正常渲染路径重复执行 `renderSvg(data)` 的小问题。A 的核心评估与文件落盘逻辑不被 B 重写，`loadRenderer()` 自动发现 `src/render/index.mjs`。

包开发版本由 0.1.2 增至 0.1.3，以避免不同代码共享同一版本号。真实 AGH 使用独立 `work/agh-runtime-013` 快照安装；旧 0.1.2 先停用和移除，只替换 SciViz 包，其他 AGH 插件保持运行。

## Interfaces, configuration, and data

`renderVisualization({ content, assessment })` 返回 `{svg, html}`；兼容原 B 双参数调用。成功生成新增 `diagram.svg` 与 `interactive.html`，manifest 状态为 `rendered`；接口未新增网络、付费服务或第三方依赖。

新增不可覆盖证据目录 `evidence/sciviz-8LyTpJ/`（CLI）、`evidence/sciviz-JnpumL/`（AGH）和 `evidence/agh-rendered-013/`（最小原生事件摘录与核验结果）。根级 `.gitattributes` 将这些证据按原始字节保存，避免换行转换破坏 manifest 哈希。

## Compatibility and migration

Node.js 仍要求 24 或更高，AGH 清单仍使用 `package.json` 的 `agnes.plugins`。没有修改既有发布快照、tag 或旧证据；旧 0.1.2 `renderer_pending` 记录保留用于对照。0.1.3 是未发布开发包，不等同于 GitHub Release。

## Verification

- `node --test tests/*.test.mjs`：17/17 通过。
- `node src/cli.mjs generate examples/core-content-v1.json`：生成 `evidence/sciviz-8LyTpJ/`，status=`rendered`。
- 真实 AGH：`sciviz-agh@0.1.3 desired=enabled actual=running trusted=true`。
- 原生轮次 seq 395–449：三次工具调用均成功；generate result seq 431 为 `rendered`。
- `ops/verify-agh-trace.mjs`：`verified=true`，manifest SHA-256 为 `9f4aa1b213f24e7363bc9ad9946a5e014349b2642abe8d77a1b6ffaa89f8516c`。
- 提交前运行仓库策略、Git whitespace 和差异检查。

## Risks and limitations

当前输入为合成教学夹具，不是真实论文；未自动验证科学主张。`rendered` 证明调用与落盘，不代替视觉验收。固定布局在复杂边关系中可能交叉；真实论文复核、最终视觉验收、物理断网演示、录屏和正式发布仍未完成。

## Rollback

对本次集成提交执行新的 `git revert`，保留历史提交、技术日志和证据目录。若移除 `src/render/index.mjs`，A 的 loader 会回到 `renderer_pending`，不需要改写旧 0.1.2 记录或强推历史。
