import axios from 'axios';
import { config } from '../core/config';
import logger from '../core/logger';
import { SynapseRepository } from '../database/repositories/SynapseRepository';

export interface RetrievalResult {
  chunk_id: string;
  file_name: string;
  content: string;
  score: number;
}

export interface IRagService {
  generateEmbedding(text: string): Promise<number[]>;
  semanticSearch(query: string, topK?: number): Promise<RetrievalResult[]>;
  buildContextualSystemPrompt(basePrompt: string, topChunks: RetrievalResult[]): string;
}

export class RagService implements IRagService {
  private static instance: RagService;
  private synapseRepo = new SynapseRepository();

  private constructor() {}

  public static getInstance(): RagService {
    if (!RagService.instance) {
      RagService.instance = new RagService();
    }
    return RagService.instance;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${config.ollamaUrl}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text
      });

      if (response.data && response.data.embedding) {
        return response.data.embedding as number[];
      }
      throw new Error('Falha ao extrair vetor de embedding do payload.');
    } catch (err: any) {
      logger.error('RagService', `Erro ao gerar embedding: ${err.message}`);
      throw err;
    }
  }

  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async semanticSearch(query: string, topK: number = 3): Promise<RetrievalResult[]> {
    try {
      const isTrainingOn = await this.synapseRepo.getSetting('training_mode_active');
      if (isTrainingOn === 'false') return [];

      const queryEmbedding = await this.generateEmbedding(query);
      const rows = await this.synapseRepo.getProcessedChunks();

      if (rows.length === 0) return [];

      const scoredChunks: RetrievalResult[] = [];
      for (const row of rows) {
        try {
          const chunkVector = JSON.parse(row.embedding_json) as number[];
          const score = this.cosineSimilarity(queryEmbedding, chunkVector);
          scoredChunks.push({
            chunk_id: row.chunk_id,
            file_name: row.file_name,
            content: row.content,
            score
          });
        } catch (e) {
          logger.warn('RagService', `Erro ao parsear embedding para chunk ${row.chunk_id}`);
        }
      }

      scoredChunks.sort((a, b) => b.score - a.score);
      return scoredChunks.slice(0, topK);
    } catch (err) {
      logger.error('RagService', 'Erro na busca semântica', err);
      return [];
    }
  }

  public buildContextualSystemPrompt(basePrompt: string, topChunks: RetrievalResult[]): string {
    if (topChunks.length === 0) return basePrompt;

    let contextSection = `\n\n=== MEMÓRIA SYNAPSE ACCESS (CONTEXTO TREINADO) ===\nUtilize as informações abaixo para responder se forem relevantes:\n\n`;
    
    topChunks.forEach((chunk) => {
      if (chunk.score > 0.2) {
        contextSection += `[Arquivo: ${chunk.file_name}]:\n${chunk.content}\n\n`;
      }
    });

    return basePrompt + contextSection;
  }
}

export const ragService = RagService.getInstance();
