import { ParsedIntent } from './intentParser';
import logger from './logger';

class FastPathRouter {
  // Exact match cache: transcript -> parsed intent
  private exactCache: Map<string, ParsedIntent> = new Map();

  // Regex patterns for highly predictable intents
  private readonly regexRules: Array<{
    pattern: RegExp;
    handler: (match: RegExpMatchArray) => ParsedIntent;
  }> = [
    {
      pattern: /^(repetir|repita|faz de novo|fazer de novo)(.*)$/i,
      handler: () => ({ intent: 'repeat_last_action', params: {}, raw: 'fast-path' })
    },
    {
      pattern: /^(pesquisar por|pesquise por|pesquisar|pesquise)\s+(.+)$/i,
      handler: (m) => ({ intent: 'search', params: { query: m[2].trim() }, raw: 'fast-path' })
    },
    {
      pattern: /^(abrir o site|abrir site|entrar no site|abrir url|navegar para)\s+(.+)$/i,
      handler: (m) => ({ intent: 'open_url', params: { url: m[2].trim() }, raw: 'fast-path' })
    },
    {
      pattern: /^(abrir|abra|iniciar|inicie)\s+(chrome|notepad|bloco de notas|calculadora|discord|spotify|vscode)(.*)$/i,
      handler: (m) => ({ intent: 'open_app', params: { app: m[2].trim() }, raw: 'fast-path' })
    },
    {
      pattern: /^(fechar|feche|encerrar|encerre)\s+(chrome|notepad|bloco de notas|calculadora|discord|spotify|vscode)(.*)$/i,
      handler: (m) => ({ intent: 'close_app', params: { app: m[2].trim() }, raw: 'fast-path' })
    },
    {
      pattern: /^(aumentar\s+volume|aumenta\s+o\s+volume|volume\s+maximo|volume\s+máximo)(.*)$/i,
      handler: () => ({ intent: 'volume', params: { level: 100 }, raw: 'fast-path' })
    },
    {
      pattern: /^(mutar|silenciar|mute|mudo)(.*)$/i,
      handler: () => ({ intent: 'volume', params: { action: 'mute' }, raw: 'fast-path' })
    },
    {
      pattern: /^(tirar print|print screen|capturar tela|tirar screenshot)(.*)$/i,
      handler: () => ({ intent: 'screenshot', params: {}, raw: 'fast-path' })
    },
  ];

  /**
   * Attempts to parse the transcript instantly using regex or the exact cache.
   * Returns null if no fast-path is found, meaning it must go to the LLM.
   */
  public tryFastPath(transcript: string): ParsedIntent | null {
    const clean = transcript.toLowerCase().trim();
    if (!clean) return null;

    // 1. Check Exact Match Cache (O(1) lookup)
    if (this.exactCache.has(clean)) {
      logger.info('FastPath', `Cache hit gerado para: "${clean}"`);
      const cached = this.exactCache.get(clean)!;
      // Return a copy to avoid mutating the cache object downstream
      return { ...cached, raw: transcript };
    }

    // 2. Check Regex Rules (O(N) where N is small)
    for (const rule of this.regexRules) {
      const match = clean.match(rule.pattern);
      if (match) {
        logger.info('FastPath', `Regex match para padrão: ${rule.pattern.source}`);
        const parsed = rule.handler(match);
        parsed.raw = transcript;
        return parsed;
      }
    }

    return null;
  }

  /**
   * Saves a successfully LLM-parsed intent into the exact match cache.
   */
  public cacheIntent(transcript: string, parsed: ParsedIntent): void {
    const clean = transcript.toLowerCase().trim();
    if (!clean) return;

    // Do not cache chat/conversational responses or unknown intents because they are highly contextual
    if (parsed.intent === 'chat' || parsed.intent === 'unknown') return;

    this.exactCache.set(clean, {
      intent: parsed.intent,
      params: parsed.params,
      response: parsed.response, // We can preserve the LLM's friendly response
      raw: 'cached'
    });
    
    // Optional: Keep cache size reasonable to prevent memory leaks in extreme long-running sessions
    if (this.exactCache.size > 1000) {
      const firstKey = this.exactCache.keys().next().value;
      if (firstKey) this.exactCache.delete(firstKey);
    }
  }
}

export default new FastPathRouter();
