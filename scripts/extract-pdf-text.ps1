param(
    [Parameter(Mandatory=$true)][string]$Path,
    [string]$OutFile = ""
)

$bytes = [System.IO.File]::ReadAllBytes($Path)
$raw = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($bytes)

$sb = New-Object System.Text.StringBuilder
$idx = 0
$streamCount = 0

while (($idx = $raw.IndexOf("stream", $idx)) -ge 0) {
    $start = $idx + 6
    # skip EOL after 'stream'
    if ($raw[$start] -eq "`r") { $start++ }
    if ($raw[$start] -eq "`n") { $start++ }
    $end = $raw.IndexOf("endstream", $start)
    if ($end -lt 0) { break }
    $len = $end - $start
    if ($len -gt 0) {
        $data = New-Object byte[] $len
        [System.Buffer]::BlockCopy($bytes, $start, $data, 0, $len)
        $text = $null
        try {
            $ms = New-Object System.IO.MemoryStream(,$data)
            # zlib: skip 2 header bytes
            $ms.Position = 2
            $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
            $out = New-Object System.IO.MemoryStream
            $ds.CopyTo($out)
            $ds.Close()
            $text = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($out.ToArray())
            $streamCount++
        } catch {
            $text = $null
        }
        if ($text) {
            # extract ( ) Tj and [ ] TJ strings
            $matches = [regex]::Matches($text, '\(((?:\\.|[^\\()])*)\)\s*(?:Tj|''|")|\[((?:\((?:\\.|[^\\()])*\)|[^\]])*)\]\s*TJ')
            foreach ($m in $matches) {
                $s = ""
                if ($m.Groups[1].Success -and $m.Groups[1].Value -ne "") {
                    $s = $m.Groups[1].Value
                } elseif ($m.Groups[2].Success) {
                    $inner = [regex]::Matches($m.Groups[2].Value, '\(((?:\\.|[^\\()])*)\)')
                    $s = (($inner | ForEach-Object { $_.Groups[1].Value }) -join "")
                }
                if ($s -ne "") {
                    $s = $s -replace '\\\(', '(' -replace '\\\)', ')' -replace '\\\\', '\'
                    $s = [regex]::Replace($s, '\\([0-7]{1,3})', { param($mm) [char][Convert]::ToInt32($mm.Groups[1].Value, 8) })
                    [void]$sb.Append($s)
                }
            }
            [void]$sb.Append("`n")
        }
    }
    $idx = $end + 9
}

Write-Output "Streams inflated: $streamCount"
$result = $sb.ToString()
if ($OutFile) {
    [System.IO.File]::WriteAllText($OutFile, $result, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "Ditulis ke $OutFile ($($result.Length) chars)"
} else {
    Write-Output $result
}
