$path = "I:\pertanian\pertanian-2\src\components\MapWidget.tsx"
$raw = [System.IO.File]::ReadAllText($path)

function Replace-MultiLine([string]$text, [string]$oldLf, [string]$newLf, [string]$label) {
  # Coba LF dulu, lalu CRLF (file campuran)
  foreach ($eol in @("`n", "`r`n")) {
    $oldV = $oldLf -replace "`n", $eol
    if ($text.Contains($oldV)) {
      $newV = $newLf -replace "`n", $eol
      $script:result = $text.Replace($oldV, $newV)
      Write-Host "$label : OK (eol=$([int]$eol[0])$($eol.Length))"
      return $true
    }
  }
  Write-Host "$label : MISS"
  return $false
}

$script:result = $raw

# ── 4b) highlight desa terpilih di getDesaStyle ─────────────
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
Replace-MultiLine $script:result $old $new "4b-highlight" | Out-Null

# ── 5) search bar + dropdown ─────────────────────────────────
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
Replace-MultiLine $script:result $old $new "5-searchbar" | Out-Null

[System.IO.File]::WriteAllText($path, $script:result, [System.Text.UTF8Encoding]::new($false))

# ── Verifikasi ──────────────────────────────────────────────
$check = [System.IO.File]::ReadAllText($path)
Write-Host ("borderColor dipakai  : " + $check.Contains('color: borderColor,'))
Write-Host ("highlight biru       : " + $check.Contains('"#2563eb"'))
Write-Host ("dropdown             : " + $check.Contains('Desa tidak ditemukan'))
Write-Host ("SearchFlyTo mounted  : " + $check.Contains('<SearchFlyTo target={searchTarget}'))
Write-Host ("ref geojson          : " + $check.Contains('ref={desaGeoJsonRef as any}'))
Write-Host ("key token            : " + $check.Contains('searchTarget?.token || 0'))
