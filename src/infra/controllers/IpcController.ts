import { ipcMain, IpcMainEvent, BrowserWindow } from 'electron';
import logger from '../../core/logger';
import { memoryService } from '../../modules/memoryService';
import { synapseService } from '../../ai/synapseService';
import { speak } from '../../ai/ttsService'; // Refactor to TTS Service class later if needed
import { llmService } from '../../ai/llmService';
import { ragService } from '../../ai/ragService';
import { parseIntent } from '../../core/intentParser';
import fastPathRouter from '../../core/fastPathRouter';
import { executeIntent } from '../../automation/commandExecutor';
import hotwordService from '../../modules/audio/hotwordService';
import clapDetector from '../../modules/audio/clapDetector';
import voiceListener from '../../modules/audio/voiceListener';

import { appController } from './AppController';

export class IpcController {
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  public setupHandlers(): void {
    // Basic window controls
    ipcMain.on('window-minimize', () => this.window.minimize());
    ipcMain.on('window-maximize', () => {
      if (this.window.isMaximized()) this.window.unmaximize();
      else this.window.maximize();
    });
    ipcMain.on('window-close', () => this.window.close());

    // Manual text input
    ipcMain.on('send-text', async (_event, text: string) => {
      await appController.processCommand(text);
    });

    // Memory / History
    ipcMain.on('get-history', async (event: IpcMainEvent) => {
      const history = await memoryService.getHistory(20);
      event.reply('history-data', history);
    });

    ipcMain.on('clear-history', async () => {
      await memoryService.clearHistory();
      this.sendToRenderer('log-entry', { level: 'info', message: 'Histórico limpo.' });
    });

    // Synapse Access
    ipcMain.handle('synapse-get-stats', async () => await synapseService.getDashboardStats());
    ipcMain.handle('synapse-get-files', async () => await synapseService.getFiles());
    ipcMain.handle('synapse-get-logs', async () => await synapseService.getLogs());
    ipcMain.handle('synapse-toggle-training', async (_event, active: boolean) => {
        await synapseService.toggleTrainingMode(active);
    });
    ipcMain.handle('synapse-upload-file', async (_event, filePath: string, originalName: string) => {
      await synapseService.processFile(filePath, originalName);
    });

    // Audio / Interaction logic
    ipcMain.on('audio-amplitude', (_event, amp: number) => {
        // Only process if idle? (Original logic checked appState in main.ts)
        const dummyChunk = { chunk: Buffer.alloc(0), amplitude: amp };
        hotwordService.processChunk(dummyChunk);
        clapDetector.processChunk(dummyChunk);
    });

    ipcMain.on('recorded-audio', (_event, data: Uint8Array) => {
      const nodeBuffer = Buffer.from(data);
      voiceListener.receiveRecordedAudio(nodeBuffer);
    });
  }

  public sendToRenderer(channel: string, ...args: any[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }
}
