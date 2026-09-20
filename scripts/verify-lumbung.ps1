param()

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-XlsxGrid([string]$Path) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $shared = @()
        $ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
        if ($ssEntry) {
            $sr = New-Object System.IO.StreamReader($ssEntry.Open())
            [xml]$ssXml = $sr.ReadToEnd(); $sr.Close()
            $ns = New-Object System.Xml.XmlNamespaceManager($ssXml.NameTable)
            $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
            foreach ($si in $ssXml.SelectNodes('//x:si', $ns)) {
                $shared += (($si.SelectNodes('.//x:t', $ns) | ForEach-Object { $_.'#text' }) -join '')
            }
        }
        $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
        $sr2 = New-Object System.IO.StreamReader($sheetEntry.Open())
        [xml]$sx = $sr2.ReadToEnd(); $sr2.Close()
        $ns2 = New-Object System.Xml.XmlNamespaceManager($sx.NameTable)
        $ns2.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
        $grid = @{}
        foreach ($row in $sx.SelectNodes('//x:sheetData/x:row', $ns2)) {
            $rIdx = [int]$row.r
            $cells = @{}
            foreach ($c in $row.SelectNodes('x:c', $ns2)) {
                if ($c.r -match '^([A-Z]+)(\d+)$') {
                    $col = 0
                    foreach ($ch in $Matches[1].ToCharArray()) { $col = $col * 26 + ([int][char]$ch - 64) }
                    $t = $c.t; $vNode = $c.SelectSingleNode('x:v', $ns2); $val = ''
                    if ($t -eq 's' -and $vNode) { $val = $shared[[int]$vNode.InnerText] }
                    elseif ($t -eq 'inlineStr') { $is = $c.SelectSingleNode('x:is', $ns2); if ($is) { $val = (($is.SelectNodes('.//x:t', $ns2) | ForEach-Object { $_.'#text' }) -join '') } }
                    elseif ($vNode) { $val = $vNode.InnerText }
                    $cells[$col] = $val
                }
            }
            $grid[$rIdx] = $cells
        }
        return $grid
    } finally { $zip.Dispose() }
}

function Clean-Name([string]$n) { return ($n -replace '\s+', '').Trim() }

$tmpDir = "I:\pertanian\pertanian-2\public\14. Distankan KP\Banyaknya Lumbung dan Gudang Pangan\_tmp"
$files = Get-ChildItem "$tmpDir\*.xlsx" | Sort-Object Name

$xlsxData = @{}   # year -> name -> @(jumlah, kapasitas)
foreach ($f in $files) {
    $grid = Read-XlsxGrid $f.FullName
    # detect year from title rows (R1..R4)
    $title = ''
    foreach ($r in 1..4) { if ($grid.ContainsKey($r)) { foreach ($k in $grid[$r].Keys) { $title += ' ' + $grid[$r][$k] } } }
    $year = $null
    if ($title -match '(20\d\d)') { $year = $Matches[1] }
    Write-Output ("=== " + $f.Name + "  => tahun terdeteksi: " + $year)
    $xlsxData[$year] = @{}
    foreach ($rIdx in ($grid.Keys | Sort-Object)) {
        $cells = $grid[$rIdx]
        $name = ''
        foreach ($k in (2,1,3)) { if ($cells.ContainsKey($k) -and $cells[$k] -match '[A-Za-z]') { $name = Clean-Name $cells[$k]; break } }
        if ($name -and $name -notmatch '^(Kecamatan|Subdistrict|Table|Tabel|Jumlah)$') {
            $jumlah = ''; $kap = ''
            # find numeric cols: jumlah ~ col 4 or 5, kapasitas next
            $nums = @()
            foreach ($k in ($cells.Keys | Sort-Object)) { if ($cells[$k] -match '^-?[\d\.,]+$') { $nums += @($k, $cells[$k]) } }
            if ($cells.ContainsKey(4) -and $cells[4] -match '^[\d\.]') { $jumlah = $cells[4] }
            elseif ($cells.ContainsKey(5) -and $cells[5] -match '^[\d\.]') { $jumlah = $cells[5] }
            if ($cells.ContainsKey(5) -and $cells[5] -match '^[\d\.]' -and $jumlah -ne $cells[5]) { $kap = $cells[5] }
            elseif ($cells.ContainsKey(6) -and $cells[6] -match '^[\d\.]') { $kap = $cells[6] }
            if ($jumlah -ne '') {
                $xlsxData[$year][$name] = @($jumlah, $kap)
                Write-Output ("   " + $name + " = " + $jumlah + " / " + $kap)
            }
        }
        if ($name -eq 'Jumlah' -or ($cells.ContainsKey(1) -and ((Clean-Name $cells[1]) -eq 'Jumlah'))) {
            $numsAll = @()
            foreach ($k in ($cells.Keys | Sort-Object)) { if ($cells[$k] -match '^-?[\d\.]+$') { $numsAll += $cells[$k] } }
            Write-Output ("   JUMLAH RESMI = " + ($numsAll -join ' / '))
        }
    }
}

# Compare with CSV
Write-Output "`n=== PERBANDINGAN CSV vs XLSX ==="
$csv = Import-Csv "I:\pertanian\pertanian-2\public\14. Distankan KP\Banyaknya Lumbung dan Gudang Pangan\Banyaknya Lumbung dan Gudang Pangan CSV.csv"
$mismatch = 0; $match = 0; $missing = 0
foreach ($row in $csv) {
    $y = [string]$row.Tahun
    $n = (Clean-Name $row.Kecamatan)
    if ($xlsxData.ContainsKey($y) -and $xlsxData[$y].ContainsKey($n)) {
        $xj = [double]($xlsxData[$y][$n][0]); $xk = 0.0
        if ($xlsxData[$y][$n][1] -ne '') { $xk = [double]($xlsxData[$y][$n][1]) }
        $cj = [double]$row.'Lumbung Jumlah'; $ck = 0.0
        if ($row.'Lumbung Kapasitas' -ne '') { $ck = [double]$row.'Lumbung Kapasitas' }
        if ([Math]::Abs($xj - $cj) -lt 0.001 -and [Math]::Abs($xk - $ck) -lt 0.01) { $match++ }
        else { $mismatch++; Write-Output ("BEDA ${y} ${n}: CSV=$cj/$ck vs XLSX=$xj/$xk") }
    } else { $missing++; Write-Output ("TAK ADA DI XLSX: ${y} ${n}") }
}
Write-Output ("`nMatch=$match  Mismatch=$mismatch  Missing=$missing")
