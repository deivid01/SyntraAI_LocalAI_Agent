import { app, BrowserWindow, ipcMain } from 'electron';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import logger from '../../core/logger';
import { config } from '../../core/config';
import { IpcController } from './IpcController';
import { llmService } from '../../ai/llmService';
import { whisperService } from '../../ai/whisperService';
import { memoryService } from '../../modules/memoryService';
import { ragService } from '../../ai/ragService';
import { speak, setTTSIpcSender } from '../../ai/ttsService';
import { parseIntent } from '../../core/intentParser';
import { executeIntent } from '../../automation/commandExecutor';
import { learningService } from '../../automation/learningService';
import { ragQueue } from '../../ai/ragQueue';
import fastPathRouter from '../../core/fastPathRouter';
import voiceListener from '../../modules/audio/voiceListener';
import hotwordService from '../../modules/audio/hotwordService';
import clapDetector from '../../modules/audio/clapDetector';
import { setIpcSender } from '../../core/logger';

export type AppState = 'idle' | 'listening' | 'recording' | 'processing' | 'speaking';

export class AppController {
  private static instance: AppController;
  private mainWindow: BrowserWindow | null = null;
  private ollamaProcess: ChildProcess | null = null;
  private ipcController: IpcController | null = null;
  private appState: AppState = 'idle';

  private constructor() {}

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  public async init(): Promise<void> {
    logger.info('AppController', '🚀 Iniciando Syntra AI - Modo Produção');
    this.createWindow();
    
    logger.info('AppController', '📦 Carregando serviços de IA...');
    this.spawnOllama();
    
    if (this.mainWindow) {
      this.ipcController = new IpcController(this.mainWindow);
      this.ipcController.setupHandlers();
      
      setIpcSender((channel, ...args) => this.ipcController?.sendToRenderer(channel, ...args));
      setTTSIpcSender((channel, ...args) => this.ipcController?.sendToRenderer(channel, ...args));
    }

    this.setupAudioPipeline();
    
    // Auto-check and prepare AI
    setTimeout(async () => {
        this.ipcController?.sendToRenderer('status-text', 'Verificando Sistema...');
        
        // Ollama already spawned in init(), just wait for it
        let retries = 0;
        let ollamaOnline = false;
        while (retries < 15) {
            ollamaOnline = await llmService.checkHealth();
            if (ollamaOnline) break;
            await new Promise(r => setTimeout(r, 1000));
            retries++;
            this.ipcController?.sendToRenderer('status-text', `Iniciando Ollama (${retries})...`);
        }

        if (ollamaOnline) {
            this.ipcController?.sendToRenderer('status-text', 'Garantindo Modelos...');
            await llmService.ensureModels(['phi3', 'llama3', 'nomic-embed-text']);
        } else {
            this.ipcController?.sendToRenderer('log', { level: 'error', message: 'Ollama não iniciou. Verifique se ele está instalado.', context: 'System' });
        }

        // 2. Check Whisper (Python)
        const whisperOk = await whisperService.checkHealth();
        if (!whisperOk) {
            this.ipcController?.sendToRenderer('log', { level: 'warn', message: 'Whisper/Python não encontrados. Clique no ícone de engrenagem para instalar.', context: 'System' });
        }

        await learningService.init();
        await learningService.init();

        ragQueue.on('job-updated', (job) => {
            this.ipcController?.sendToRenderer('rag-job-update', job);
        });

        await this.checkDependencies();
        this.updateState('idle');
        this.ipcController?.sendToRenderer('status-text', 'SyntraAI Online');
        logger.info('AppController', 'SyntraAI inicializado com sucesso!');
    }, 1500);
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200, height: 800, minWidth: 900, minHeight: 600,
      backgroundColor: '#050505', frame: false,
      icon: path.join(__dirname, '../../../assets/icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, '../ipc/preload.js'),
        contextIsolation: true, sandbox: false,
      },
      titleBarStyle: 'hidden',
    });

    this.mainWindow.loadFile(path.join(__dirname, '../../ui/index.html'));
    if (process.env['DEBUG_MODE'] === 'true' || !app.isPackaged) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  public updateState(state: AppState): void {
    this.appState = state;
    const rendererState = state === 'recording' ? 'listening' : state;
    this.ipcController?.sendToRenderer('status-change', rendererState);
  }

  private spawnOllama(): void {
    try {
      logger.info('AppController', '🟢 Verificando motor Ollama...');
      
      // Check if Ollama is already running on port 11434
      axios.get('http://127.0.0.1:11434/api/tags').then(() => {
        logger.info('AppController', '✅ Ollama já está em execução (instância externa ou prévia).');
      }).catch(() => {
        logger.info('AppController', '🚀 Iniciando nova instância do Ollama...');
        const localAppData = process.env.LOCALAPPDATA || '';
        const ollamaPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
        const command = fs.existsSync(ollamaPath) ? ollamaPath : 'ollama';

        this.ollamaProcess = spawn(command, ['serve'], {
            detached: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
        });

        this.ollamaProcess.stderr?.on('data', (data: Buffer) => {
            const msg = data.toString().trim();
            // Silence "bind" error as we just checked it, but log others
            if (msg.toLowerCase().includes('error') && !msg.includes('bind')) {
                logger.error('Ollama', msg);
            }
        });
      });

      // Kill Ollama when app closes (only if we spawned it)
      app.on('before-quit', () => {
        this.killOllama();
      });
      app.on('window-all-closed', () => {
        this.killOllama();
      });
    } catch (e) {
      logger.error('AppController', 'Falha ao iniciar Ollama', e);
    }
  }

  private killOllama(): void {
    if (this.ollamaProcess && !this.ollamaProcess.killed) {
      logger.info('AppController', '🔴 Encerrando processo Ollama...');
      this.ollamaProcess.kill('SIGTERM');
      // Also force-kill any stray ollama.exe
      try {
        spawn('taskkill', ['/F', '/IM', 'ollama.exe'], { detached: true, windowsHide: true, stdio: 'ignore' });
      } catch { /* ignore */ }
    }
  }

  private async checkDependencies(): Promise<void> {
    const ollamaOk = await llmService.checkHealth();
    const whisperOk = await whisperService.checkHealth();
    this.ipcController?.sendToRenderer('dependency-status', { ollama: ollamaOk, whisper: whisperOk });
  }

  private setupAudioPipeline(): void {
    voiceListener.on('recording-complete', async (audioPath: string) => {
      // Always process audio (push-to-talk or hotword/clap-triggered)
      await this.runVoicePipeline(audioPath);
    });

    hotwordService.on('hotword-detected', () => this.startRecording('Hotword'));
    clapDetector.on('clap-detected', () => this.startRecording('Palma'));
    voiceListener.start();
  }

  private startRecording(reason: string): void {
    if (['recording', 'processing', 'speaking'].includes(this.appState)) return;
    this.updateState('recording');
    this.ipcController?.sendToRenderer('status-text', 'Ouvindo comando...');
    this.ipcController?.sendToRenderer('start-recording');

    setTimeout(() => {
      if (this.appState === 'recording') {
        this.ipcController?.sendToRenderer('stop-recording');
        this.ipcController?.sendToRenderer('status-text', 'Processando áudio...');
      }
    }, 5000);
  }

  private async runVoicePipeline(wavPath: string): Promise<void> {
    try {
      this.updateState('processing');
      this.ipcController?.sendToRenderer('status-text', 'Transcrevendo...');
      const transcript = await whisperService.transcribe(wavPath);
      
      if (!transcript || transcript.trim().length < 2) {
        this.updateState('idle');
        return;
      }

      this.ipcController?.sendToRenderer('transcript', transcript);
      await this.processCommand(transcript);
    } catch (err) {
      logger.error('AppController', 'Erro no pipeline de voz', err);
      this.updateState('idle');
    }
  }

  public async processCommand(text: string): Promise<void> {
    this.updateState('processing');
    this.ipcController?.sendToRenderer('status-text', 'Pensando...');

    let intent = fastPathRouter.tryFastPath(text);
    if (!intent) {
      this.ipcController?.sendToRenderer('log', { level: 'info', message: `Processando comando: "${text}"`, context: 'LLM' });
      try {
        const { response: llmRes, model: usedModel } = await llmService.smartQuery(text);
        this.ipcController?.sendToRenderer('log', { level: 'info', message: `Modelo usado: ${usedModel}. Resposta bruta: ${llmRes.substring(0, 100)}...`, context: 'LLM' });
        const parsed = llmService.parseJSON(llmRes);
        intent = parseIntent(parsed || { intent: 'chat', response: llmRes }, text);
        fastPathRouter.cacheIntent(text, intent);
      } catch (err: any) {
        logger.error('AppController', 'LLM query failed', err);
        const errMsg = err.message || '';
        let fallbackMsg = 'Desculpe, não consegui processar sua pergunta. Verifique se o Ollama está rodando.';
        
        if (errMsg.includes('Sem memória RAM') || errMsg.includes('system memory')) {
          fallbackMsg = 'Desculpe, o seu computador está sem memória R A M livre suficiente para rodar os meus modelos de inteligência artificial. Por favor, feche alguns programas pesados e tente novamente.';
        }

        intent = { intent: 'chat', response: fallbackMsg, params: {}, raw: text };
        this.ipcController?.sendToRenderer('log', { level: 'error', message: `LLM error: ${errMsg}`, context: 'LLM' });
      }
    }

    this.updateState('speaking');
    this.ipcController?.sendToRenderer('response', intent.response ?? `Executando: ${intent.intent}`);

    await memoryService.saveInteraction({
      input: text,
      intent: intent.intent,
      response: intent.response,
      params: JSON.stringify(intent.params),
      success: 1
    });

    if (intent.intent !== 'chat') await executeIntent(intent);
    if (intent.response) await speak(intent.response);

    this.updateState('idle');
    this.ipcController?.sendToRenderer('status-text', 'Aguardando comando...');
  }

  public cleanup(): void {
    voiceListener.stop();
    if (this.ollamaProcess && !this.ollamaProcess.killed) this.ollamaProcess.kill();
  }
}

export const appController = AppController.getInstance();
