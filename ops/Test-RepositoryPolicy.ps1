param(
    [string]$BaseRef = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$gitCommand = Get-Command git -ErrorAction Stop
$allowedRootFiles = @(
    ".gitignore",
    "CHANGELOG.md",
    "LICENSE",
    "README.md"
)
$allowedRootDirectories = @(
    ".github",
    "changes",
    "docs",
    "evidence",
    "examples",
    "ops",
    "releases",
    "src",
    "tests"
)
$allowedDocumentCategories = @(
    "architecture",
    "governance",
    "product",
    "research"
)

$trackedFiles = @(& $gitCommand.Source ls-files)
$invalidRoot = foreach ($file in $trackedFiles) {
    $parts = $file -split "/"
    if ($parts.Count -eq 1) {
        if ($allowedRootFiles -notcontains $file) { $file }
    } elseif ($allowedRootDirectories -notcontains $parts[0]) {
        $file
    } elseif ($parts[0] -eq "docs" -and ($parts.Count -lt 3 -or $allowedDocumentCategories -notcontains $parts[1])) {
        $file
    } elseif ($parts[0] -eq "releases" -and ($parts.Count -lt 3 -or $parts[1] -notmatch '^v\d+\.\d+\.\d+$')) {
        $file
    } elseif ($parts[0] -eq "changes" -and $parts[1] -ne "TEMPLATE.md" -and $parts[1] -notmatch '^\d{8}-\d{4}-[a-z0-9-]+\.md$') {
        $file
    }
}
if ($invalidRoot) {
    throw "Unclassified repository paths: $($invalidRoot -join ', ')"
}

$requiredHeadings = @(
    "## Summary",
    "## Technical implementation",
    "## Interfaces, configuration, and data",
    "## Compatibility and migration",
    "## Verification",
    "## Risks and limitations",
    "## Rollback"
)
$changeFiles = Get-ChildItem -LiteralPath "changes" -File -Filter "*.md" | Where-Object Name -ne "TEMPLATE.md"
foreach ($changeFile in $changeFiles) {
    $content = Get-Content -Raw -LiteralPath $changeFile.FullName
    foreach ($heading in $requiredHeadings) {
        if (-not $content.Contains($heading)) {
            throw "$($changeFile.FullName) is missing required heading: $heading"
        }
    }
}

if ($BaseRef -and $BaseRef -notmatch '^0+$') {
    & $gitCommand.Source cat-file -e "$BaseRef^{commit}" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $changed = @(& $gitCommand.Source diff --name-status --find-renames $BaseRef HEAD)
        $baseReleaseVersions = @(& $gitCommand.Source ls-tree --name-only "${BaseRef}:releases" 2>$null)
        $mutatedRelease = foreach ($line in $changed) {
            $fields = $line -split "`t"
            foreach ($path in $fields | Select-Object -Skip 1) {
                if ($path -match '^releases/(?<version>v\d+\.\d+\.\d+)/' -and $baseReleaseVersions -contains $Matches.version) {
                    $line
                    break
                }
            }
        }
        if ($mutatedRelease) {
            throw "Existing releases cannot be modified, deleted, or renamed: $($mutatedRelease -join '; ')"
        }
        $newChange = $changed | Where-Object { $_ -match "^A\s+changes/(?!TEMPLATE\.md).+\.md$" }
        if (-not $newChange) {
            throw "Every update must add a technical change entry under changes/."
        }
    }
}

Write-Host "Repository policy checks passed."
