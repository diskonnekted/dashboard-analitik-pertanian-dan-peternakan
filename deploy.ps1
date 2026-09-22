# ============================================================================
# deploy.ps1 - SISPERTANI produksi di CloudPanel (pola 1 x Node.js Site)
#
# Upload backend (src/, package.json, .env) + frontend (dist/) ke Application
# Root. Aplikasi dijalankan CloudPanel sebagai service system - restart
# dilakukan lewat UI CloudPanel (Sites -> <site> -> Node.js -> Restart).
#
# Semua kredensial dibaca dari deploy.env (untracked). Lihat deploy.env.example.
#
# Pemakaian:
#   .\deploy.ps1                 build frontend + upload penuh
#   .\deploy.ps1 -ImportDb       + dump DB lokal -> import ke DB CloudPanel
#   .\deploy.ps1 -SkipBuild      pakai dist/ yang sudah ada (tanpa build ulang)
#   .\deploy.ps1 -SkipBackend    hanya upload dist/ (backend tidak disentuh)
#   .\deploy.ps1 -NoEnvUpload    jangan timpa .env di server
#   .\deploy.ps1 -NoVerify       tanpa polling verifikasi di akhir
# ============================================================================
param(
  [switch]$SkipBuild,
  [switch]$SkipBackend,
  [switch]$NoEnvUpload,
  [switch]$ImportDb,
  [switch]$NoVerify
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- kredensial dari deploy.env --------------------------------------------
$envPath = Join-Path $root 'deploy.env'
if (-not (Test-Path $envPath)) {
  Write-Host "deploy.env tidak ditemukan - salin dari deploy.env.example lalu isi." -ForegroundColor Red
  exit 1
}
Get-Content $envPath | Where-Object { $_ -match '^[A-Z_][A-Z0-9_]*\s*=' } | ForEach-Object {
  $i = $_.IndexOf('=')
  $k = $_.Substring(0, $i).Trim()
  $v = $_.Substring($i + 1).Trim()
  Set-Item -Path ("Env:" + $k) -Value $v
}
foreach ($k in @('DEPLOY_SSH_HOST','DEPLOY_SSH_PORT','DEPLOY_SSH_USER','DEPLOY_SSH_PASSWORD','DEPLOY_APP_ROOT')) {
  if (-not (Get-Item ("Env:" + $k) -ErrorAction SilentlyContinue)) {
    Write-Host "deploy.env: $k belum diisi." -ForegroundColor Red
    exit 1
  }
}
$SSH_HOST = $env:DEPLOY_SSH_HOST
$SSH_PORT = $env:DEPLOY_SSH_PORT
$SSH_USER = $env:DEPLOY_SSH_USER
$SSH_PASS = $env:DEPLOY_SSH_PASSWORD
$APP_ROOT = $env:DEPLOY_APP_ROOT

$plink = 'I:\Program Files\PuTTY\plink.exe'
$pscp  = 'I:\Program Files\PuTTY\pscp.exe'
foreach ($t in @($plink, $pscp)) {
  if (-not (Test-Path $t)) { Write-Host "Tool tidak ditemukan: $t" -ForegroundColor Red; exit 1 }
}

function Remote([string]$cmd) {
  # EAP 'Continue' lokal: stderr plink (mis. warning mysql) tidak boleh
  # memicu terminating error PowerShell 5.1; kegagalan nyata = exit code != 0.
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { & $plink -ssh -batch -P $SSH_PORT -pw $SSH_PASS "$SSH_USER@$SSH_HOST" $cmd 2>&1 | Out-Host; $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = $prev }
  if ($code -ne 0) { throw "Perintah remote gagal (exit $code): $cmd" }
}
function Upload([string]$local, [string]$remotePath) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { & $pscp -batch -P $SSH_PORT -pw $SSH_PASS -r $local "${SSH_USER}@${SSH_HOST}:${remotePath}" 2>&1 | Out-Host; $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = $prev }
  if ($code -ne 0) { throw "pscp gagal (exit $code): $local -> $remotePath" }
}

# --- 0. trust host key server (sekali saja; -batch menolak host tak dikenal) -
& $plink -ssh -batch -P $SSH_PORT -pw $SSH_PASS "$SSH_USER@$SSH_HOST" "echo ok" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Menerima host key server (sekali)..." -ForegroundColor Yellow
  echo y | & $plink -ssh -P $SSH_PORT -pw $SSH_PASS "$SSH_USER@$SSH_HOST" "echo ok" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Tidak bisa tersambung ke server." }
}

# --- 1. build frontend ------------------------------------------------------
if (-not $SkipBuild) {
  Write-Host "`n[1/5] npm run build (frontend)..." -ForegroundColor Cyan
  Push-Location $root
  try { npm run build } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "Build frontend gagal." }
} else {
  Write-Host "`n[1/5] Build dilewati (-SkipBuild)." -ForegroundColor DarkGray
}

# --- 2. siapkan folder remote ----------------------------------------------
Write-Host "`n[2/5] Siapkan folder remote ($APP_ROOT)..." -ForegroundColor Cyan
Remote ('bash -lc ''mkdir -p {0}/src {0}/dist''' -f $APP_ROOT)

# --- 3. upload backend + dist ----------------------------------------------
Write-Host "`n[3/5] Upload backend + dist..." -ForegroundColor Cyan
if (-not $SkipBackend) {
  Upload (Join-Path $root 'backend\src\*')   "$APP_ROOT/src/"
  Upload (Join-Path $root 'backend\package.json') "$APP_ROOT/package.json"
  $envProd = Join-Path $root 'backend\.env.prod'
  if ((Test-Path $envProd) -and -not $NoEnvUpload) {
    Upload $envProd "$APP_ROOT/.env"
    Write-Host "  backend/.env.prod -> ${APP_ROOT}/.env" -ForegroundColor Gray
  } else {
    Write-Host "  .env server tidak diubah (tidak ada .env.prod / -NoEnvUpload)." -ForegroundColor DarkGray
  }
  Write-Host "  npm install --omit=dev di server (nvm)..." -ForegroundColor Gray
  Remote ('bash -lc ''export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh >/dev/null 2>&1; cd {0} && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -n 5''' -f $APP_ROOT)
} else {
  Write-Host "  Backend dilewati (-SkipBackend)." -ForegroundColor DarkGray
}
Upload (Join-Path $root 'dist\*') "$APP_ROOT/dist/"

# --- 4. import DB (opsional) ------------------------------------------------
if ($ImportDb) {
  Write-Host "`n[4/5] Dump DB lokal -> import ke server..." -ForegroundColor Cyan
  foreach ($k in @('LOCAL_DB_NAME','LOCAL_DB_USER','DEPLOY_DB_NAME','DEPLOY_DB_USER','DEPLOY_DB_PASSWORD')) {
    if (-not (Get-Item ("Env:" + $k) -ErrorAction SilentlyContinue)) {
      Write-Host "deploy.env: $k belum diisi (dibutuhkan -ImportDb)." -ForegroundColor Red
      exit 1
    }
  }
  $dump = Join-Path $root '_tmp\sispertani-prod-dump.sql'
  $dumpTool = if ($env:LOCAL_MYSQLDUMP) { $env:LOCAL_MYSQLDUMP } else { 'mysqldump' }
  $dumpArgs = '-u ' + $env:LOCAL_DB_USER
  if ($env:LOCAL_DB_PASS) { $dumpArgs += ' -p' + $env:LOCAL_DB_PASS }
  $dumpArgs += ' --no-tablespaces --single-transaction --default-character-set=utf8mb4 ' + $env:LOCAL_DB_NAME
  $cmdline = '"' + $dumpTool + '" ' + $dumpArgs + ' > "' + $dump + '"'
  cmd /c $cmdline
  if ($LASTEXITCODE -ne 0) { throw "mysqldump gagal." }
  $size = (Get-Item $dump).Length
  if ($size -lt 200KB) { throw "Dump mencurigakan ($size bytes) - cek kredensial DB lokal." }
  Write-Host ("  dump lokal: {0:N0} bytes" -f $size)
  Upload $dump "$APP_ROOT/db-import.sql"
  Remote ('bash -lc ''cd {0} && /usr/bin/mysql -u {1} -p{2} {3} < db-import.sql && rm db-import.sql && echo IMPORT_OK''' -f $APP_ROOT, $env:DEPLOY_DB_USER, $env:DEPLOY_DB_PASSWORD, $env:DEPLOY_DB_NAME)
} else {
  Write-Host "`n[4/5] Import DB dilewati (tanpa -ImportDb)." -ForegroundColor DarkGray
}

# --- 5. restart (PM2) + verifikasi ------------------------------------------
Write-Host "`n[5/5] Restart aplikasi via PM2..." -ForegroundColor Cyan
if (-not $SkipBackend) {
  Remote ('bash -lc ''export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh >/dev/null 2>&1; cd {0} && (pm2 restart sispertani-api 2>/dev/null || pm2 start ecosystem.config.cjs) && pm2 save >/dev/null 2>&1; echo PM2_OK''' -f $APP_ROOT)
} else {
  Write-Host "  Restart dilewati (-SkipBackend)." -ForegroundColor DarkGray
}
if ($NoVerify) {
  Write-Host "  Verifikasi dilewati (-NoVerify). Cek manual: https://<domain>/sispertani-api/health" -ForegroundColor DarkGray
} else {
  if (-not $env:DEPLOY_DOMAIN) { Write-Host "  DEPLOY_DOMAIN belum diisi - verifikasi dilewati." -ForegroundColor DarkGray; exit 0 }
  Write-Host "  Menunggu API hidup (polling /sispertani-api/health tiap 5 dtk)..." -ForegroundColor Gray
  $ok = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 5
    $code = curl.exe -s -o NUL -w "%{http_code}" "https://$($env:DEPLOY_DOMAIN)/sispertani-api/health" 2>$null
    if ("$code" -eq '200') { $ok = $true; break }
    Write-Host "    ($($i+1)/40) HTTP=$code..."
  }
  if ($ok) {
    Write-Host "  API LIVE: https://$($env:DEPLOY_DOMAIN)/sispertani-api/health -> 200 OK" -ForegroundColor Green
    Write-Host "  Frontend : https://$($env:DEPLOY_DOMAIN)/" -ForegroundColor Green
  } else {
    Write-Host "  API belum hidup setelah 200 dtk. Cek via SSH: pm2 list / pm2 logs sispertani-api." -ForegroundColor Red
    exit 1
  }
}
