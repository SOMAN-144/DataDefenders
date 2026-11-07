# Downloads NCRB "Crime in India" chapter 9A tables and the projected population
# tables from each year's NCRB table index into data/raw/ncrb_tables/<year>/.
# Original files are never overwritten; the manifest records each file's source URL.
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'data\raw\ncrb_tables'
New-Item -ItemType Directory -Force $out | Out-Null
$manifest = Join-Path $out 'manifest.csv'
if (-not (Test-Path $manifest)) { 'year,table,title,url,local_file,accessed' | Out-File -Encoding utf8 $manifest }
$today = Get-Date -Format 'yyyy-MM-dd'
foreach ($y in 2016..2024) {
    $html = (& curl.exe -sS -L --http1.1 -A 'Mozilla/5.0' --max-time 90 "https://www.ncrb.gov.in/crime-in-india-table-content?year=$y") -join "`n"
    Write-Output "--- $y index length $($html.Length)"
    $seen = @{}
    # A row holds the title link (PDF) followed by the size links (PDF, then XLSX).
    $rows = [regex]::Matches($html, '(?s)<tr.*?</tr>')
    foreach ($row in $rows) {
        $txt = $row.Value
        if ($txt -notmatch '(?i)cyber crime|projected population|Mid-Year') { continue }
        $title = ''
        $tm = [regex]::Match($txt, '(?s)<a[^>]*\.pdf"[^>]*>(.*?)</a>')
        if ($tm.Success) { $title = ($tm.Groups[1].Value -replace '<[^>]+>', '').Trim() -replace '\s+', ' ' -replace ',', ';' }
        if ($title -notmatch '(?i)Cyber Crimes?\s*(Incidence)?\s*(&\s*Crime Rate\s*)?\(?(State|Crime Head)|Cyber Crime Motives|9A\.2\(|Projected Population|Mid-Year') { continue }
        if ($title -match '(?i)Metropolitan|Cities|City|Disposal|Women|Children') { continue }
        foreach ($m in [regex]::Matches($txt, 'href="([^"]+\.(?:pdf|xlsx|xls))"')) {
            $u = $m.Groups[1].Value
            if ($seen[$u]) { continue }
            $seen[$u] = $true
            $dir = Join-Path $out "$y"
            New-Item -ItemType Directory -Force $dir | Out-Null
            $name = Split-Path ($u -replace '%20', '_') -Leaf
            $file = Join-Path $dir $name
            if (-not (Test-Path $file)) {
                & curl.exe -sS -L --http1.1 -A 'Mozilla/5.0' --max-time 90 -o $file ($u -replace ' ', '%20')
            }
            $tag = ([regex]::Match($name, 'TABLE[0-9A-Za-z]+', 'IgnoreCase')).Value
            "$y,$tag,$title,$u,$name,$today" | Out-File -Append -Encoding utf8 $manifest
            Write-Output "$y | $title | $name | $((Get-Item $file).Length)"
        }
    }
}
