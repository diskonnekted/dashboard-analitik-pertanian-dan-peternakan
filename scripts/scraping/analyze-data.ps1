# Cek kecamatan & desa Kalibening/Banjarmangu di lahan-fallback.json
$root = 'I:\pertanian\pertanian-2'
$l = Get-Content (Join-Path $root 'public\data\lahan-fallback.json') -Raw | ConvertFrom-Json
'total baris: ' + $l.Count
$l | Group-Object kecamatan | Sort-Object Name | ForEach-Object { '{0} : {1}' -f $_.Name, $_.Count }
''
'--- contoh baris Kalibening ---'
$l | Where-Object { $_.kecamatan -match 'alibening' } | Select-Object -First 5 | ForEach-Object { '{0} | {1} | sawah {2} | bukan {3}' -f $_.desa, $_.kecamatan, $_.lahanSawah, $_.lahanBukanSawah }
