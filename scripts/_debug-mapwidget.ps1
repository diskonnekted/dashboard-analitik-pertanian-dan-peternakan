$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\components\MapWidget.tsx")
Write-Host ("CRLF? " + ($raw -match "`r`n"))
$i = $raw.IndexOf("return {")
Write-Host ("IndexOf 'return {' : " + $i)
$seg = $raw.Substring($i, 130)
Write-Host ("SEGMENT: [" + ($seg -replace "`n", "\n" -replace "`r", "\r") + "]")
Write-Host ("Contains color line : " + $raw.Contains('color: "#1f2937",'))
$nl = "`n"
$test1 = "return {" + $nl + "      fillColor,"
Write-Host ("Contains return+nl+fillColor : " + $raw.Contains($test1))
# search bar block
$j = $raw.IndexOf("TOP RIGHT: Search Bar")
Write-Host ("IndexOf Search Bar comment : " + $j)
$seg2 = $raw.Substring($j - 30, 200)
Write-Host ("SEG2: [" + ($seg2 -replace "`n", "\n" -replace "`r", "\r") + "]")
