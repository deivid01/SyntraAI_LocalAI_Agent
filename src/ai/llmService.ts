import axios from 'axios';
import { config } from '../core/config';
import logger from '../core/logger';
import { LLMResponse } from '../core/types'; // I should move LLMResponse to types.ts if not there

export class LlmService {
  private static instance: LlmService;

  private constructor() {}

  public static getInstance(): LlmService {
    if (!LlmService.instance) {
      LlmService.instance = new LlmService();
    }
    return LlmService.instance;
  }

  public async query(prompt: string, model: string = config.ollamaModel): Promise<string> {
    const url = `${config.ollamaUrl}/api/generate`;
    const body = {
      model,
      prompt,
      system: config.systemPrompt,
      format: 'json',
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 300,
        top_k: 10,
        top_p: 0.9,
      },
    };

    try {
      const response = await axios.post(url, body, { timeout: 180000 });
      return response.data.response as string;
    } catch (err) {
      logger.error('LlmService', `Erro ao consultar modelo ${model}`, err);
      throw err;
    }
  }

  /**
   * Smart query: tries primary model (phi3), falls back to secondary (llama3) if it fails.
   * Lightweight queries always use phi3. Complex queries attempt llama3 first if available.
   */
  public async smartQuery(prompt: string): Promise<{ response: string; model: string }> {
    const primary = config.ollamaModel;       // phi3 (light, fast)
    const fallback = config.ollamaFallbackModel; // llama3 (heavier, smarter)

    // Detect if the query is complex enough to warrant the heavier model
    const isComplex = this.isComplexQuery(prompt);
    const modelsToTry = isComplex ? [fallback, primary] : [primary, fallback];

    for (const model of modelsToTry) {
      try {
        logger.info('LlmService', `[SmartQuery] Trying model: ${model} (complex=${isComplex})`);
        const response = await this.query(prompt, model);
        logger.info('LlmService', `[SmartQuery] ✅ ${model} responded successfully.`);
        return { response, model };
      } catch (err: any) {
        logger.warn('LlmService', `[SmartQuery] ⚠️ ${model} failed, trying next...`);
        const msg = err.response?.data?.error || err.message || '';
        if (msg.includes('system memory') || msg.includes('memory')) {
          throw new Error(`Sem memória RAM livre suficiente: ${msg}`);
        }
      }
    }

    // All models failed
    throw new Error('All LLM models failed to respond.');
  }

  /**
   * Simple heuristic to detect complex queries that benefit from a larger model.
   * Returns true for: code generation, analysis, long-form explanation requests.
   */
  private isComplexQuery(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const complexPatterns = [
      'analise', 'analyze', 'explique detalhadamente', 'explain in detail',
      'escreva um código', 'write code', 'gere um script', 'generate',
      'compare', 'resuma este documento', 'summarize', 'traduz',
      'refatore', 'refactor', 'debug', 'implementar', 'implement',
    ];
    return complexPatterns.some(p => lower.includes(p));
  }

  public parseJSON(raw: string): LLMResponse | null {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as LLMResponse;
      if (!parsed.intent) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await axios.get(`${config.ollamaUrl}/api/tags`);
      return res.status === 200;
    } catch { return false; }
  }

  public async ensureModels(models: string[]): Promise<void> {
    for (const model of models) {
      try {
        logger.info('LlmService', `Checking model: ${model}...`);
        const res = await axios.get(`${config.ollamaUrl}/api/tags`);
        const exists = res.data.models?.some((m: any) => m.name.includes(model));
        
        if (!exists) {
          logger.warn('LlmService', `Model ${model} MISSING. Initializing pull... (This may take minutes)`);
          // This will block until the pull is finished (or at least started reliably)
          await axios.post(`${config.ollamaUrl}/api/pull`, { name: model });
          logger.info('LlmService', `Model ${model} pull command sent successfully.`);
        } else {
          logger.info('LlmService', `Model ${model} confirmed present.`);
        }
      } catch (err) {
        logger.error('LlmService', `Error ensuring model ${model}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

export const llmService = LlmService.getInstance();
