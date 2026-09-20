$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\pages\index.tsx")
function ShowAround([string]$needle, [int]$span = 180) {
  $i = $raw.IndexOf($needle)
  Write-Host ("=== '" + $needle + "' -> idx " + $i)
  if ($i -ge 0) {
    $s = [Math]::Max(0, $i - 50)
    $seg = $raw.Substring($s, $span)
    $seg = $seg.Replace("`r", "<CR>").Replace("`n", "<LF>`n")
    Write-Host ("[" + $seg + "]")
  }
}
ShowAround 'fetchLahanBanjarnegara'
ShowAround 'setLahanData'
ShowAround 'totalBukanSawah'
ShowAround 'Padi &amp; Palawija'
ShowAround 'Padi & Palawija'
ShowAround 'Tegalan'
ShowAround 'sub:'
