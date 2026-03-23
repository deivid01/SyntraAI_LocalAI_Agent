import { ragDataFetchers, RagDocument } from './ragDataFetchers';
import { ragTextProcessor } from './ragTextProcessor';
import { ragQueue } from './ragQueue';
import { ragService } from './ragService';
import { SynapseRepository } from '../database/repositories/SynapseRepository';
import logger from '../core/logger';

export class RagIngestionEngine {
  private static instance: RagIngestionEngine;
  private synapseRepo = new SynapseRepository();

  private constructor() {}

  public static getInstance(): RagIngestionEngine {
    if (!RagIngestionEngine.instance) {
      RagIngestionEngine.instance = new RagIngestionEngine();
    }
    return RagIngestionEngine.instance;
  }

  /**
   * Main entry point to ingest a source.
   */
  public async ingestSource(type: 'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow', source: string, options: any = {}): Promise<string> {
    const jobId = ragQueue.addJob({ source, type });
    
    // Start processing in background (non-blocking)
    this.processJob(jobId, type, source, options).catch(err => {
      logger.error('RagEngine', `Job ${jobId} failed`, err);
    });

    return jobId;
  }

  private async processJob(jobId: string, type: 'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow', source: string, options: any): Promise<void> {
    ragQueue.updateJobStatus(jobId, { status: 'processing', progress: 10 });

    try {
      // 1. Fetch
      let documents: RagDocument[] = [];
      
      // Auto-detect Wikipedia in Web source
      if (type === 'web' && source.includes('wikipedia.org')) {
        const titleMatch = source.match(/\/wiki\/([^/?#]+)/);
        if (titleMatch) {
          const title = decodeURIComponent(titleMatch[1]).replace(/_/g, ' ');
          logger.info('RagEngine', `Redirecting Wikipedia URL to specialized fetcher: ${title}`);
          const wikidoc = await ragDataFetchers.fetchWikipedia(title);
          if (wikidoc) documents.push(wikidoc);
        }
      }

      if (documents.length === 0) {
        if (type === 'github') {
          // Auto-parse GitHub URL if provider
          let owner = options.owner;
          let repo = options.repo;
          if (source.includes('github.com')) {
            const parts = source.replace('https://github.com/', '').split('/');
            owner = parts[0];
            repo = parts[1];
          }
          documents = await ragDataFetchers.fetchGitHub(owner, repo, options.path || '');
        } else if (type === 'web') {
          const doc = source.startsWith('http') 
            ? await ragDataFetchers.fetchWeb(source)
            : await ragDataFetchers.fetchLocalFile(source);
          if (doc) documents.push(doc);
        } else if (type === 'pdf') {
          const doc = await ragDataFetchers.fetchPDF(source);
          if (doc) documents.push(doc);
        } else if (type === 'wikipedia') {
          const doc = await ragDataFetchers.fetchWikipedia(source);
          if (doc) documents.push(doc);
        } else if (type === 'stackoverflow') {
          const docs = await ragDataFetchers.fetchStackOverflow(source);
          if (docs) documents.push(...docs);
        }
      }

      if (documents.length === 0) {
        throw new Error(`Nenhum documento encontrado na fonte informada (${type}). Verifique o link ou o caminho do arquivo.`);
      }

      ragQueue.updateJobStatus(jobId, { progress: 30 });

      // 2. Process each document
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const cleaned = ragTextProcessor.cleanText(doc.content);
        const chunks = ragTextProcessor.chunkText(cleaned);

        // Save File Metadata
        const fileId = Math.random().toString(36).substring(7);
        await this.synapseRepo.saveFile({
          id: fileId,
          name: doc.metadata.filename || doc.metadata.title || source,
          type: doc.type,
          size: doc.content.length,
          status: 'processing'
        });

        // 3. Generate Embeddings and Save Chunks
        for (let j = 0; j < chunks.length; j++) {
          const chunkContent = chunks[j];
          const embedding = await ragService.generateEmbedding(chunkContent);
          
          await this.synapseRepo.saveChunk({
            id: Math.random().toString(36).substring(7),
            file_id: fileId,
            chunk_index: j,
            content: chunkContent,
            embedding_json: JSON.stringify(embedding)
          });

          // Update progress
          const progress = 30 + (70 * (i + (j / chunks.length)) / documents.length);
          ragQueue.updateJobStatus(jobId, { progress: Math.floor(progress) });
        }

        await this.synapseRepo.updateFileStatus(fileId, 'processed');
      }

      ragQueue.updateJobStatus(jobId, { status: 'completed', progress: 100 });
      logger.info('RagEngine', `Job ${jobId} completed successfully!`);

    } catch (err: any) {
      ragQueue.updateJobStatus(jobId, { status: 'failed', error: err.message });
      logger.error('RagEngine', `Job ${jobId} failed: ${err.message}`);
    }
  }
}

export const ragIngestionEngine = RagIngestionEngine.getInstance();
