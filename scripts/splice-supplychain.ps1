param()

$pagePath = "I:\pertanian\pertanian-2\src\pages\supply-chain.tsx"
$blockPath = "I:\pertanian\pertanian-2\scripts\supply-chain-section.txt"

$raw = [System.IO.File]::ReadAllText($pagePath)
$newLines = [System.IO.File]::ReadAllLines($blockPath)
# buang baris kosong trailing dari file blok
while ($newLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($newLines[$newLines.Count - 1])) {
    $newLines = $newLines[0..($newLines.Count - 2)]
}
$newBlock = ($newLines -join "`r`n")

$anchor = $raw.IndexOf("Daftar Nama Pasar per Jenis (Estimasi)")
if ($anchor -lt 0) { Write-Error "anchor tidak ditemukan"; exit 1 }

# mundur ke awal baris <section yang memuat anchor (2 baris ke atas)
$lineStart = $anchor
while ($lineStart -gt 0 -and $raw[$lineStart - 1] -ne "`n") { $lineStart-- }
# sekarang di awal baris <h3 ...>; mundur 1 baris lagi ke baris <section
$prevEnd = $lineStart - 1  # posisi '\n'
$sectionStart = $prevEnd - 1
while ($sectionStart -gt 0 -and $raw[$sectionStart - 1] -ne "`n") { $sectionStart-- }

$sectionLine = $raw.Substring($sectionStart, $lineStart - $sectionStart).Trim()
if ($sectionLine -notmatch '^<section') { Write-Error "bukan baris section: $sectionLine"; exit 1 }

$endTag = $raw.IndexOf("</section>", $anchor)
if ($endTag -lt 0) { Write-Error "end </section> tidak ditemukan"; exit 1 }
$endTagEnd = $endTag + "</section>".Length

$before = $raw.Substring(0, $sectionStart)
$after = $raw.Substring($endTagEnd)

$result = $before + $newBlock + $after
[System.IO.File]::WriteAllText($pagePath, $result, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("OK. sectionStart=" + $sectionStart + " endTagEnd=" + $endTagEnd + " len=" + $result.Length)
