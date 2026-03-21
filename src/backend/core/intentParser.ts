import logger from '../utils/logger';

export interface ParsedIntent {
  intent: string;
  response?: string;
  params: Record<string, unknown>;
  raw: string;
}

const VALID_INTENTS = [
  'open_app', 'close_app', 'run_command', 'shutdown', 'restart', 'chat',
  'search', 'timer', 'reminder', 'volume', 'screenshot', 'unknown'
];

export function parseIntent(llmResponse: unknown, rawInput: string): ParsedIntent {
  const fallback: ParsedIntent = {
    intent: 'chat',
    response: 'Entendido. Como posso ajudar?',
    params: {},
    raw: rawInput,
  };

  if (!llmResponse || typeof llmResponse !== 'object') {
    logger.warn('IntentParser', 'Resposta LLM inválida, usando fallback.', llmResponse);
    return fallback;
  }

  const resp = llmResponse as Record<string, unknown>;
  const intent = (resp['intent'] as string | undefined)?.toLowerCase()?.trim();

  if (!intent) {
    logger.warn('IntentParser', 'Intent ausente na resposta LLM.');
    return fallback;
  }

  const normalizedIntent = VALID_INTENTS.includes(intent) ? intent : 'chat';

  if (!VALID_INTENTS.includes(intent)) {
    logger.warn('IntentParser', `Intent desconhecido: "${intent}", usando "chat".`);
  }

  const params: Record<string, unknown> = {};
  if (resp['params'] && typeof resp['params'] === 'object') {
    Object.assign(params, resp['params']);
  }

  return {
    intent: normalizedIntent,
    response: typeof resp['response'] === 'string' ? resp['response'] : undefined,
    params,
    raw: rawInput,
  };
}
