# ============================================================
# SyntraLocalAI - Script de Inicialização de Dependências
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SYNTRA AI - Configuração de Sistema" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

function Write-Step($msg) { Write-Host "[>>] $msg" -ForegroundColor Yellow }
function Write-OK($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "[!!] $msg" -ForegroundColor Red }

# ---- 1. Detectar GPU (Especial para RX 580) ----
Write-Step "Detectando Hardware de Vídeo..."
$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
if ($gpu.Name -like "*Radeon*" -or $gpu.Name -like "*AMD*") {
    Write-OK "GPU AMD Detectada: $($gpu.Name)"
    Write-Host "  -> O Ollama usará aceleração DirectCompute/ROCm automaticamente." -ForegroundColor Gray
} else {
    Write-OK "Processando via: $($gpu.Name)"
}

# ---- 2. Verificar Python ----
Write-Step "Verificando Python..."
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-OK "Python presente."
} else {
    Write-Step "Instalando Python 3.11 via winget..."
    winget install -e --id Python.Python.3.11 --accept-source-agreements --accept-package-agreements --silent
}

# ---- 3. Verificar/Instalar Ollama ----
Write-Step "Verificando Ollama..."
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-OK "Ollama presente."
} else {
    Write-Step "Baixando Ollama..."
    $installer = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installer
    Write-Step "Executando instalador (aguarde)..."
    Start-Process -FilePath $installer -ArgumentList "/S" -Wait
    Write-OK "Ollama instalado."
}

# ---- 4. Baixar Modelo ----
Write-Step "Garantindo modelo Mistral (pode demorar)..."
# Inicia o serviço se não estiver rodando
Start-Process "ollama" "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5
ollama pull mistral

# ---- 5. Verificar Whisper (STT) ----
Write-Step "Verificando Whisper (OpenAI)..."
try {
    pip install openai-whisper --quiet
    Write-OK "Whisper configurado."
} catch {
    Write-Err "Erro ao instalar Whisper via pip."
}

# ---- 6. Verificar ffmpeg ----
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Step "Instalando ffmpeg..."
    winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements --silent
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SISTEMA PRONTO PARA O SYNTRA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Start-Sleep -Seconds 3
