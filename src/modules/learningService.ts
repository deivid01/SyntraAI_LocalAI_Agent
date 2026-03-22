import { memoryService, SessionAction } from './memoryService';
import logger from '../core/logger';

export class LearningService {
  private static instance: LearningService;
  private history: SessionAction[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly MIN_SEQUENCE_LENGTH = 2;
  private readonly MAX_SEQUENCE_LENGTH = 5;
  private readonly REQUIRED_REPETITIONS = 3;
  private learnedSequences: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): LearningService {
    if (!LearningService.instance) {
      LearningService.instance = new LearningService();
    }
    return LearningService.instance;
  }

  public async analyze(action: SessionAction): Promise<string | null> {
    if (!action.success) return null;
    
    const META_INTENTS = [
      'repeat_last_action', 'automation_sequence',
      'execute_sequence', 'list_sequences', 'create_sequence', 'delete_sequence',
      'chat', 'unknown'
    ];
    if (META_INTENTS.includes(action.intent)) return null;

    this.history.push(action);
    if (this.history.length > this.MAX_HISTORY) this.history.shift();

    if (this.history.length < this.MIN_SEQUENCE_LENGTH * this.REQUIRED_REPETITIONS) return null;
    return await this.detectPatterns();
  }

  private async detectPatterns(): Promise<string | null> {
    const len = this.history.length;
    for (let seqLen = this.MAX_SEQUENCE_LENGTH; seqLen >= this.MIN_SEQUENCE_LENGTH; seqLen--) {
      if (len < seqLen * this.REQUIRED_REPETITIONS) continue;
      const latestSequence = this.history.slice(len - seqLen);
      const latestSignature = this.getSequenceSignature(latestSequence);
      if (this.learnedSequences.has(latestSignature)) continue;

      let repetitions = 1;
      let offset = len - seqLen * 2;
      while (offset >= 0) {
        const pastSequence = this.history.slice(offset, offset + seqLen);
        if (this.getSequenceSignature(pastSequence) === latestSignature) {
          repetitions++;
          offset -= seqLen;
        } else break;
      }

      if (repetitions >= this.REQUIRED_REPETITIONS) {
        return await this.autoSaveMacro(latestSequence, latestSignature);
      }
    }
    return null;
  }

  private getSequenceSignature(seq: SessionAction[]): string {
    return seq.map(a => `${a.intent}(${JSON.stringify(a.params || {})})`).join(' -> ');
  }

  private async autoSaveMacro(seq: SessionAction[], signature: string): Promise<string> {
    this.learnedSequences.add(signature);
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const macroName = `auto_${shortId}`;
    
    const steps = seq.map(a => ({ intent: a.intent, params: a.params }));
    const saved = await memoryService.saveSequence(macroName, steps);
    
    if (saved) {
      const intentNames = seq.map(s => s.intent).join(', ');
      logger.info('LearningService', `Padrão detectado! Sequência [${intentNames}] salva como '${macroName}'.`);
      return `Detectei um padrão repetitivo. Criei uma automação chamada ${macroName} para você.`;
    }
    return '';
  }
}

export const learningService = LearningService.getInstance();
