import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { spawn, exec, ChildProcess } from 'child_process';

const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Lazy imports to avoid circular deps
import { setIpcSender } from '../backend/utils/logger';
import { setTTSIpcSender, speak } from '../backend/services/ttsService';
import { queryLLM, checkOllamaHealth } from '../backend/services/llmService';
import { transcribeAudio, checkWhisperAvailable } from '../backend/services/whisperService';
import { parseIntent } from '../backend/core/intentParser';
import { executeIntent } from '../backend/core/commandExecutor';
import memoryService from '../backend/services/memoryService';
import voiceListener from '../backend/audio/voiceListener';
import logger from '../backend/utils/logger';

// Ensure tmp dir exists
const tmpDir = path.resolve(process.env['TEMP_DIR'] ?? './tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: ChildProcess | null = null;

function spawnOllama(): void {
  try {
    logger.info('Main', '🟢 Iniciando motor Ollama (ollama serve)...');
    sendToRenderer('log-entry', { level: 'info', message: 'Status Ollama: Iniciando processo em background...' });
    
    const localAppData = process.env.LOCALAPPDATA || '';
    const ollamaPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
    const command = fs.existsSync(ollamaPath) ? ollamaPath : 'ollama';

    logger.info('Main', `Usando comando: ${command}`);

    ollamaProcess = spawn(command, ['serve'], {
      detached: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ollamaProcess.stdout?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) logger.debug('Ollama', msg);
    });

    ollamaProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (!msg) return;
      
      // Somente logar erros/avisos críticos para o renderer para não poluir
      const isCritical = msg.includes('level=ERROR') || msg.includes('level=FATAL') || msg.toLowerCase().includes('error');
      
      if (isCritical) {
        logger.error('Ollama-Err', msg);
        sendToRenderer('log-entry', { level: 'error', message: `Ollama Crítico: ${msg.substring(0, 100)}` });
      } else {
        // Info/Warn ficam apenas no log de arquivo do Main para debug
        logger.debug('Ollama-Info', msg);
      }
    });

    ollamaProcess.on('error', (err) => {
      const errMsg = `Erro ao iniciar Ollama (Processo): ${err.message}`;
      logger.error('Main', errMsg);
      sendToRenderer('log-entry', { level: 'error', message: errMsg });
    });

    ollamaProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        const msg = `Ollama encerrou inesperadamente (Código: ${code}, Sinal: ${signal})`;
        logger.warn('Main', msg);
        sendToRenderer('log-entry', { level: 'warn', message: msg });
      }
    });

    logger.info('Main', 'Processo Ollama disparado.');
  } catch (e: any) {
    logger.error('Main', 'Exceção fatal ao iniciar Ollama', e);
  }
}

function startBackgroundServices(): void {
  // Start Ollama explicitly
  spawnOllama();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#050505',
    frame: false,
    transparent: false,
    resizable: true,
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  if (process.env['DEBUG_MODE'] === 'true' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

async function runVoicePipeline(wavPath: string): Promise<void> {
  try {
    sendToRenderer('status-change', 'processing');

    // STT
    sendToRenderer('status-text', 'Transcrevendo...');
    const transcript = await transcribeAudio(wavPath);
    if (!transcript || transcript.trim().length < 2) {
      sendToRenderer('status-change', 'listening');
      return;
    }

    sendToRenderer('transcript', transcript);
    sendToRenderer('status-text', 'Pensando...');
    logger.info('Main', `Transcrição: "${transcript}"`);

    // LLM
    const llmResponse = await queryLLM(transcript);
    const parsedIntent = parseIntent(llmResponse, transcript);

    sendToRenderer('status-change', 'speaking');
    sendToRenderer('response', parsedIntent.response ?? `Executando: ${parsedIntent.intent}`);

    // Save to memory
    memoryService.saveInteraction({
      input: transcript,
      intent: parsedIntent.intent,
      response: parsedIntent.response,
      params: JSON.stringify(parsedIntent.params),
    });

    // Execute command
    if (parsedIntent.intent !== 'chat') {
      await executeIntent(parsedIntent);
    }

    // Speak response
    if (parsedIntent.response) {
      await speak(parsedIntent.response);
    }

    sendToRenderer('status-change', 'listening');

  } catch (err) {
    logger.error('Main', 'Erro no pipeline de voz', err);
    sendToRenderer('status-change', 'idle');
    sendToRenderer('log-entry', { level: 'error', message: String(err) });

  }
}

function setupAudioPipeline(): void {
  // Voice listener receives recorded audio blobs from the renderer
  voiceListener.on('recording-complete', async (audioPath: string) => {
    await runVoicePipeline(audioPath);
  });

  voiceListener.start();
  logger.info('Main', 'Pipeline de áudio inicializado (MediaRecorder mode).');
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Manual text input from renderer
  ipcMain.on('send-text', async (_event: IpcMainEvent, text: string) => {
    logger.info('Main', `Comando de texto: "${text}"`);
    const llmResponse = await queryLLM(text);
    const parsedIntent = parseIntent(llmResponse, text);

    sendToRenderer('transcript', text);
    sendToRenderer('response', parsedIntent.response ?? `Executando: ${parsedIntent.intent}`);
    sendToRenderer('status-change', 'speaking');

    memoryService.saveInteraction({
      input: text,
      intent: parsedIntent.intent,
      response: parsedIntent.response,
      params: JSON.stringify(parsedIntent.params),
    });

    if (parsedIntent.intent !== 'chat') {
      await executeIntent(parsedIntent);
    }

    if (parsedIntent.response) {
      await speak(parsedIntent.response);
    }

    sendToRenderer('status-change', 'listening');
  });

  ipcMain.on('get-history', (_event: IpcMainEvent) => {
    const history = memoryService.getHistory(20);
    sendToRenderer('history-data', history);
  });

  ipcMain.on('clear-history', () => {
    memoryService.clearHistory();
    sendToRenderer('log-entry', { level: 'info', message: 'Histórico limpo.' });
  });

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  // Receive recorded audio blob from Renderer (MediaRecorder API)
  ipcMain.on('recorded-audio', (_event: IpcMainEvent, data: Uint8Array) => {
    const nodeBuffer = Buffer.from(data);
    logger.info('Main', `Áudio recebido do Renderer: ${nodeBuffer.length} bytes`);
    voiceListener.receiveRecordedAudio(nodeBuffer);
  });

  ipcMain.on('run-setup-script', async () => {
    logger.info('Main', 'Iniciando script de instalação a pedido do usuário...');
    sendToRenderer('log-entry', { level: 'info', message: '🚀 Iniciando instalador de dependências... Aguarde a janela do PowerShell.' });
    
    const scriptPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app', 'install.ps1')
      : path.join(__dirname, '..', '..', 'install.ps1');

    const cmd = `start powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    
    exec(cmd, (err: Error | null) => {
      if (err) {
        logger.error('Main', 'Erro ao abrir instalador', err);
        sendToRenderer('log-entry', { level: 'error', message: `Erro ao abrir instalador: ${err.message}` });
      }
    });
  });
}

// Helper to wait
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function checkDependencies(): Promise<void> {
  let ollamaOk = false;
  


  sendToRenderer('log-entry', { level: 'info', message: '📡 Conectando ao motor de IA (Ollama)...' });
  
  const maxAttempts = 10;
  for (let i = 1; i <= maxAttempts; i++) {
    sendToRenderer('log-entry', { level: 'info', message: `Tentativa de conexão ${i}/${maxAttempts}...` });
    logger.info('Main', `Aguardando Ollama responder na porta 11434 (tentativa ${i}/${maxAttempts})...`);
    
    // Check if the server is finally up
    const isHealthy = await checkOllamaHealth();
    if (isHealthy) {
      sendToRenderer('log-entry', { level: 'info', message: '🟢 Status Ollama: Servidor Online e respondendo!' });
      ollamaOk = true;
      break;
    }
    
    if (i < maxAttempts) {
      const waitTime = i < 5 ? 30 : 60; // 30s for first 4, 60s for 5-9
      sendToRenderer('log-entry', { level: 'info', message: `⏳ Status Ollama: Carregando banco de dados local... (aguardando ${waitTime}s)` });
      await delay(waitTime * 1000);
    }
  }

  // Se falhou as 10 tentativas, então mata e dá erro
  if (!ollamaOk) {
    sendToRenderer('log-entry', { level: 'warn', message: '⚠ Ollama não respondeu após 10 tentativas. Forçando encerramento do motor...' });
    logger.error('Main', 'Ollama falhou completamente após 10 tentativas.');

    if (ollamaProcess && !ollamaProcess.killed) {
      ollamaProcess.kill('SIGKILL');
    }

    sendToRenderer('log-entry', { level: 'error', message: '❌ ERRO: Ollama não iniciou. Verifique seu antivírus ou rode "ollama serve" manualmente.' });
  }

  const whisperOk = await checkWhisperAvailable();

  sendToRenderer('dependency-status', { ollama: ollamaOk, whisper: whisperOk });

  if (!ollamaOk || !whisperOk) {
    logger.warn('Main', 'Dependências faltando. O usuário pode precisar rodar o instalador.');
    sendToRenderer('log-entry', { 
      level: 'warn', 
      message: '⚠️ Algumas dependências estão faltando. Clique no ícone de engrenagem (se disponível) ou aguarde a configuração automática.' 
    });
  } else {
    logger.info('Main', 'Ollama conectado com sucesso nas checagens principais!');
  }
}

app.on('ready', async () => {
  createWindow();
  startBackgroundServices();

  // Setup IPC sender for logger and TTS
  setIpcSender(sendToRenderer);
  setTTSIpcSender(sendToRenderer);

  // Wait for renderer to load
  setTimeout(async () => {
    await checkDependencies();
    setupIpcHandlers();
    setupAudioPipeline();
    sendToRenderer('status-change', 'listening');
    sendToRenderer('status-text', 'Aguardando comando...');
    logger.info('Main', 'JarvisAI inicializado com sucesso!');
  }, 1500);
});

app.on('window-all-closed', () => {
  voiceListener.stop();
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
