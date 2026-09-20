$path = "I:\pertanian\pertanian-2\src\components\MapWidget.tsx"
$raw = [System.IO.File]::ReadAllText($path)
$nl = "`r`n"

# Pola lama PERSIS (ada trailing space di baris <input, type="text", placeholder)
$old = '      {/* --- TOP RIGHT: Search Bar --- */}' + $nl +
'      <div className="absolute top-3 right-3 z-[1000] flex">' + $nl +
'        <div className="bg-white border border-slate-200 shadow-sm flex items-center p-1 w-[190px] transition-all focus-within:w-[230px] rounded-lg">' + $nl +
'          <Search className="text-neutral-400 mx-2" size={16} />' + $nl +
'          <input ' + $nl +
'            type="text" ' + $nl +
'            placeholder="CARI DESA..." ' + $nl +
'            className="w-full font-mono text-[11px] font-bold uppercase focus:outline-none bg-transparent"' + $nl +
'            value={searchQuery}' + $nl +
'            onChange={(e) => setSearchQuery(e.target.value)}' + $nl +
'          />' + $nl +
'          {searchQuery && (' + $nl +
'            <button onClick={() => setSearchQuery("")} className="px-2 font-black text-red-500 hover:bg-red-50">X</button>' + $nl +
'          )}' + $nl +
'        </div>' + $nl +
'      </div>'

if (-not $raw.Contains($old)) { throw "pola lama tetap tidak cocok" }

$newLf = @'
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

$new = $newLf -replace "`n", "`r`n"
$raw = $raw.Replace($old, $new)
[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))

$check = [System.IO.File]::ReadAllText($path)
Write-Host ("dropdown hasil       : " + $check.Contains('Desa tidak ditemukan'))
Write-Host ("handleSelectDesa UI  : " + $check.Contains('onClick={() => handleSelectDesa(item)}'))
Write-Host ("overlay close        : " + $check.Contains('fixed inset-0 z-0'))
Write-Host ("Enter/Escape         : " + $check.Contains('e.key === "Enter"'))
