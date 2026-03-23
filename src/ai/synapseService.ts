import * as fs from 'fs';
import * as path from 'path';
import logger from '../core/logger';
import { ragService } from './ragService';
import * as crypto from 'crypto';
import { SynapseRepository } from '../database/repositories/SynapseRepository';
import { SynapseSourceRepository, ISynapseSource } from '../database/repositories/SynapseSourceRepository';
import { ISynapseFile, ISynapseChunk } from '../core/types';
import { ensureDOMMatrix } from '../core/envGuard';
import { synapseMissionManager } from './SynapseMissionManager';
import { ragIngestionEngine } from './ragIngestionEngine';

// Apply polyfill before requiring browser-dependent libraries
ensureDOMMatrix();

const pdfParse = require('pdf-parse');

export class SynapseService {
  private static instance: SynapseService;
  private synapseRepo = new SynapseRepository();
  private sourceRepo = new SynapseSourceRepository();

  private constructor() {}

  public static getInstance(): SynapseService {
    if (!SynapseService.instance) {
      SynapseService.instance = new SynapseService();
    }
    return SynapseService.instance;
  }

  public async processFile(filePath: string, originalName: string): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();
    const typeMap: Record<string, any> = {
      '.pdf': 'pdf',
      '.txt': 'web', // We'll treat txt/md as generic web-style text in ingestion engine for now
      '.md': 'web',
      '.html': 'web',
      '.js': 'web',
      '.ts': 'web',
      '.css': 'web'
    };

    const type = typeMap[ext] || 'web';
    return await ragIngestionEngine.ingestSource(type, filePath, { filename: originalName });
  }

  private normalizeText(text: string): string {
    return text.replace(/(\r\n|\n|\r)/gm, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + chunkSize));
      i += chunkSize - overlap;
    }
    return chunks;
  }

  public async getDashboardStats() {
    return await this.synapseRepo.getStats();
  }

  public async toggleTrainingMode(active: boolean): Promise<void> {
    const val = active ? 'true' : 'false';
    await this.synapseRepo.setSetting('training_mode_active', val);
    await this.synapseRepo.logEvent('training_applied', `Modo Treinamento alterado para: ${active ? 'ON' : 'OFF'}`);
  }

  public async getFiles() {
    return await this.synapseRepo.getFiles();
  }

  public async getLogs() {
    return await this.synapseRepo.getLogs();
  }

  // Source Management
  public async getSources() {
    return await this.sourceRepo.getSources();
  }

  public async addSource(source: ISynapseSource) {
    await this.sourceRepo.addSource(source);
    await this.synapseRepo.logEvent('source_added', `Nova fonte registrada: ${source.source} (${source.type})`);
  }

  public async removeSource(id: string) {
    await this.sourceRepo.removeSource(id);
    await this.synapseRepo.logEvent('source_removed', `Fonte removida: ${id}`);
  }

  // Missions
  public async startLearningMission(type: string, query: string, name: string, config?: { maxDepth?: number, maxResults?: number, sources?: string[] }) {
    return await synapseMissionManager.startMission(type, query, name, config);
  }

  public async syncAllSources() {
    const sources = await this.sourceRepo.getSources();
    for (const source of sources) {
        await ragIngestionEngine.ingestSource(source.type as any, source.source, source.options);
        await this.sourceRepo.updateLastSync(source.id);
    }
  }
}

export const synapseService = SynapseService.getInstance();
