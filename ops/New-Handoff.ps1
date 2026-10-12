param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$versionName = "v$Version"
$versionPath = Join-Path "releases" $versionName

if (Test-Path -LiteralPath $versionPath) {
    throw "Version $versionName already exists and cannot be overwritten. Increment the version."
}

$gitCommand = Get-Command git -ErrorAction Stop
$commit = (& $gitCommand.Source rev-parse HEAD).Trim()
$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
New-Item -ItemType Directory -Path $versionPath | Out-Null

$manifest = @"
# $versionName Handoff Manifest

- Created: $timestamp
- Source commit: `$commit`
- Version directory: `releases/$versionName/`

## Scope

Document the capabilities, fixes, and known limitations included in this handoff.

## Verification and reproduction

Document the environment, complete commands, expected results, and evidence paths.

## Files and checksums

List deliverables and their SHA-256 values. Do not write secrets in this manifest.

## Sign-off

- Delivered by: TBD
- Accepted by: TBD
- Acceptance date: TBD
"@
Set-Content -LiteralPath (Join-Path $versionPath "MANIFEST.md") -Value $manifest -Encoding utf8
Write-Host "Created immutable handoff skeleton: $versionPath"
