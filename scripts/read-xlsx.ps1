param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$SheetIndex = 1,
    [int]$MaxRows = 200
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
try {
    # shared strings
    $shared = @()
    $ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
    if ($ssEntry) {
        $sr = New-Object System.IO.StreamReader($ssEntry.Open())
        [xml]$ssXml = $sr.ReadToEnd()
        $sr.Close()
        $ns = New-Object System.Xml.XmlNamespaceManager($ssXml.NameTable)
        $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
        foreach ($si in $ssXml.SelectNodes('//x:si', $ns)) {
            $texts = $si.SelectNodes('.//x:t', $ns) | ForEach-Object { $_.'#text' }
            $shared += ($texts -join '')
        }
    }

    # workbook rels to resolve sheet target
    [xml]$wb = (New-Object System.IO.StreamReader(($zip.Entries | Where-Object { $_.FullName -eq 'xl/workbook.xml' }).Open())).ReadToEnd()
    [xml]$rels = (New-Object System.IO.StreamReader(($zip.Entries | Where-Object { $_.FullName -eq 'xl/_rels/workbook.xml.rels' }).Open())).ReadToEnd()
    $nsWb = New-Object System.Xml.XmlNamespaceManager($wb.NameTable)
    $nsWb.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $nsWb.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $sheets = $wb.SelectNodes('//x:sheets/x:sheet', $nsWb)
    $sheet = $sheets[$SheetIndex - 1]
    $rid = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $target = ($rels.Relationships.Relationship | Where-Object { $_.Id -eq $rid }).Target
    if ($target -notmatch '^xl/') { $target = 'xl/' + $target.TrimStart('/') }

    $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq $target }
    if (-not $sheetEntry) { Write-Error "Sheet entry not found: $target"; exit 1 }
    $sr2 = New-Object System.IO.StreamReader($sheetEntry.Open())
    [xml]$sx = $sr2.ReadToEnd()
    $sr2.Close()
    $ns2 = New-Object System.Xml.XmlNamespaceManager($sx.NameTable)
    $ns2.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

    Write-Output ("# FILE: " + (Split-Path $Path -Leaf) + "  SHEET: " + $sheet.name)
    $rowNum = 0
    foreach ($row in $sx.SelectNodes('//x:sheetData/x:row', $ns2)) {
        $rowNum++
        if ($rowNum -gt $MaxRows) { break }
        $cells = @{}
        $maxCol = 0
        foreach ($c in $row.SelectNodes('x:c', $ns2)) {
            $ref = $c.r
            if ($ref -match '^([A-Z]+)(\d+)$') {
                $letters = $Matches[1]
                $col = 0
                foreach ($ch in $letters.ToCharArray()) { $col = $col * 26 + ([int][char]$ch - 64) }
                $t = $c.t
                $vNode = $c.SelectSingleNode('x:v', $ns2)
                $val = ''
                if ($t -eq 's' -and $vNode) {
                    $val = $shared[[int]$vNode.InnerText]
                } elseif ($t -eq 'inlineStr') {
                    $is = $c.SelectSingleNode('x:is', $ns2)
                    if ($is) { $val = (($is.SelectNodes('.//x:t', $ns2) | ForEach-Object { $_.'#text' }) -join '') }
                } elseif ($vNode) {
                    $val = $vNode.InnerText
                }
                $cells[$col] = $val
                if ($col -gt $maxCol) { $maxCol = $col }
            }
        }
        $parts = for ($i = 1; $i -le [Math]::Max($maxCol, 1); $i++) {
            if ($cells.ContainsKey($i)) { $cells[$i] } else { '' }
        }
        Write-Output ("R{0}: {1}" -f $row.r, ($parts -join ' | '))
    }
} finally {
    $zip.Dispose()
}
