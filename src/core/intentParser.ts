import logger from './logger';

export interface ParsedIntent {
  intent: string;
  response?: string;
  params: Record<string, unknown>;
  raw: string;
}

const VALID_INTENTS = [
  'open_app', 'close_app', 'run_command', 'shutdown', 'restart', 'chat',
  'search', 'timer', 'reminder', 'volume', 'screenshot', 'unknown',
  // New requested intents:
  'click', 'type_text', 'scroll', 'open_url', 'search_google', 
  'create_file', 'read_file', 'edit_file', 'delete_file', 'run_script',
  'repeat_last_action', 'automation_sequence',
  // Advanced Nut.js intents:
  'mouse_move', 'mouse_click', 'mouse_double_click', 'mouse_drag',
  'keyboard_type', 'keyboard_shortcut', 'keyboard_enter',
  // Automation Sequences (SQLite):
  'create_sequence', 'execute_sequence', 'delete_sequence', 'list_sequences',
  // Browser Automation:
  'browser_navigate', 'browser_back', 'browser_forward', 'browser_refresh',
  'browser_close_tab', 'browser_new_tab', 'browser_search'
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
