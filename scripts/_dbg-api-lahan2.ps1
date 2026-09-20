$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\services\api.ts")
$k = $raw.IndexOf("fetchLahanBanjarnegara")
# mundur ke awal baris 'export'
$start = $raw.LastIndexOf("export const", $k)
# maju sampai penutup fungsi: cari pola "`r`n};" setelah k
$endM = [regex]::Match($raw.Substring($k), "(?s)^\};", 'Multiline')
$end = $k + $endM.Index + $endM.Length
$fn = $raw.Substring($start, $end - $start)
Write-Host ("=== fetchLahanBanjarnegara (asli di disk) ===")
Write-Host ($fn -replace "`r", "")
Write-Host ("=== konteks setelahnya ===")
Write-Host (($raw.Substring($end, [Math]::Min(300, $raw.Length - $end))) -replace "`r", "")
