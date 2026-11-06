# OpenShorts PowerShell Startup Script
$Host.UI.RawUI.WindowTitle = "OpenShorts Launcher"
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "              Starting OpenShorts Platform              " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + $env:Path

Write-Host "[1/2] Starting Backend on http://localhost:8008 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User') + ';' + `$env:Path; .\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8008"

Write-Host "[2/2] Starting Frontend on http://localhost:5175 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\dashboard'; npm run dev"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "OpenShorts is running!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:5175" -ForegroundColor Yellow
Write-Host "API Docs:  http://localhost:8008/docs" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Start-Process "http://localhost:5175"

