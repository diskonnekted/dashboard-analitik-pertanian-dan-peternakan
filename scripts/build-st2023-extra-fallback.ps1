# Gabungkan data-source/st2023-extra-*.json -> public/data/st2023-desa-fallback.json
# Dipakai aplikasi untuk info per-desa dari ST2023 (petani, keanggotaan kelompok,
# ternak, perikanan) terutama untuk kecamatan yang tidak punya data CKAN/Distan.
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'data-source'
$out = Join-Path $root 'public\data\st2023-desa-fallback.json'

$all = @()
Get-ChildItem $src -Filter 'st2023-extra-*.json' | Sort-Object Name | ForEach-Object {
    $j = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $all += $j.data
    '{0}: {1} desa' -f $_.Name, $j.data.Count
}

$json = $all | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding $false))
''
"TOTAL: $($all.Count) desa -> $out"
