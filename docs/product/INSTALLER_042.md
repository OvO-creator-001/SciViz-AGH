# SciViz-AGH 0.4.2 图形安装助手

适用于 Windows 10/11 中运行的 AGH，包括直接从 PowerShell 启动，以及通过 WSL / Ubuntu 启动。下载 `SciViz-AGH-0.4.2-Setup.exe` 后双击即可；插件 ZIP 已内置，无需另装 Node.js、Python、Git 或编译器。运行依赖 Windows 自带的 .NET Framework 4.x。

## 使用方法

1. 先按平常方式启动 AGH，再双击安装助手。
2. 等待“自动查找”。WSL 候选优先显示“正在运行的 AGH 后台工作目录”；其他候选标明是程序目录，需要与你启动后台的位置核对。
3. 选择正确环境和目录，点击“解压插件到此目录”。助手会创建 `plugins` 并将内置包解压到 `plugins/sciviz-agh-0.4.2`，检查包和文件哈希。
4. 点击“复制来源”，打开 AGH → 设置 → 插件管理，粘贴来源、检查并安装，再按 AGH 页面提示信任、启用。
5. 确认插件实际运行版本为 0.4.2，状态 `running`、`trusted`。解压完成只是准备本地来源，不等于已经在 AGH 中启用。

正常来源为 `file:./plugins/sciviz-agh-0.4.2`。若该目录已有不同文件，助手保留原目录，生成带时间与随机后缀的新目录；此时请使用助手实际显示的来源，不要手动删去后缀。若内容完全相同，直接复用。

## 不同电脑怎样定位

- Windows：从当前用户目录、桌面、文档、本地应用目录、固定磁盘的常见开发目录及进程脚本位置进行有限深度搜索。不会写死开发者用户名或盘符。Windows 程序目录仅作为候选，因为不能可靠地从普通进程列表得知后台工作目录。
- WSL：枚举本机发行版，不要求必须叫 Ubuntu；在发行版内读取 AGH `daemon.mjs` 进程的 `/proc/.../cwd`，优先展示实际工作目录。也扫描用户目录和 `/opt`、`/srv`、`/usr/local/share` 内的源码候选。查询可能启动尚未运行的发行版。
- WSL 中位于 Windows 磁盘的路径通过 `wslpath` 转换，适配挂载位置；Linux 自有文件系统使用对应发行版的网络路径访问。
- 自动查找不到时：先选环境，再填写后台实际工作目录。Windows 用“选择文件夹”；WSL 填 `/home/你的用户名/...` 这样的绝对路径。不要填写 ZIP 文件、插件子目录或网页地址。

AGH 的“程序安装目录”“后台工作目录”“会话资料目录”可能不同。本助手在选定的后台工作目录下创建 `plugins`，而不是去搜索某个固定存在的全局插件目录。找不到候选时不会自行猜测后写入。

## 常见情况

| 情况 | 处理 |
|---|---|
| 多个后台或发行版 | 选择当前 AGH 页面所连接后台的环境和工作目录 |
| WSL 目录不可访问 | 确认该发行版可正常启动；重新扫描或手动输入 Linux 路径 |
| 目录无写权限 | 选择当前用户可写的实际工作目录，或按自己的部署方式处理权限 |
| AGH 提示找不到 file 来源 | 再确认后台启动目录；当前 PowerShell 的目录不一定是已运行后台的目录 |
| 相同版本已装 | 同文件复用；不同文件生成新来源，随后在 AGH 中选择从新来源更新 |
| Windows 提示发布者未知 | 此 EXE 尚未代码签名；请核对来源和同目录 SHA-256，不必为安装关闭系统安全功能 |
| 纯 Ubuntu / 远程 Linux | Windows EXE 不在纯 Linux 上原生运行；手动将原 ZIP 解压到远端后台工作目录的 plugins，再在该 AGH 中安装 |

插件不会绕过 AGH 信任与权限机制。可先打开提交包中的离线示例，无需模型账户。完整使用方法见原插件 README；图形助手不改变插件版本或运行行为。

## 构建与验证

源文件：`ops/installer/Installer.cs`、`Diagnostics.cs`、`discover-wsl.sh`。Windows 构建命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ops/installer/Build-Installer.ps1 -PackageZip 路径\sciviz-agh-0.4.2.zip -OutputDirectory 新输出目录
```

输出目录不得已有同名 EXE，避免覆盖发布文件。构建使用 Windows .NET Framework C# 编译器，不下载额外依赖。EXE 内嵌 ZIP、SHA-256 和只读 WSL 查找脚本。

开发验证接口：`--scan 报告文件`、`--self-test 报告文件 [发行版名称]`。自测使用新建临时目录，覆盖 Windows、WSL 原生文件系统、WSL 挂载的 Windows 目录、中文/空格/单引号路径、重复安装及修改文件保留、ZIP 越界与篡改拒绝。样例目录保留供核查，不删除用户目录。

当前已在本机 Windows + Ubuntu-26.04 实测；其他发行版和 AGH 启动布局使用自动候选加手动选择方式适配，不承诺检测所有定制部署。
