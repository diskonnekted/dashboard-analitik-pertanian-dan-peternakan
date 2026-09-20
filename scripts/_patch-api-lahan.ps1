$path = "I:\pertanian\pertanian-2\src\services\api.ts"
$raw = [System.IO.File]::ReadAllText($path)

# ── 1) bump cache key lahan ─────────────────────────────────
if ($raw.Contains("banjarnegara_lahan_cache_v4")) {
  $raw = $raw.Replace("banjarnegara_lahan_cache_v4", "banjarnegara_lahan_cache_v5")
  Write-Host "bump cache v4->v5 : OK"
} elseif ($raw.Contains("banjarnegara_lahan_cache_v5")) {
  Write-Host "cache sudah v5   : skip"
} else { Write-Host "cache key tak dikenali : CEK MANUAL" }

# ── 2) sisipkan fetcher resmi ───────────────────────────────
if ($raw.Contains("fetchLahanResmiKabupaten")) { Write-Host "fetcher resmi : sudah ada, skip" }
else {
  $anchorCrlf = "};`r`n`r`n// Normalisasi nama kecamatan"
  $anchorLf   = "};`n`n// Normalisasi nama kecamatan"
  $anchor = $null; $eol = "`n"
  if ($raw.Contains($anchorCrlf)) { $anchor = $anchorCrlf; $eol = "`r`n" }
  elseif ($raw.Contains($anchorLf)) { $anchor = $anchorLf }
  if (-not $anchor) { throw "anchor '// Normalisasi nama kecamatan' tidak ditemukan" }

  $fetcherLf = @'
};

// Total resmi kabupaten dari dataset tidy Distankan "Luas Penggunaan Lahan
// menurut Jenis Penggunaan (Ha)" — dipakai kartu dasbor agar sesuai rilis resmi.
export interface LahanResmiKabupaten {
  tahun: number;
  sawah: number; // I. Lahan sawah (Ha)
  bukanSawah: number; // II. Bukan lahan sawah (Ha)
}

export const fetchLahanResmiKabupaten = async (): Promise<LahanResmiKabupaten | null> => {
  return withCache("lahan-resmi-kabupaten-v1", async () => {
    try {
      const response = await fetch(
        "/14. Distankan KP/tidy/Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)/Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) tidy.csv",
      );
      if (!response.ok) throw new Error("CSV tidy lahan tidak tersedia");
      const csvText = await response.text();
      return await new Promise<LahanResmiKabupaten | null>((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data as any[];
            let tahun = 0;
            rows.forEach((r) => {
              const t = parseInt(r.tahun);
              if (!isNaN(t) && t > tahun) tahun = t;
            });
            if (!tahun) return resolve(null);
            const pick = (kat: string) => {
              const row = rows.find(
                (r) => String(r.kategori || "").trim() === kat && parseInt(r.tahun) === tahun,
              );
              const v = row ? parseFloat(String(row.value).replace(",", ".")) : NaN;
              return isNaN(v) ? 0 : v;
            };
            resolve({ tahun, sawah: pick("I. Lahan sawah"), bukanSawah: pick("II. Bukan lahan sawah") });
          },
          error: () => resolve(null),
        });
      });
    } catch (e) {
      console.warn("fetchLahanResmiKabupaten gagal:", e);
      return null;
    }
  });
};

// Normalisasi nama kecamatan
'@
  $fetcher = $fetcherLf -replace "`n", $eol
  $raw = $raw.Replace($anchor, $fetcher)
  Write-Host "fetcher resmi : disisipkan OK (eol $($eol.Length) char)"
}

[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))

# ── Verifikasi ──────────────────────────────────────────────
$check = [System.IO.File]::ReadAllText($path)
Write-Host ("cache v5                : " + $check.Contains('banjarnegara_lahan_cache_v5'))
Write-Host ("fetcher ada             : " + $check.Contains('export const fetchLahanResmiKabupaten'))
Write-Host ("interface               : " + $check.Contains('interface LahanResmiKabupaten'))
Write-Host ("path tidy               : " + $check.Contains('Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) tidy.csv'))
Write-Host ("fetchLahanBanjarnegara  : " + $check.Contains('export const fetchLahanBanjarnegara'))
Write-Host ("komentar Normalisasi 1x : " + ([regex]::Matches($check, '// Normalisasi nama kecamatan')).Count)
