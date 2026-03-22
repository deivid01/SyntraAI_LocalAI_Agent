import * as fs from 'fs';
import * as path from 'path';
import logger from '../core/logger';
import { ragService } from './ragService';
import * as crypto from 'crypto';
import { SynapseRepository } from '../database/repositories/SynapseRepository';
import { ISynapseFile, ISynapseChunk } from '../core/types';
import { ensureDOMMatrix } from '../core/envGuard';

// Apply polyfill before requiring browser-dependent libraries
ensureDOMMatrix();

const pdfParse = require('pdf-parse');

export class SynapseService {
  private static instance: SynapseService;
  private synapseRepo = new SynapseRepository();

  private constructor() {}

  public static getInstance(): SynapseService {
    if (!SynapseService.instance) {
      SynapseService.instance = new SynapseService();
    }
    return SynapseService.instance;
  }

  public async processFile(filePath: string, originalName: string): Promise<void> {
    const ext = path.extname(originalName).toLowerCase();
    const allowed = ['.pdf', '.txt', '.md', '.json', '.js', '.ts', '.html', '.css'];

    if (!allowed.includes(ext)) {
      throw new Error(`Tipo de arquivo não suportado: ${ext}`);
    }

    const stat = fs.statSync(filePath);
    const fileId = crypto.randomUUID();

    const file: ISynapseFile = {
      id: fileId,
      name: originalName,
      type: ext,
      size: stat.size,
      status: 'processing'
    };

    await this.synapseRepo.saveFile(file);
    await this.synapseRepo.logEvent('processing_started', `Iniciando extração do arquivo: ${originalName}`);

    try {
      let rawText = '';
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        rawText = data.text;
      } else {
        rawText = fs.readFileSync(filePath, 'utf-8');
      }

      const cleanText = this.normalizeText(rawText);
      if (!cleanText) throw new Error('O arquivo parece estar vazio ou não contém texto legível.');

      const chunks = this.chunkText(cleanText, 1000, 200);

      let chunkIndex = 0;
      for (const content of chunks) {
        const finalChunkContent = (['.js', '.ts', '.html', '.css'].includes(ext)) 
          ? `[CÓDIGO FONTE ${ext}]\n${content}` 
          : content;

        const embedding = await ragService.generateEmbedding(finalChunkContent);
        
        const chunk: ISynapseChunk = {
          id: crypto.randomUUID(),
          file_id: fileId,
          chunk_index: chunkIndex,
          content: finalChunkContent,
          embedding_json: JSON.stringify(embedding)
        };

        await this.synapseRepo.saveChunk(chunk);
        chunkIndex++;
      }

      await this.synapseRepo.updateFileStatus(fileId, 'processed');
      await this.synapseRepo.logEvent('processing_completed', `Sucesso ao processar arquivo: ${originalName} (${chunks.length} chunks)`);

    } catch (err: any) {
      await this.synapseRepo.updateFileStatus(fileId, 'error');
      await this.synapseRepo.logEvent('processing_error', `Falha ao processar arquivo ${originalName}: ${err.message}`);
      throw err;
    }
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
}

export const synapseService = SynapseService.getInstance();
