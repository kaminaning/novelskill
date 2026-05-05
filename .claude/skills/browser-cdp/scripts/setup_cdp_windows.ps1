#Requires -Version 5.1
<#
.SYNOPSIS
    Windows CDP (Chrome DevTools Protocol) environment setup.
    Launches Edge or Chrome with remote debugging enabled.

.DESCRIPTION
    Equivalent of setup_cdp_chrome.sh for Windows.
    - Detects Edge or Chrome installation
    - Copies user profile to a debug directory (preserves login sessions)
    - Launches browser with --remote-debugging-port
    - Waits for CDP endpoint to respond

.PARAMETER Port
    CDP debugging port (default: 9222)

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File setup_cdp_windows.ps1 9222
#>

param(
    [int]$Port = 9222
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Detect browser
# ---------------------------------------------------------------------------

$EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
$EdgePath86 = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ChromePath86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

$BrowserPath = $null
$BrowserName = $null

if (Test-Path $EdgePath) {
    $BrowserPath = $EdgePath
    $BrowserName = "Edge"
} elseif (Test-Path $EdgePath86) {
    $BrowserPath = $EdgePath86
    $BrowserName = "Edge"
} elseif (Test-Path $ChromePath) {
    $BrowserPath = $ChromePath
    $BrowserName = "Chrome"
} elseif (Test-Path $ChromePath86) {
    $BrowserPath = $ChromePath86
    $BrowserName = "Chrome"
}

if (-not $BrowserPath) {
    Write-Host "[X] Edge Chrome" -ForegroundColor Red
    Write-Host "   Microsoft Edge  Google Chrome"
    exit 1
}

Write-Host "=== CDP Browser  ===" -ForegroundColor Cyan
Write-Host "CDP : $Port"
Write-Host ": $BrowserName ($BrowserPath)"

# ---------------------------------------------------------------------------
# 2. Check if CDP port is already active
# ---------------------------------------------------------------------------

$listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" }

if ($listener) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 3
        Write-Host "[OK] CDP  $Port " -ForegroundColor Green
        Write-Host ($resp.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2)
        exit 0
    } catch {
        Write-Host "[!] " -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# 3. Setup debug profile (preserves login sessions)
# ---------------------------------------------------------------------------

if ($BrowserName -eq "Edge") {
    $DefaultProfile = "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
    $DebugProfile = "$env:LOCALAPPDATA\edge-debug-profile"
} else {
    $DefaultProfile = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    $DebugProfile = "$env:LOCALAPPDATA\chrome-debug-profile"
}

if (-not (Test-Path "$DefaultProfile\Default")) {
    Write-Host "[X] : $DefaultProfile\Default" -ForegroundColor Red
    Write-Host "   "
    exit 1
}

if (-not (Test-Path "$DebugProfile\Default")) {
    Write-Host "   ..."
    New-Item -ItemType Directory -Path $DebugProfile -Force | Out-Null
    Copy-Item -Path "$DefaultProfile\Default" -Destination "$DebugProfile\Default" -Recurse -Force
    Write-Host "[OK] Profile : $DebugProfile" -ForegroundColor Green
} else {
    Write-Host "[OK]  Cookie..." -ForegroundColor Green
    $refreshFiles = @("Cookies", "Login Data", "Web Data", "Local State")
    foreach ($f in $refreshFiles) {
        $src = Join-Path "$DefaultProfile\Default" $f
        $dst = Join-Path "$DebugProfile\Default" $f
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $dst -Force -ErrorAction SilentlyContinue
        }
    }
}

# ---------------------------------------------------------------------------
# 4. Kill existing browser processes
# ---------------------------------------------------------------------------

$procName = if ($BrowserName -eq "Edge") { "msedge" } else { "chrome" }
$existing = Get-Process -Name $procName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "   $BrowserName ..."
    Stop-Process -Name $procName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $remaining = Get-Process -Name $procName -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "   ..."
        Start-Sleep -Seconds 3
        Stop-Process -Name $procName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# ---------------------------------------------------------------------------
# 5. Launch browser with CDP
# ---------------------------------------------------------------------------

Write-Host "   CDP $BrowserName ( $Port)..." -ForegroundColor Yellow

$procArgs = @(
    "--remote-debugging-port=$Port",
    "--user-data-dir=`"$DebugProfile`"",
    "--no-first-run",
    "--no-default-browser-check"
)

$proc = Start-Process -FilePath $BrowserPath -ArgumentList $procArgs -PassThru

# ---------------------------------------------------------------------------
# 6. Wait for CDP to be ready
# ---------------------------------------------------------------------------

Write-Host "   ..."
$ready = $false

for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 3
        $ready = $true
        Write-Host "[OK] $BrowserName  CDP  ( $Port)" -ForegroundColor Green
        Write-Host ($resp.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2)
        Write-Host ""
        Write-Host " :" -ForegroundColor Cyan
        Write-Host "  node qidian-rank-scraper.js --type hotsales --port $Port"
        exit 0
    } catch {
        Write-Host "   $i/15..."
    }
}

Write-Host "[X] 30  CDP " -ForegroundColor Red
Write-Host "   :"
Write-Host "   - --remote-debugging-port"
Write-Host "   -  $Port "
Write-Host "   - user-data-dir  ( $DebugProfile )"
exit 1
