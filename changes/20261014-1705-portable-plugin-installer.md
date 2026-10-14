# SciViz-AGH 0.4.2 portable installer

作者：团队 / Codex 辅助；日期：2026-10-14。类别：运维与产品交付。插件保持0.4.2；安装助手自身版本1.0.0。

## Summary

增加内嵌0.4.2插件ZIP的Windows图形EXE，支持Windows目录候选、WSL后台工作目录发现、手动选择和无覆盖解压；同步安装说明、桌面提交目录和ZIP。

## Technical implementation

`ops/installer/`提供C# WinForms源码、诊断入口、只读Bash发现脚本和PowerShell构建脚本。Windows有限深度扫描及进程入口仅标候选；WSL枚举发行版，读取AGH daemon进程cwd。通过wslpath映射挂载盘，否则使用WSL网络路径。用户确认目录后创建plugins，暂存提取并检查ZIP和文件SHA-256，成功后移动为最终目录。相同内容复用，不同内容保留并生成新目录。拒绝路径穿越、盘符注入、重复条目、符号链接条目和异常包规模。

## Interfaces, configuration, and data

无模型API变化。EXE依赖Windows .NET Framework 4.x，内置精确0.4.2 ZIP；不要求用户安装编译工具。图形界面输出AGH的file:./来源。新增诊断参数--scan、--self-test、--install、--ui-smoke。读取进程命令行仅用于识别入口，不输出完整命令行、凭据或环境变量。

## Compatibility and migration

适配Windows PowerShell启动以及Windows上的WSL/Ubuntu；发行版名、用户目录和磁盘不硬编码。纯Linux/远程Linux继续使用原ZIP手动安装。仍需在AGH界面安装、信任和启用。已有安装目录保留，提供新来源以更新。

## Verification

真实Windows、Ubuntu-26.04 Linux文件系统和WSL挂载Windows目录均通过解压、哈希、重复复用和已有修改保留检查。中文、空格和单引号路径通过；损坏文件、ZIP越界与非法根路径拒绝。实际发现本机运行中AGH后台cwd并完成插件解压。WinForms界面离屏绘制检查通过。原插件业务代码未变；不将安装助手检查当成重新完成模型端到端验证。

## Risks and limitations

Windows启动目录无法仅由普通进程列表可靠得知，必须核对候选。WSL发现针对daemon.mjs形态，定制布局可手选；查询可能唤起发行版。EXE未代码签名。无权限、失效挂载等按错误显示。自动检查失败的随机暂存目录可能保留，不覆盖用户文件。

## Rollback

使用既有ZIP与原安装方式；AGH已有插件配置未被助手自动修改。桌面更新前完整备份原项目目录与ZIP；源码通过Git提交保留，发布二进制使用新的版本目录，不覆盖旧版。
