# GPS Tracker startup script for Windows PowerShell
# Usage: .\start.ps1
#        .\start.ps1 --no-tunnel

param([switch]$NoTunnel)

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"
$LogDir      = Join-Path $ScriptDir ".logs"
$EnvFile     = Join-Path $ScriptDir ".env"

# Reload PATH so winget-installed tools are visible
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

function Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Load .env
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.+)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Preflight checks
$uvicorn = Join-Path $BackendDir ".venv\Scripts\uvicorn.exe"
if (-not (Test-Path $uvicorn)) {
    Err "Missing .venv, run: cd backend; python -m venv .venv; .venv\Scripts\pip install -r requirements.txt"
    exit 1
}
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Err "Missing node_modules, run: cd frontend; npm install"
    exit 1
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$jobs = @()

# --- Backend ---
Info "Starting backend (port 8000)..."
$backendLog = Join-Path $LogDir "backend.log"
$pythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"
$backendCmd = "`"$pythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
$backendJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","cd /d `"$BackendDir`" && $backendCmd" `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError  ($backendLog + ".err") `
    -NoNewWindow -PassThru
$jobs += $backendJob
Info "   Backend PID: $($backendJob.Id)  log: .logs\backend.log"

Start-Sleep -Seconds 2

# --- Frontend ---
Info "Starting frontend (port 5173)..."
$frontendLog = Join-Path $LogDir "frontend.log"
$frontendJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm run dev" `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $frontendLog `
    -RedirectStandardError  ($frontendLog + ".err") `
    -NoNewWindow -PassThru
$jobs += $frontendJob
Info "   Frontend PID: $($frontendJob.Id)  log: .logs\frontend.log"

# --- Cloudflare Tunnel ---
if (-not $NoTunnel) {
    $cfBin = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cfBin) {
        Info "Starting Cloudflare Tunnel..."
        $token = [System.Environment]::GetEnvironmentVariable("CLOUDFLARED_TOKEN","Process")
        $tunnelLog = Join-Path $LogDir "tunnel.log"
        if ($token) {
            $tunnelJob = Start-Process -FilePath $cfBin.Source `
                -ArgumentList "tunnel","run","--token",$token `
                -RedirectStandardOutput $tunnelLog `
                -RedirectStandardError  ($tunnelLog + ".err") `
                -NoNewWindow -PassThru
        } else {
            $tunnelJob = Start-Process -FilePath $cfBin.Source `
                -ArgumentList "tunnel","run","simworld2" `
                -RedirectStandardOutput $tunnelLog `
                -RedirectStandardError  ($tunnelLog + ".err") `
                -NoNewWindow -PassThru
        }
        $jobs += $tunnelJob
        Info "   Tunnel PID: $($tunnelJob.Id)  log: .logs\tunnel.log"
    } else {
        Warn "cloudflared not found, skipping tunnel"
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Public   : https://frontend.simworld.website"
Write-Host "  Press Ctrl+C to stop all services"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Tail logs
try {
    while ($true) {
        Start-Sleep -Seconds 3
        if (Test-Path $backendLog) {
            $lines = Get-Content $backendLog -Tail 3
            if ($lines) { $lines | ForEach-Object { Write-Host "[backend] $_" } }
        }
    }
} finally {
    Info "Stopping all services..."
    $jobs | ForEach-Object {
        if (-not $_.HasExited) { $_.Kill() }
    }
    Info "All stopped."
}
