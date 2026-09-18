param([string]$File)
$i = 0
Get-Content $File | ForEach-Object {
  $i++
  Write-Output (('{0,4}: {1}' -f $i, $_))
}
