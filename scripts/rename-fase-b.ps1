# Rename 32 fetcher export di api.ts -> bentuk internal *Csv (Fase B: API-first).
# Verifikasi: tiap pattern harus muncul TEPAT 1x. Newline tidak disentuh (String.Replace).
$ErrorActionPreference = "Stop"
$p = "I:\pertanian\pertanian-2\src\services\api.ts"
$enc = [System.Text.UTF8Encoding]::new($false) # tanpa BOM
$text = [System.IO.File]::ReadAllText($p, $enc)

$renames = @(
  @("export const fetchLahanBanjarnegara =", "const fetchLahanBanjarnegaraCsv ="),
  @("export const fetchLahanResmiKabupaten =", "const fetchLahanResmiKabupatenCsv ="),
  @("export const fetchPadiProduction =", "const fetchPadiProductionCsv ="),
  @("export const fetchPadiHistory =", "const fetchPadiHistoryCsv ="),
  @("export const fetchJagungUbiKayu =", "const fetchJagungUbiKayuCsv ="),
  @("export const fetchKacangKedelai =", "const fetchKacangKedelaiCsv ="),
  @("export const fetchUbiKacangHijau =", "const fetchUbiKacangHijauCsv ="),
  @("export const fetchPadiSawahLadang =", "const fetchPadiSawahLadangCsv ="),
  @("export const fetchVegetableProduction =", "const fetchVegetableProductionCsv ="),
  @("export const fetchInflationData =", "const fetchInflationDataCsv ="),
  @("export const fetchLumbungPangan =", "const fetchLumbungPanganCsv ="),
  @("export const fetchMarketData =", "const fetchMarketDataCsv ="),
  @("export const fetchTernakKecil =", "const fetchTernakKecilCsv ="),
  @("export const fetchTernakBesar =", "const fetchTernakBesarCsv ="),
  @("export const fetchUnggas =", "const fetchUnggasCsv ="),
  @("export const fetchPemasukanTernak =", "const fetchPemasukanTernakCsv ="),
  @("export const fetchPengeluaranTernak =", "const fetchPengeluaranTernakCsv ="),
  @("export const fetchLuarRPH =", "const fetchLuarRPHCsv ="),
  @("export const fetchDagingUnggas =", "const fetchDagingUnggasCsv ="),
  @("export const fetchPerikananBudidaya =", "const fetchPerikananBudidayaCsv ="),
  @("export const fetchNilaiProduksiBudidaya =", "const fetchNilaiProduksiBudidayaCsv ="),
  @("export const fetchNilaiProduksiTangkap =", "const fetchNilaiProduksiTangkapCsv ="),
  @("export const fetchPerikananTangkap =", "const fetchPerikananTangkapCsv ="),
  @("export const fetchPerikananBenih =", "const fetchPerikananBenihCsv ="),
  @("export const fetchPlantationArea =", "const fetchPlantationAreaCsv ="),
  @("export const fetchPlantationProduction =", "const fetchPlantationProductionCsv ="),
  @("export const fetchVegetableArea =", "const fetchVegetableAreaCsv ="),
  @("export const fetchAnnualHorticultureProduction =", "const fetchAnnualHorticultureProductionCsv ="),
  @("export const fetchFruitProduction =", "const fetchFruitProductionCsv ="),
  @("export const fetchKelompokTaniHutanSnapshot =", "const fetchKelompokTaniHutanSnapshotCsv ="),
  @("export const fetchKelompokTani =", "const fetchKelompokTaniCsv ="),
  @("export const fetchSt2023DesaExtra =", "const fetchSt2023DesaExtraCsv =")
)

$fail = 0
foreach ($r in $renames) {
  $from = $r[0]; $to = $r[1]
  $count = ([regex]::Matches($text, [regex]::Escape($from))).Count
  if ($count -ne 1) { Write-Host "SKIP ($count kemunculan): $from"; $fail++; continue }
  $text = $text.Replace($from, $to)
}
if ($fail -gt 0) { Write-Host "GAGAL: $fail pattern tidak unik - file TIDAK ditulis"; exit 1 }

[System.IO.File]::WriteAllText($p, $text, $enc)
Write-Host "OK: 32 fetcher di-rename menjadi *Csv (verifikasi count=1 semua)"
