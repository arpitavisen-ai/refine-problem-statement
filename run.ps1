<#
.SYNOPSIS
    Run any bootcamp Python script with the correct environment.

.USAGE
    .\run.ps1 path\to\script.py
    .\run.ps1 day2\01_evals\Building_an_Eval.py

.DESCRIPTION
    1. Loads .env (ANTHROPIC_API_KEY and any other vars)
    2. Verifies the API key is present
    3. Runs the script with the correct Python 3.14 interpreter
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Script
)

$ROOT    = $PSScriptRoot
$PYTHON  = "C:\Users\arpita.visen\AppData\Local\Python\pythoncore-3.14-64\python.exe"
$ENVFILE = Join-Path $ROOT ".env"

# ── 1. Load .env ─────────────────────────────────────────────────────────────
if (Test-Path $ENVFILE) {
    foreach ($line in Get-Content $ENVFILE) {
        if ($line -match '^\s*$' -or $line -match '^\s*#') { continue }
        if ($line -match '^([^=]+)=(.+)$') {
            $name  = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            Set-Item "Env:\$name" $value
        }
    }
    Write-Host "[env]    Loaded $ENVFILE" -ForegroundColor DarkGray
} else {
    Write-Host "[warn]   .env not found at $ENVFILE" -ForegroundColor Yellow
}

# ── 2. Verify API key ─────────────────────────────────────────────────────────
$key = $env:ANTHROPIC_API_KEY
if (-not $key -or $key.Length -lt 20) {
    Write-Host "[error]  ANTHROPIC_API_KEY is missing or too short. Fill in .env and retry." -ForegroundColor Red
    exit 1
}
Write-Host "[key]    ANTHROPIC_API_KEY = $($key.Substring(0,12))... ($($key.Length) chars)" -ForegroundColor DarkGray

# ── 3. Verify Python ──────────────────────────────────────────────────────────
if (-not (Test-Path $PYTHON)) {
    Write-Host "[error]  Python not found at $PYTHON" -ForegroundColor Red
    exit 1
}
$pyver = & $PYTHON --version 2>&1
Write-Host "[python] $pyver at $PYTHON" -ForegroundColor DarkGray

# ── 4. Resolve script path ────────────────────────────────────────────────────
$target = $Script
if (-not [System.IO.Path]::IsPathRooted($target)) {
    $target = Join-Path $ROOT $target
}
if (-not (Test-Path $target)) {
    Write-Host "[error]  Script not found: $target" -ForegroundColor Red
    exit 1
}
Write-Host "[run]    $target`n" -ForegroundColor Cyan

# ── 5. Execute ────────────────────────────────────────────────────────────────
& $PYTHON $target
exit $LASTEXITCODE
