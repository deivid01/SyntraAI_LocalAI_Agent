import { ipcMain, IpcMainEvent, BrowserWindow } from 'electron';
import { memoryService } from '../../modules/memoryService';
import { synapseService } from '../../ai/synapseService';
import { ragService } from '../../ai/ragService';
import hotwordService from '../../modules/audio/hotwordService';
import clapDetector from '../../modules/audio/clapDetector';
import voiceListener from '../../modules/audio/voiceListener';
import { ragQueue } from '../../ai/ragQueue';
import { ragIngestionEngine } from '../../ai/ragIngestionEngine';
import { SynapseRepository } from '../../database/repositories/SynapseRepository';
import { synapseMissionManager } from '../../ai/SynapseMissionManager';

// import { appController } from './AppController';

export class IpcController {
  private window: BrowserWindow;
  private controller: any; // Type 'any' to avoid recursive import, or use an interface
  private synapseRepo = new SynapseRepository();

  constructor(window: BrowserWindow, controller: any) {
    this.window = window;
    this.controller = controller;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    synapseMissionManager.on('mission-log', (data) => {
      this.sendToRenderer('mission-log', data);
    });
    synapseMissionManager.on('mission-status', (status) => {
      this.sendToRenderer('mission-status', status);
    });
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
      console.log(`[IpcController] Received send-text: "${text}"`);
      if (this.controller) {
        await this.controller.processCommand(text);
      }
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
    ipcMain.handle('synapse-ingest-source', async (_event, type: any, source: string, options?: any) => {
      return await ragIngestionEngine.ingestSource(type, source, options);
    });

    ipcMain.handle('synapse-get-jobs', async () => ragQueue.getAllJobs());
    
    ipcMain.handle('synapse-cancel-job', async (_event, id: string) => {
        // Simple status update for now, engine would need to check this
        ragQueue.updateJobStatus(id, { status: 'failed', error: 'Cancelado pelo usuário' });
    });

    ipcMain.handle('synapse-delete-file', async (_event, id: string) => {
        // Need to implement delete in repo
        await this.synapseRepo.deleteFile(id);
    });

    ipcMain.handle('synapse-search', async (_event, query: string) => {
        return await ragService.semanticSearch(query, 5);
    });

    ipcMain.handle('synapse-get-chunks', async (_event, fileId: string) => {
        return await this.synapseRepo.getChunksForFile(fileId);
    });

    // New Mission & Source Handlers
    ipcMain.handle('synapse-get-sources', async () => await synapseService.getSources());
    ipcMain.handle('synapse-add-source', async (_event, source: any) => await synapseService.addSource(source));
    ipcMain.handle('synapse-remove-source', async (_event, id: string) => await synapseService.removeSource(id));
    ipcMain.handle('synapse-start-mission', async (_event, type: string, query: string, name: string, config?: any) => {
        return await synapseService.startLearningMission(type, query, name, config);
    });
    ipcMain.handle('synapse-get-missions', async () => synapseMissionManager.getMissions());
    ipcMain.handle('synapse-sync-all', async () => await synapseService.syncAllSources());

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
