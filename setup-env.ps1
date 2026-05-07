<#
.SYNOPSIS
    Reads .env and writes each variable as a permanent Windows user environment variable.
    Run this ONCE after adding or changing your API key in .env.
    Every new terminal will pick up the change automatically.
#>

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found at $envFile" -ForegroundColor Red
    Write-Host "Create it and add:  ANTHROPIC_API_KEY=your-key-here" -ForegroundColor Yellow
    exit 1
}

$count = 0
foreach ($line in Get-Content $envFile) {
    # Skip blank lines and comments
    if ($line -match '^\s*$' -or $line -match '^\s*#') { continue }

    if ($line -match '^([^=]+)=(.*)$') {
        $name  = $Matches[1].Trim()
        $value = $Matches[2].Trim()

        if ($value -eq '') {
            Write-Host "SKIP  $name  (empty — fill in .env first)" -ForegroundColor Yellow
            continue
        }

        # Set for current session immediately
        [System.Environment]::SetEnvironmentVariable($name, $value, 'User')
        Set-Item "Env:\$name" $value

        Write-Host "SET   $name  ($($value.Length) chars)  → Windows user environment" -ForegroundColor Green
        $count++
    }
}

if ($count -eq 0) {
    Write-Host "`nNo variables were set. Open .env and fill in your key(s)." -ForegroundColor Yellow
} else {
    Write-Host "`n$count variable(s) saved. All new terminals will have them automatically." -ForegroundColor Cyan
    Write-Host "Current terminal also updated — you can run your scripts now." -ForegroundColor Cyan
}
