# Deploy ke server produksi pertanian.sistemdata.id
# Menggunakan PowerShell + pscp (PuTTY Secure Copy)

$scriptDir = "I:\pertanian\pertanian-2"
$pscpPath = "I:\Program Files\PuTTY\pscp.exe"

Set-Location $scriptDir

Write-Host "Building project..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading dist/ to server via pscp..."
& $pscpPath -P 64001 -pw "M6X8c2JgvFzNtniN3y5L" -r dist/* anian@103.255.133.227:/home/anian/htdocs/pertanian.sistemdata.id/

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}
