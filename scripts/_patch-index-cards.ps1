$path = "I:\pertanian\pertanian-2\src\pages\index.tsx"
$raw = [System.IO.File]::ReadAllText($path)
$fails = @()
$arrow = [char]0x2191  # karakter "↑" — dibangun dinamis agar aman dari encoding ps1

function Swap([string]$old, [string]$new, [string]$label) {
  if ($script:raw.Contains($old)) { $script:raw = $script:raw.Replace($old, $new); Write-Host "$label : OK" }
  else { Write-Host "$label : MISS"; $script:fails += $label }
}

# 1) import fetcher resmi
Swap 'import { fetchLahanBanjarnegara, LahanDesa } from "../services/api";' `
     'import { fetchLahanBanjarnegara, fetchLahanResmiKabupaten, LahanDesa, LahanResmiKabupaten } from "../services/api";' "1-import"

# 2) state lahanResmi
Swap 'const [lahanData, setLahanData] = useState<LahanDesa[]>([]);' `
     "const [lahanData, setLahanData] = useState<LahanDesa[]>([]);`n  const [lahanResmi, setLahanResmi] = useState<LahanResmiKabupaten | null>(null);" "2-state"

# 3) fetch resmi di useEffect
Swap '        setLahanData(lahan);' `
     "        setLahanData(lahan);`n        setLahanResmi(await fetchLahanResmiKabupaten());" "3-fetchresmi"

# 4) total kartu: resmi dulu, fallback jumlah per-desa
Swap '  const totalSawah = lahanData.reduce((acc, curr) => acc + curr.lahanSawah, 0);' `
     '  const totalSawah = lahanResmi?.sawah || lahanData.reduce((acc, curr) => acc + curr.lahanSawah, 0);' "4a-sawah"
Swap '  const totalBukanSawah = lahanData.reduce((acc, curr) => acc + curr.lahanBukanSawah, 0);' `
     '  const totalBukanSawah = lahanResmi?.bukanSawah || lahanData.reduce((acc, curr) => acc + curr.lahanBukanSawah, 0);' "4b-bukan"

# 5) subjudul kartu akurat sesuai definisi resmi
Swap ('      sub: "' + $arrow + ' Padi & Palawija",') `
     '      sub: `Irigasi & Tadah Hujan (${lahanResmi?.tahun || "resmi"})`,' "5a-sub-sawah"
Swap ('      sub: "' + $arrow + ' Tegalan & Perkebunan",') `
     '      sub: `Tegal, Perkebunan, dll (${lahanResmi?.tahun || "resmi"})`,' "5b-sub-bukan"
Swap '      sub: "Desa",' `
     '      sub: "Desa & Kelurahan",' "5c-sub-desa"

[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))
if ($fails.Count -gt 0) { throw "Ada patch gagal: $($fails -join ', ')" }
Write-Host "--- verifikasi ---"
$c = [System.IO.File]::ReadAllText($path)
Write-Host ("import resmi   : " + $c.Contains('fetchLahanResmiKabupaten'))
Write-Host ("state resmi    : " + $c.Contains('lahanResmi'))
Write-Host ("sub Desa & Kel : " + $c.Contains('Desa & Kelurahan'))
