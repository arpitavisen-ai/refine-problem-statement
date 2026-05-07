# Runs Prompt_Rescue_solo.py with the correct Python (system 3.14 which has anthropic)
$py = "C:\Users\arpita.visen\AppData\Local\Python\pythoncore-3.14-64\python.exe"
$script = "$PSScriptRoot\Prompt_Rescue_solo.py"

if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "ERROR: Set your API key first:" -ForegroundColor Red
    Write-Host '  $env:ANTHROPIC_API_KEY = "sk-ant-..."' -ForegroundColor Yellow
    exit 1
}

Write-Host "Using Python: $py" -ForegroundColor Cyan
Write-Host "Running: $script`n" -ForegroundColor Cyan
& $py $script
