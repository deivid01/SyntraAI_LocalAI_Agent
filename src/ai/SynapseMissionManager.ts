import { EventEmitter } from 'events';
import { ragDataFetchers, RagDocument } from './ragDataFetchers';
import { ragIngestionEngine } from './ragIngestionEngine';
import logger from '../core/logger';

export interface MissionLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface MissionStatus {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  logs: MissionLog[];
  startTime?: number;
  duration?: string;
  progress: number;
  maxDepth: number;
  currentDepth: number;
  maxResults: number;
  totalIngested: number;
  config?: {
    sources: string[];
  };
}

export class SynapseMissionManager extends EventEmitter {
  private static instance: SynapseMissionManager;
  private activeMissions: Map<string, MissionStatus> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): SynapseMissionManager {
    if (!SynapseMissionManager.instance) {
      SynapseMissionManager.instance = new SynapseMissionManager();
    }
    return SynapseMissionManager.instance;
  }

  public async startMission(type: string, query: string, name: string, config?: { maxDepth?: number, maxResults?: number, sources?: string[] }): Promise<string> {
    const missionId = `mission_${Date.now()}`;
    const status: MissionStatus = {
      id: missionId,
      name: name,
      status: 'running',
      logs: [],
      startTime: Date.now(),
      progress: 0,
      maxDepth: config?.maxDepth || 1,
      currentDepth: 0,
      maxResults: config?.maxResults || 20,
      totalIngested: 0,
      config: {
        sources: config?.sources || [type]
      }
    };

    this.activeMissions.set(missionId, status);
    this.addLog(missionId, `Iniciando Missão de Aprendizado: ${name}`, 'info');
    
    // Process in background
    this.runRecursiveMission(missionId, query).catch(err => {
        this.addLog(missionId, `Erro fatal na missão: ${err.message}`, 'error');
        this.updateStatus(missionId, 'failed');
    });

    return missionId;
  }

  public async stopMission(missionId: string) {
    const mission = this.activeMissions.get(missionId);
    if (mission && mission.status === 'running') {
      mission.status = 'stopped';
      this.addLog(missionId, 'Missão interrompida pelo usuário.', 'warning');
      this.emit('mission-status', mission);
    }
  }

  private async runRecursiveMission(missionId: string, initialQuery: string) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;

    const queryQueue: { term: string, depth: number }[] = [{ term: initialQuery, depth: 0 }];
    const seenQueries = new Set<string>([initialQuery.toLowerCase()]);
    const sources = mission.config?.sources || [];

    while (queryQueue.length > 0 && mission.status === 'running') {
      const { term, depth } = queryQueue.shift()!;
      mission.currentDepth = depth;
      mission.progress = Math.min(99, (mission.totalIngested / mission.maxResults) * 100);
      this.emit('mission-status', mission);

      if (mission.totalIngested >= mission.maxResults) {
        this.addLog(missionId, `Limite de resultados (${mission.maxResults}) atingido.`, 'info');
        break;
      }

      this.addLog(missionId, `[Nível ${depth}] Buscando: "${term}" em ${sources.join(', ')}`, 'info');

      let allDocs: RagDocument[] = [];
      const usedSources = new Set<string>();
      
      for (const source of sources) {
        if (mission.status !== 'running') break;
        
        try {
          this.addLog(missionId, `[Fetcher] Iniciando busca em ${source}...`, 'info');
          let docs: RagDocument[] = [];
          if (source === 'wikipedia') {
            const doc = await ragDataFetchers.fetchWikipedia(term);
            if (doc) docs.push(doc);
          } else if (source === 'stackoverflow') {
            docs = await ragDataFetchers.fetchStackOverflow(term);
          } else if (source === 'github') {
            if (term.includes('/')) {
              const [owner, repo] = term.split('/');
              docs = await ragDataFetchers.fetchGitHub(owner, repo);
            } else {
              this.addLog(missionId, `[Github] Pulo: "${term}" não parece um repositório (owner/repo).`, 'warning');
            }
          }

          if (docs.length > 0) {
            allDocs.push(...docs);
            usedSources.add(source);
          }
        } catch (sourceErr: any) {
          this.addLog(missionId, `[Erro API] ${source}: ${sourceErr.message}`, 'error');
        }
      }

      // FALLBACK SYSTEM
      if (allDocs.length === 0 && mission.status === 'running') {
        const words = term.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 1) {
          this.addLog(missionId, `[Fallback] Sem resultados para "${term}". Quebrando em ${words.length} termos...`, 'warning');
          for (const word of words) {
            if (!seenQueries.has(word.toLowerCase())) {
              seenQueries.add(word.toLowerCase());
              queryQueue.push({ term: word, depth: depth }); // Same depth for fallback retry
            }
          }
        }
        continue;
      }

      // Ingest and Expand
      for (const doc of allDocs) {
        if (mission.status !== 'running' || mission.totalIngested >= mission.maxResults) break;

        this.addLog(missionId, `[Ingestão] ${doc.type.toUpperCase()}: ${doc.metadata.title || doc.source}`, 'success');
        await ragIngestionEngine.ingestSource(doc.type, doc.source, doc.metadata);
        mission.totalIngested++;

        // Expand if depth allows
        if (depth < mission.maxDepth) {
          const keywords = ragDataFetchers.extractKeywords(doc.content);
          const tags = ragDataFetchers.extractTags([doc]);
          const candidates = [...new Set([...keywords, ...tags])];

          let expansionCount = 0;
          for (const cand of candidates) {
            if (!seenQueries.has(cand.toLowerCase()) && queryQueue.length < 100) {
              seenQueries.add(cand.toLowerCase());
              queryQueue.push({ term: cand, depth: depth + 1 });
              expansionCount++;
            }
          }
          if (expansionCount > 0) {
            this.addLog(missionId, `[Expansão] Geradas ${expansionCount} novas sub-queries a partir de "${doc.metadata.title || 'doc'}".`, 'info');
          }
        }
      }
    }

    if (mission.status === 'running') {
      this.addLog(missionId, `Missão finalizada com sucesso! Total ingerido: ${mission.totalIngested}`, 'success');
      this.updateStatus(missionId, 'completed');
    }
  }

  private addLog(missionId: string, message: string, type: MissionLog['type']) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      const log: MissionLog = {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      };
      mission.logs.push(log);
      this.emit('mission-log', { missionId, log });
    }
  }

  private updateStatus(missionId: string, status: MissionStatus['status']) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = status;
      if (status === 'completed' || status === 'failed') {
        const end = Date.now();
        const diff = (end - (mission.startTime || end)) / 1000;
        mission.duration = `${diff.toFixed(2)}s`;
      }
      this.emit('mission-status', mission);
    }
  }

  public getMissions(): MissionStatus[] {
    return Array.from(this.activeMissions.values());
  }
}

export const synapseMissionManager = SynapseMissionManager.getInstance();
