# Deploy ke server produksi pertanian.sistemdata.id
# Menggunakan PowerShell + pscp (PuTTY Secure Copy)
#
# KEAMANAN (perbaikan 2026-09-22, temuan audit): kredensial SSH TIDAK lagi
# hardcode di file ini. Nilai dibaca dari deploy.env yang TIDAK terlacak git.
# Format deploy.env: lihat deploy.env.example (host/port/user/password/path).

$scriptDir = "I:\pertanian\pertanian-2"
$pscpPath = "I:\Program Files\PuTTY\pscp.exe"
$envFile = Join-Path $scriptDir "deploy.env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: file deploy.env tidak ditemukan di $scriptDir" -ForegroundColor Red
    Write-Host "Kredensial SSH tidak lagi hardcode di deploy.ps1 (alasan keamanan)." -ForegroundColor Yellow
    Write-Host "Petunjuk: salin deploy.env.example menjadi deploy.env, lalu isi nilai produksi." -ForegroundColor Yellow
    Write-Host "deploy.env sudah masuk .gitignore sehingga tidak akan ter-commit." -ForegroundColor Yellow
    exit 1
}

# Baca deploy.env (format KEY=VALUE per baris; baris berawalan # = komentar)
$deployEnv = @{}
foreach ($line in Get-Content $envFile) {
    $t = $line.Trim()
    if ($t -and -not $t.StartsWith("#")) {
        $idx = $t.IndexOf("=")
        if ($idx -gt 0) {
            $deployEnv[$t.Substring(0, $idx).Trim()] = $t.Substring($idx + 1).Trim()
        }
    }
}

$sshHost     = $deployEnv["DEPLOY_SSH_HOST"]
$sshPort     = $deployEnv["DEPLOY_SSH_PORT"]
$sshUser     = $deployEnv["DEPLOY_SSH_USER"]
$sshPassword = $deployEnv["DEPLOY_SSH_PASSWORD"]
$remotePath  = $deployEnv["DEPLOY_REMOTE_PATH"]

$required = @("DEPLOY_SSH_HOST", "DEPLOY_SSH_PORT", "DEPLOY_SSH_USER", "DEPLOY_SSH_PASSWORD", "DEPLOY_REMOTE_PATH")
$missing = @($required | Where-Object { -not $deployEnv[$_] })
if ($missing.Count -gt 0) {
    Write-Host "ERROR: kunci wajib kosong/hilang di deploy.env: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Set-Location $scriptDir

Write-Host "Building project..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading dist/ to server via pscp..."
& $pscpPath -P $sshPort -pw $sshPassword -r dist/* "${sshUser}@${sshHost}:${remotePath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}
