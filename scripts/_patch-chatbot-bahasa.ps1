$path = "I:\pertanian\pertanian-2\src\components\ChatBot.tsx"
$raw = [System.IO.File]::ReadAllText($path)

$marker = "GAYA KONSULTASI:"
$insert = @'
BAHASA (WAJIB):
- SELALU jawab dalam Bahasa Indonesia baku yang baik dan mudah dipahami, APA PUN bahasa yang dipakai pengguna (termasuk bila pengguna menulis dalam bahasa Inggris, Jawa, atau bahasa lain).
- Istilah teknis asing (mis. "HHI", "supply chain") boleh dipakai bila perlu, tetapi wajib dijelaskan dalam Bahasa Indonesia.

GAYA KONSULTASI:
'@

if (-not $raw.Contains($marker)) { throw "marker tidak ditemukan" }
if ($raw.Contains('BAHASA (WAJIB)')) { Write-Host "Sudah ada, skip"; exit 0 }

$raw = $raw.Replace($marker, $insert)
[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))

$check = [System.IO.File]::ReadAllText($path)
Write-Host ("BAHASA (WAJIB) ada : " + $check.Contains('BAHASA (WAJIB)'))
Write-Host ("SELALU Indonesia   : " + $check.Contains('SELALU jawab dalam Bahasa Indonesia'))
Write-Host ("marker tetap ada   : " + $check.Contains('GAYA KONSULTASI:'))
