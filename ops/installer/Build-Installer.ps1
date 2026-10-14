param(
  [Parameter(Mandatory=$true)][string]$PackageZip,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../../dist/installer')
)
$ErrorActionPreference = 'Stop'
$packagePath = (Resolve-Path -LiteralPath $PackageZip).Path
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler not found. Build on Windows with .NET Framework 4.x.' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($output) | Out-Null
$exe = Join-Path $output 'SciViz-AGH-0.4.2-Setup.exe'
if (Test-Path -LiteralPath $exe) { throw 'Output already exists; use a new versioned output directory.' }
$sha = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
$shaFile = Join-Path $output 'payload.sha256'
[IO.File]::WriteAllText($shaFile, $sha, [Text.Encoding]::ASCII)
$arguments = @('/nologo','/target:winexe','/platform:anycpu','/optimize+',('/out:'+$exe),
  '/reference:System.dll','/reference:System.Core.dll','/reference:System.Windows.Forms.dll',
  '/reference:System.Drawing.dll','/reference:System.Management.dll',
  '/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll',
  ('/resource:'+$packagePath+',payload.zip'),('/resource:'+$shaFile+',payload.sha256'),
  ('/resource:'+(Join-Path $PSScriptRoot 'discover-wsl.sh')+',discover.sh'),
  (Join-Path $PSScriptRoot 'Installer.cs'),(Join-Path $PSScriptRoot 'Diagnostics.cs'))
& $compiler @arguments
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
$exeHash = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText(($exe+'.sha256'), ($exeHash+'  '+[IO.Path]::GetFileName($exe)+"`n"), [Text.Encoding]::ASCII)
Write-Output $exe
Write-Output ('Payload SHA256: '+$sha)
