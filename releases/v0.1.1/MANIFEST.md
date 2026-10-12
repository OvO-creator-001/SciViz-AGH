# v0.1.1 交接清单

- 创建日期：2026-10-12（Asia/Shanghai）
- 来源：Git tag v0.1.1
- 内容：AGH 通用基础设施与原生 trace 核验
- 状态：本地验证通过；正式状态以 Git tag 与 GitHub Release 为准

## 本版本范围

- 会话隔离、工作区定位与错误分类。
- 两个 AGH 基础诊断工具。
- 配置驱动的原生 trace 及产物核验。
- Windows 与 WSL Node.js 24 离线测试，共 9 项。
- Fracta-Proof 团队原创来源与迁移边界记录。

## 验证与复现

运行 npm test 和 ops/Test-RepositoryPolicy.ps1。预期 9 项 Node 测试全部通过，仓库策略检查通过。

## 文件与校验值

发布提交、源文件及 Release 校验值以 Git tag v0.1.1 和 GitHub Release 为准。运行生成的证据由 trace 核验器输出逐文件 SHA-256。

## 已知限制

- 尚未在当前 AGH 实例上执行真实插件注册。
- 尚未实现论文评估、Tripo 调用和 Three.js 页面组装。

## 签收

- 交付人：项目发起人 / Codex
- 接手人：待指定
- 签收日期：待填写
