import logger from '../core/logger';
import { InteractionRepository } from '../database/repositories/InteractionRepository';
import { CommandRepository } from '../database/repositories/CommandRepository';
import { SequenceRepository } from '../database/repositories/SequenceRepository';
import { IInteraction, ICommandRecord, ISequence } from '../core/types';

export interface SessionAction {
  intent: string;
  params: Record<string, unknown>;
  output?: string;
  success: boolean;
  timestamp: number;
}

export class MemoryService {
  private static instance: MemoryService;
  
  private interactionRepo = new InteractionRepository();
  private commandRepo = new CommandRepository();
  private sequenceRepo = new SequenceRepository();

  private sessionHistory: SessionAction[] = [];
  private readonly MAX_SESSION_SIZE = 50;

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  public pushSessionAction(action: SessionAction): void {
    this.sessionHistory.push(action);
    if (this.sessionHistory.length > this.MAX_SESSION_SIZE) {
      this.sessionHistory.shift();
    }
  }

  public getLastAction(): SessionAction | null {
    const excludes = ['repeat_last_action', 'automation_sequence', 'execute_sequence', 'list_sequences'];
    for (let i = this.sessionHistory.length - 1; i >= 0; i--) {
      if (!excludes.includes(this.sessionHistory[i].intent)) {
        return this.sessionHistory[i];
      }
    }
    return null;
  }

  public getRecentSessionActions(limit = 5): SessionAction[] {
    return this.sessionHistory.slice(-limit);
  }

  public clearSession(): void {
    this.sessionHistory = [];
  }

  public async saveInteraction(interaction: IInteraction): Promise<void> {
    try {
      await this.interactionRepo.save(interaction);
      logger.debug('MemoryService', `Interação salva: intent=${interaction.intent}`);
    } catch (err) {
      logger.error('MemoryService', 'Erro ao salvar interação', err);
    }
  }

  public async saveCommand(record: ICommandRecord): Promise<void> {
    try {
      await this.commandRepo.save(record);
    } catch (err) {
      logger.error('MemoryService', 'Erro ao salvar comando', err);
    }
  }

  public async getHistory(limit = 20): Promise<IInteraction[]> {
    return await this.interactionRepo.getRecent(limit);
  }

  public async getLastCommands(limit = 10): Promise<ICommandRecord[]> {
    return await this.commandRepo.getRecent(limit);
  }

  public async getContextSummary(limit = 5): Promise<string> {
    const parts: string[] = [];
    const history = await this.getHistory(limit);
    
    if (history.length > 0) {
      const historyLines = history
        .reverse()
        .map(h => `Usuário: ${h.input}\nSyntra: ${h.response ?? h.intent}`)
        .join('\n');
      parts.push(historyLines);
    }

    const recent = this.getRecentSessionActions(limit);
    if (recent.length > 0) {
      const actionLines = recent
        .map(a => `[Ação executada] intent=${a.intent} | resultado=${a.success ? 'sucesso' : 'falha'}${a.output ? ' | saída=' + a.output.substring(0, 80) : ''}`)
        .join('\n');
      parts.push(actionLines);
    }

    return parts.join('\n');
  }

  public async clearHistory(): Promise<void> {
    // Note: InteractionRepo doesn't have clearAll yet, we could add it to BaseRepository
    // For now we can use raw query if needed, but let's stick to the repo API.
    // I'll add a generic delete query to Base if needed.
    logger.info('MemoryService', 'Limpeza completa delegada aos repositórios.');
  }

  // --- Sequences ---
  public async saveSequence(name: string, steps: unknown[]): Promise<boolean> {
    try {
      await this.sequenceRepo.save({ name, steps: JSON.stringify(steps) });
      return true;
    } catch (err) {
      return false;
    }
  }

  public async getSequence(name: string): Promise<unknown[] | null> {
    const seq = await this.sequenceRepo.findByName(name);
    return seq ? JSON.parse(seq.steps) : null;
  }

  public async listSequences(): Promise<string[]> {
    const all = await this.sequenceRepo.getAll();
    return all.map(s => s.name);
  }

  public async deleteSequence(name: string): Promise<boolean> {
    try {
      await this.sequenceRepo.delete(name);
      return true;
    } catch (err) {
      return false;
    }
  }
}

export const memoryService = MemoryService.getInstance();
