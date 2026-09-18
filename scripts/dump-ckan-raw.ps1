param(
  [Parameter(Mandatory=$true)]
  [string]$Pkg,
  [string]$CkanBase = "https://opendata.banjarnegarakab.go.id"
)
$ErrorActionPreference = 'Stop'
$p = Invoke-RestMethod -Uri "$CkanBase/api/3/action/package_show?id=$Pkg" -TimeoutSec 60
$res = $p.result.resources | Where-Object { "$($_.datastore_active)" -ieq 'true' } | Select-Object -First 1
if (-not $res) {
  Write-Output "NO DATASTORE ACTIVE. Available resources:"
  $p.result.resources | ForEach-Object { Write-Output ("  " + $_.id + " " + $_.format + " " + $_.name) }
  exit 1
}
$d = Invoke-RestMethod -Uri "$CkanBase/api/3/action/datastore_search?resource_id=$($res.id)&limit=1000" -TimeoutSec 60
$d.result.records | ConvertTo-Json -Depth 5
