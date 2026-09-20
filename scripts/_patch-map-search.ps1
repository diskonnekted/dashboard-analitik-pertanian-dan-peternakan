$path = "I:\pertanian\pertanian-2\src\components\MapWidget.tsx"
$raw = [System.IO.File]::ReadAllText($path)
$ok = @{}

# ── 1) import useRef ────────────────────────────────────────
$old = 'import { useEffect, useState, useMemo } from "react";'
$new = 'import { useEffect, useState, useMemo, useRef } from "react";'
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["1-import"] = $true } else { $ok["1-import"] = "MISS" }

# ── 2) Sisipkan tipe + komponen SearchFlyTo sebelum MapBounds ──
$anchor = "const MapBounds = ({ data }: { data: any }) => {"
$insert = @'
// Target hasil pencarian desa untuk fly-to + highlight
type DesaSearchTarget = {
  name: string;          // nama desa apa adanya dari GeoJSON
  kec: string;           // kecamatan (pembeda desa kembar antar-kecamatan)
  bounds: L.LatLngBounds;
  token: number;         // berubah tiap pemilihan → memicu ulang efek flyTo
};

/**
 * SearchFlyTo — saat user memilih desa dari dropdown pencarian, peta
 * "terbang" (flyToBounds) ke polygon desa tsb lalu membuka popup-nya.
 * Timeout (bukan moveend) dipakai agar popup tetap terbuka walau kamera
 * tidak berpindah (mis. memilih desa yang sama dua kali).
 */
const SearchFlyTo = ({ target, geoJsonRef }: { target: DesaSearchTarget | null; geoJsonRef: { current: L.GeoJSON | null } }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyToBounds(target.bounds, { padding: [60, 60], maxZoom: 15, duration: 1.1 });
    const t = setTimeout(() => {
      const gj = geoJsonRef.current;
      if (!gj) return;
      gj.eachLayer((lyr: any) => {
        const f = lyr?.feature;
        if (!f) return;
        const nm = f.properties?.Nama_Desa_ || f.properties?.Name || "";
        const kc = f.properties?.Kecamatan || "";
        if (nm === target.name && kc === target.kec && lyr.openPopup) lyr.openPopup();
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [target, map, geoJsonRef]);
  return null;
};

const MapBounds = ({ data }: { data: any }) => {
'@
if ($raw.Contains($anchor)) { $raw = $raw.Replace($anchor, $insert); $ok["2-flyto"] = $true } else { $ok["2-flyto"] = "MISS" }

# ── 3) State + indeks pencarian ──────────────────────────────
$old = @'
  const [searchQuery, setSearchQuery] = useState("");
'@
$new = @'
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchTarget, setSearchTarget] = useState<DesaSearchTarget | null>(null);
  const desaGeoJsonRef = useRef<L.GeoJSON | null>(null);

  // Indeks pencarian desa dari GeoJSON (nama + kecamatan + referensi feature)
  const desaSearchIndex = useMemo(() => {
    if (!desaGeoData?.features) return [] as { name: string; kec: string; feature: any }[];
    const list: { name: string; kec: string; feature: any }[] = [];
    for (const f of desaGeoData.features) {
      const name = f.properties?.Nama_Desa_ || f.properties?.Name;
      if (!name) continue;
      list.push({ name: String(name), kec: String(f.properties?.Kecamatan || ""), feature: f });
    }
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return list;
  }, [desaGeoData]);

  // Hasil dropdown — maks 8; cocok-awalan didahulukan, lalu substring.
  // "DESA "/"KELURAHAN " diabaikan saat pencocokan awalan.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (q.length < 2) return [] as typeof desaSearchIndex;
    const starts: typeof desaSearchIndex = [];
    const contains: typeof desaSearchIndex = [];
    for (const item of desaSearchIndex) {
      const nm = item.name.toUpperCase();
      if (nm.startsWith(q) || nm.replace(/^(DESA|KELURAHAN)\s+/, "").startsWith(q)) starts.push(item);
      else if (nm.includes(q)) contains.push(item);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [desaSearchIndex, searchQuery]);

  // Pilih desa → set filter + target fly-to
  const handleSelectDesa = (item: { name: string; kec: string; feature: any }) => {
    try {
      const bounds = L.geoJSON(item.feature).getBounds();
      if (!bounds.isValid()) return;
      setSearchQuery(item.name);
      setShowSearchDropdown(false);
      setSearchTarget({ name: item.name, kec: item.kec, bounds, token: Date.now() });
    } catch (err) {
      console.error("Gagal menghitung batas desa:", err);
    }
  };
'@
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["3-state"] = $true } else { $ok["3-state"] = "MISS" }

# ── 4) getDesaStyle: variabel borderColor + highlight terpilih ──
$old = "    let opacity = 1;"
$new = "    let opacity = 1;`n    let borderColor = `"#1f2937`";"
# here-string di single-quote: backtick literal; gunakan replace biasa
$new = $new -replace '\`n', "`n" -replace '\`"', '"'
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["4a-bordervar"] = $true } else { $ok["4a-bordervar"] = "MISS" }

$old = @'
    return {
      fillColor,
      weight,
      opacity,
      color: "#1f2937",
'@
$new = @'
    // Desa terpilih dari pencarian: highlight biru tegas
    if (searchTarget && desaName === searchTarget.name.toUpperCase() && (feature.properties?.Kecamatan || "") === searchTarget.kec) {
      fillColor = "#2563eb";
      fillOpacity = 0.65;
      weight = 3;
      opacity = 1;
      borderColor = "#1d4ed8";
    }

    return {
      fillColor,
      weight,
      opacity,
      color: borderColor,
'@
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["4b-highlight"] = $true } else { $ok["4b-highlight"] = "MISS" }

# ── 5) Search bar + dropdown ─────────────────────────────────
$old = @'
      {/* --- TOP RIGHT: Search Bar --- */}
      <div className="absolute top-3 right-3 z-[1000] flex">
        <div className="bg-white border border-slate-200 shadow-sm flex items-center p-1 w-[190px] transition-all focus-within:w-[230px] rounded-lg">
          <Search className="text-neutral-400 mx-2" size={16} />
          <input
            type="text"
            placeholder="CARI DESA..."
            className="w-full font-mono text-[11px] font-bold uppercase focus:outline-none bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="px-2 font-black text-red-500 hover:bg-red-50">X</button>
          )}
        </div>
      </div>
'@
$new = @'
      {/* --- TOP RIGHT: Search Bar + dropdown hasil desa --- */}
      <div className="absolute top-3 right-3 z-[1000] flex">
        <div className="relative">
          {showSearchDropdown && searchQuery.trim().length >= 2 && (
            <div className="fixed inset-0 z-0" onClick={() => setShowSearchDropdown(false)} />
          )}
          <div className="relative z-10 bg-white border border-slate-200 shadow-sm flex items-center p-1 w-[190px] transition-all focus-within:w-[230px] rounded-lg">
            <Search className="text-neutral-400 mx-2" size={16} />
            <input
              type="text"
              placeholder="CARI DESA..."
              className="w-full font-mono text-[11px] font-bold uppercase focus:outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
                if (!e.target.value) setSearchTarget(null);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) handleSelectDesa(searchResults[0]);
                if (e.key === "Escape") setShowSearchDropdown(false);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchTarget(null); setShowSearchDropdown(false); }}
                className="px-2 font-black text-red-500 hover:bg-red-50"
              >X</button>
            )}
          </div>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute right-0 z-10 mt-1 w-[230px] bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden">
              {searchResults.map((item, idx) => (
                <button
                  key={`${item.kec}-${item.name}-${idx}`}
                  onClick={() => handleSelectDesa(item)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 active:bg-emerald-100 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <span className="block font-mono text-[11px] font-bold uppercase text-slate-800 leading-tight">{item.name}</span>
                  {item.kec && (
                    <span className="block font-mono text-[9px] uppercase text-emerald-700 leading-tight">Kec. {item.kec}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showSearchDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && desaGeoData && (
            <div className="absolute right-0 z-10 mt-1 w-[230px] bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2">
              <span className="font-mono text-[10px] uppercase text-neutral-500">Desa tidak ditemukan</span>
            </div>
          )}
        </div>
      </div>
'@
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["5-searchbar"] = $true } else { $ok["5-searchbar"] = "MISS" }

# ── 6) Pasang SearchFlyTo di dalam MapContainer ─────────────
$old = "          <ZoomBridge onLockChange={setZoomLocked} />"
$new = "          <ZoomBridge onLockChange={setZoomLocked} />`n          <SearchFlyTo target={searchTarget} geoJsonRef={desaGeoJsonRef} />"
$new = $new -replace '\`n', "`n"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["6-flyto-mount"] = $true } else { $ok["6-flyto-mount"] = "MISS" }

# ── 7) GeoJSON desa: ref + key ikut token pencarian ─────────
$old = '                  style={getDesaStyle}'
$new = "                  ref={desaGeoJsonRef as any}`n                  style={getDesaStyle}"
$new = $new -replace '\`n', "`n"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["7a-ref"] = $true } else { $ok["7a-ref"] = "MISS" }

$old = '-${activeLegendCategory}`}'
$new = '-${activeLegendCategory}-${searchTarget?.token || 0}`}'
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); $ok["7b-key"] = $true } else { $ok["7b-key"] = "MISS" }

[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))

Write-Host "=== HASIL PATCH ==="
$ok.GetEnumerator() | Sort-Object Name | ForEach-Object { "{0,-14} : {1}" -f $_.Key, $_.Value }
