# 0.4.2 可分发 ZIP 与用户安装说明

- 类别：运维、产品、版本；脚本、说明与清单共同交付同一安装包。
- 作者：miku / Codex
- 日期：2026-10-13，Asia/Shanghai
- 关联：用户要求打包给其他 AGH 用户安装；feat/b-research-modes / PR #5。

## Summary / 摘要

新增 releases/v0.4.2/sciviz-agh-0.4.2.zip、外置 README.md、ZIP SHA-256 和 MANIFEST.md。ZIP 内同样包含 README、运行源码、许可证、接口说明及教学演示。无需访问私有仓库或安装 npm 依赖。

## Technical implementation / 技术实现

ops/Build-PluginZip.ps1 复制指定运行文件及说明，用系统 ZIP 库打包，生成逐文件校验值；目标目录已存在则拒绝覆盖，源代码有未提交变更也拒绝打包。ops/Verify-PluginZip.mjs 验证解压文件清单、哈希、运行源码一致性、9个工具注册、SVG/HTML和10幅教学图生成、README一致性。仅使用现有 PowerShell/.NET 与 Node.js。

## Interfaces, configuration, and data / 接口、配置与数据变化

不改插件运行代码、版本、接口或权限。代码提交9964da2750e6082acabe7c01ab74e12a01c04d87。包内36个文件，ZIP 102220字节。SHA-256：d2ff8a407262135516d8ad5e802a327324833d348ccbf9d9dc0c07f847ff4d0e。此哈希与 AGH 安装预览包摘要不是同一概念。

## Compatibility and migration / 兼容性与迁移

核对当前 AGH 源码本地来源语义：先解压到后台工作目录的 plugins/sciviz-agh-0.4.2，再以 file:./plugins/sciviz-agh-0.4.2 检查、安装、信任及启用。不能直接输入 ZIP 绝对路径。现有用户使用“从新来源更新”，保留旧快照；工作目录不一定等于程序目录。文档含源码版 CLI 备选步骤及宿主版本边界。

## Verification / 验证

- `./ops/Build-PluginZip.ps1`：生成新目录及上述ZIP。
- 用系统 ZipFile.ExtractToDirectory 解压到 tmp/package042-smoke（新目录）。
- `node ops/Verify-PluginZip.mjs tmp/package042-smoke/sciviz-agh-0.4.2`：36文件校验、清单、9工具、渲染及README检查通过。首次校验器漏列仓库原有 src/.gitkeep，补充允许该占位文件后通过；未修改或覆盖ZIP。
- 对已存在的输出目录再次构建会拒绝，ZIP哈希保持不变。
- 包中运行源码与已完成36项测试、真实Host检索及浏览器离线验收的0.4.2源码逐字节一致；本轮不重复模拟论文分析。

## Risks and limitations / 风险与限制

解压包检查不是其他电脑的 AGH 实际安装验收，需接收者按README确认running。未保证所有宿主版本；权限仍由AGH管理。分发包含教学示例和公开教材摘录，不含用户论文、草稿、凭据或依赖缓存。打包脚本保留临时构建目录供复核。没有发布 GitHub Release/tag 或合并PR。

## Rollback / 回滚

本轮不更改本机已运行插件。用户安装后如需回退，使用AGH插件管理的回滚并核对实际版本；保留旧来源。发布目录只新增不覆盖，后续纠正需新版本快照。
