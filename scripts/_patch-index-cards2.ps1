$path = "I:\pertanian\pertanian-2\src\pages\index.tsx"
$raw = [System.IO.File]::ReadAllText($path)
$nl = "`r`n"  # file ini CRLF
$fails = @()

function Swap([string]$old, [string]$new, [string]$label) {
  if ($script:raw.Contains($old)) { $script:raw = $script:raw.Replace($old, $new); Write-Host "$label : OK" }
  else { Write-Host "$label : MISS"; $script:fails += $label }
}

# 1) import: tambah fetcher + tipe resmi
Swap "  fetchLahanBanjarnegara,$nl  LahanDesa,$nl} from `"@/services/api`";" `
     "  fetchLahanBanjarnegara,$nl  fetchLahanResmiKabupaten,$nl  LahanDesa,$nl  LahanResmiKabupaten,$nl} from `"@/services/api`";" "1-import"

# 2) useEffect: ikutkan fetch resmi di Promise.all
Swap "      const [data, lahan] = await Promise.all([" `
     "      const [data, lahan, resmi] = await Promise.all([" "2a-destructure"
Swap "        }),$nl      ]);" `
     "        }),$nl        fetchLahanResmiKabupaten().catch(() => null),$nl      ]);" "2b-promise"
Swap "      if (lahan) setLahanData(lahan);" `
     "      if (lahan) setLahanData(lahan);$nl      if (resmi) setLahanResmi(resmi);" "2c-setresmi"

# 3) totalBukanSawah: pakai angka resmi, fallback per-desa
Swap "  const totalBukanSawah = lahanData.reduce($nl    (acc, curr) => acc + curr.lahanBukanSawah,$nl    0,$nl  );" `
     "  const totalBukanSawah =$nl    lahanResmi?.bukanSawah ||$nl    lahanData.reduce((acc, curr) => acc + curr.lahanBukanSawah, 0);" "3-bukansawah"

# 4) trend cards akurat sesuai definisi resmi
Swap '            trend="Padi & Palawija"' `
     '            trend={`Irigasi & Tadah Hujan (${lahanResmi?.tahun ?? "resmi"})`}' "4a-trend-sawah"
Swap '            trend="Tegalan & Perkebunan"' `
     '            trend={`Tegal, Perkebunan, dll (${lahanResmi?.tahun ?? "resmi"})`}' "4b-trend-bukan"
Swap '            trend="Terpetakan"' `
     '            trend="20 Kecamatan"' "4c-trend-cakupan"
Swap '            value={`${totalDesa} Desa`}' `
     '            value={`${totalDesa} Desa/Kelurahan`}' "4d-value-cakupan"

[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))
if ($fails.Count -gt 0) { throw "Ada patch gagal: $($fails -join ', ')" }
Write-Host "--- verifikasi ---"
$c = [System.IO.File]::ReadAllText($path)
Write-Host ("import resmi      : " + $c.Contains('fetchLahanResmiKabupaten'))
Write-Host ("LahanResmiKabupaten: " + $c.Contains('LahanResmiKabupaten'))
Write-Host ("resmi di Promise  : " + $c.Contains('const [data, lahan, resmi]'))
Write-Host ("bukanSawah resmi  : " + $c.Contains('lahanResmi?.bukanSawah'))
Write-Host ("Desa/Kelurahan    : " + $c.Contains('Desa/Kelurahan'))
