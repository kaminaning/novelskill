# sync-references.ps1
# Purpose: Sync references from story-long-explosive-plan/references/ to story-long-explosive-write/references/
# When to run:
#   - After updating plan skill's references, run this script to propagate to write skill
#   - After fresh clone, ensure write skill has up-to-date references
#   - Write skill Phase 0 may call this in -Check mode for a freshness check
#
# Usage:
#   powershell -File .claude/skills/story-long-explosive-write/scripts/sync-references.ps1
#   powershell -File .claude/skills/story-long-explosive-write/scripts/sync-references.ps1 -Check  # check only
#   powershell -File .claude/skills/story-long-explosive-write/scripts/sync-references.ps1 -Force  # overwrite even if target is newer

param(
    [switch]$Check,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Layer up from scripts/ -> story-long-explosive-write/ -> skills/ -> .claude/ -> repo root
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.Parent.Parent.FullName
$Source = Join-Path $RepoRoot ".claude\skills\story-long-explosive-plan\references"
$Target = Join-Path $RepoRoot ".claude\skills\story-long-explosive-write\references"

if (-not (Test-Path $Source)) {
    Write-Error "Source dir not found: $Source. plan skill not installed or path is wrong."
    exit 1
}

if (-not (Test-Path $Target)) {
    New-Item -ItemType Directory -Force -Path $Target | Out-Null
}

$sourceFiles = Get-ChildItem -Path $Source -File
$updates = @()
$missing = @()
$identical = @()
$newer_in_target = @()

foreach ($srcFile in $sourceFiles) {
    $tgtPath = Join-Path $Target $srcFile.Name
    if (-not (Test-Path $tgtPath)) {
        $missing += $srcFile.Name
        continue
    }
    $tgtFile = Get-Item $tgtPath
    $srcHash = (Get-FileHash $srcFile.FullName -Algorithm MD5).Hash
    $tgtHash = (Get-FileHash $tgtPath -Algorithm MD5).Hash
    if ($srcHash -eq $tgtHash) {
        $identical += $srcFile.Name
    } elseif ($tgtFile.LastWriteTime -gt $srcFile.LastWriteTime) {
        $newer_in_target += $srcFile.Name
    } else {
        $updates += $srcFile.Name
    }
}

Write-Host ""
Write-Host "=== references sync status ===" -ForegroundColor Cyan
Write-Host "Source: $Source"
Write-Host "Target: $Target"
Write-Host ""
Write-Host "Identical:        $($identical.Count) files" -ForegroundColor Green
Write-Host "Need update:      $($updates.Count) files" -ForegroundColor Yellow
Write-Host "Missing in tgt:   $($missing.Count) files" -ForegroundColor Yellow
Write-Host "Newer in tgt:     $($newer_in_target.Count) files (write newer than plan, review needed)" -ForegroundColor Red
Write-Host ""

if ($updates.Count -gt 0) {
    Write-Host "[Need update]" -ForegroundColor Yellow
    $updates | ForEach-Object { Write-Host "  - $_" }
}
if ($missing.Count -gt 0) {
    Write-Host "[Missing in target]" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" }
}
if ($newer_in_target.Count -gt 0) {
    Write-Host "[Newer in target - sync will overwrite, confirm needed]" -ForegroundColor Red
    $newer_in_target | ForEach-Object { Write-Host "  - $_" }
}

if ($Check) {
    Write-Host ""
    Write-Host "(Check mode only, no sync performed)" -ForegroundColor Cyan
    exit 0
}

if ($updates.Count -eq 0 -and $missing.Count -eq 0 -and $newer_in_target.Count -eq 0) {
    Write-Host ""
    Write-Host "[OK] All synced, no action needed." -ForegroundColor Green
    exit 0
}

if ($newer_in_target.Count -gt 0 -and -not $Force) {
    Write-Host ""
    Write-Host "[STOP] Target has $($newer_in_target.Count) files newer than source. Not overwriting by default." -ForegroundColor Red
    Write-Host "  Use -Force to overwrite, or sync target changes back to plan/ first." -ForegroundColor Red
    exit 2
}

# Execute sync
$toSync = $updates + $missing
if ($Force) {
    $toSync += $newer_in_target
}

foreach ($name in $toSync) {
    $src = Join-Path $Source $name
    $tgt = Join-Path $Target $name
    Copy-Item -Path $src -Destination $tgt -Force
    Write-Host "  -> synced $name" -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] $($toSync.Count) files synced." -ForegroundColor Green
