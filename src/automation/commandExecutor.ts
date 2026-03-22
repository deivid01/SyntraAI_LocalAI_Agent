import logger from '../core/logger';
import { memoryService } from '../modules/memoryService';
import { learningService } from '../modules/learningService';
import { ParsedIntent } from '../core/intentParser';

// Controllers
import { osHandlers } from './osController';
import { ExecutionResult } from '../core/types';
import { browserHandlers } from './browserController';
import { scriptHandlers } from './scriptRunner';
import { guiHandlers } from './guiController';
import { fileHandlers } from '../features/fileManager';
import { macroHandlers, setDispatcher } from '../features/macroSystem';

type IntentHandler = (intent: ParsedIntent) => Promise<ExecutionResult>;
const intentRegistry: Record<string, IntentHandler> = {};

function register(handlers: Record<string, IntentHandler>) {
  for (const [name, handler] of Object.entries(handlers)) {
    intentRegistry[name] = handler;
  }
}

// 1. Core Registration
register(osHandlers);
register(browserHandlers);
register(scriptHandlers);
register(guiHandlers);
register(fileHandlers);
register(macroHandlers);

// 2. Wire up late-bound dispatcher (avoids circular dependency)
setDispatcher(executeIntent);


// Aliases
intentRegistry['search_google'] = browserHandlers.search;
intentRegistry['click'] = guiHandlers.mouse_click;
intentRegistry['type_text'] = guiHandlers.keyboard_type;

/**
 * MAIN DISPATCHER
 * Routes incoming parsed intents to their modular handlers,
 * manages session history, and triggers automatic learning.
 */
export async function executeIntent(intent: ParsedIntent): Promise<ExecutionResult> {
  const handler = intentRegistry[intent.intent];
  
  if (!handler) {
    const errorMsg = `Nenhum handler para o intent: ${intent.intent}`;
    logger.warn('CommandExecutor', errorMsg);
    return { success: false, error: errorMsg };
  }

  logger.info('CommandExecutor', `Despachando intent: ${intent.intent}`, intent.params);
  const result = await handler(intent);

  // Meta-intents that should NOT be saved to persistent history
  const META_INTENTS = [
    'repeat_last_action', 'automation_sequence',
    'execute_sequence', 'list_sequences', 'create_sequence', 'delete_sequence'
  ];
  const isMeta = META_INTENTS.includes(intent.intent);

  if (!isMeta) {
    const sessionAction = {
      intent: intent.intent,
      params: intent.params as Record<string, unknown>,
      output: result.output,
      success: result.success,
      timestamp: Date.now(),
    };

    // Fast session context
    memoryService.pushSessionAction(sessionAction);

    // SQLite persistence
    memoryService.saveCommand({
      command: intent.intent,
      params: JSON.stringify(intent.params),
      output: result.output,
      success: result.success ? 1 : 0,
    });

    // Patterns for Auto-Learning
    if (result.success) {
      const learningNotif = await learningService.analyze(sessionAction);
      if (learningNotif) {
        result.output = (result.output ? result.output + ' ' : '') + learningNotif;
      }
    }
  }

  if (!result.success) {
    logger.warn('CommandExecutor', `Falha em ${intent.intent}: ${result.error}`);
  } else {
    logger.info('CommandExecutor', `Sucesso em ${intent.intent}:`, result.output);
  }

  return result;
}

