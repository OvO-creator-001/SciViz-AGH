param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pkg = Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json
$version = $pkg.version
if ($version -ne '0.4.2') { throw 'Update the version-specific README and demo before packaging another version.' }
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repo "releases/v$version" }
$out = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $out) { throw "Output exists; refusing overwrite: $out" }
$head = (& git -C $repo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot read source commit' }
$dirty = & git -C $repo status --porcelain -- package.json src ops/verify-agh-trace.mjs
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Commit runtime changes before packaging' }
$stage = Join-Path ([IO.Path]::GetTempPath()) ('sciviz-package-' + [guid]::NewGuid().ToString('N'))
$name = "sciviz-agh-$version"
$root = Join-Path $stage $name
New-Item -ItemType Directory -Path $root | Out-Null
foreach ($entry in @('package.json','LICENSE','src')) { Copy-Item -LiteralPath (Join-Path $repo $entry) -Destination $root -Recurse }
foreach ($dir in @('ops','docs','demo')) { New-Item -ItemType Directory -Path (Join-Path $root $dir) | Out-Null }
Copy-Item -LiteralPath (Join-Path $repo 'ops/verify-agh-trace.mjs') -Destination (Join-Path $root 'ops')
Copy-Item -LiteralPath (Join-Path $repo 'docs/product/INSTALL_README_042.md') -Destination (Join-Path $root 'README.md')
Copy-Item -LiteralPath (Join-Path $repo 'docs/architecture/ANALYSIS_WORKFLOW_040.md') -Destination (Join-Path $root 'docs')
foreach ($file in @('interactive.html','diagram.svg')) { Copy-Item -LiteralPath (Join-Path $repo "evidence/b-research-042/$file") -Destination (Join-Path $root 'demo') }
$hashes = @(Get-ChildItem -LiteralPath $root -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($root.Length + 1).Replace('\','/')
    '{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $relative
})
[IO.File]::WriteAllText((Join-Path $root 'CHECKSUMS.sha256'), ($hashes -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
New-Item -ItemType Directory -Path $out | Out-Null
$zip = Join-Path $out "$name.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
Copy-Item -LiteralPath (Join-Path $root 'README.md') -Destination (Join-Path $out 'README.md')
$zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$zip.sha256", "$zipHash  $name.zip`n", [Text.UTF8Encoding]::new($false))
$manifest = @("# v$version 分发包清单", '', "- 源码提交：$head", "- 构建时间：$([DateTimeOffset]::Now.ToString('o'))", "- ZIP：$name.zip", "- ZIP SHA-256：$zipHash", '- README.md 为用户安装说明；包内同名说明一致。', '- package.json、src、LICENSE、ops 验证器来自上述提交；安装说明和演示为配套材料。', '- 不包含用户草稿、凭据、node_modules 或个人论文；不覆盖旧快照。', '- 交付人：miku / Codex；其他电脑安装签收待接收者完成。', '- 本清单不是 GitHub Release 或已合并声明。', '', '## ZIP 内文件 SHA-256', '', 'CHECKSUMS.sha256 不包含自身；其余文件如下。', '', '```text') + $hashes + @('```', '')
[IO.File]::WriteAllText((Join-Path $out 'MANIFEST.md'), ($manifest -join "`n"), [Text.UTF8Encoding]::new($false))
Write-Output "Created: $zip"
Write-Output "SHA-256: $zipHash"
Write-Output "Staging retained: $root"
