# Serves the built website and API together at http://localhost:8000
$root = $PSScriptRoot
if (-not (Test-Path "$root\frontend\dist\index.html")) {
    Write-Output 'Building the frontend first...'
    Push-Location "$root\frontend"
    npm run build
    Pop-Location
}
Write-Output 'Open http://localhost:8000 (press Ctrl+C to stop)'
& "$root\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "$root\backend" --port 8000
