# Rebuilds everything derived from data/raw: processed CSVs, GeoJSON, R analysis,
# the SQLite database and the statistical report. Raw files are only read.
# Stop the API server first, because it holds the database file open.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$python = Join-Path $root '.venv\Scripts\python.exe'
$rscript = Join-Path $root '.tools\R\bin\Rscript.exe'
if (-not (Test-Path $rscript)) { $rscript = 'Rscript' }

function Step($exe, [string[]]$arguments, $dir) {
    Push-Location $dir
    try {
        & $exe @arguments
        if ($LASTEXITCODE -ne 0) { throw "Failed: $exe $arguments" }
    } finally { Pop-Location }
}

$pipeline = Join-Path $root 'pipeline'
Step $python @('export_meta.py') $pipeline
Step $python @('build_geo.py') $pipeline
Step $python @('extract_ncrb.py') $pipeline
Step $python @('build_curated.py') $pipeline
Step $rscript @('analysis/R/analysis.R') $root
Step $python @('build_db.py') $pipeline
Step $python @('build_report.py') $pipeline
Write-Output 'Pipeline complete.'
