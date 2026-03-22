import { memoryService } from '../modules/memoryService';
import logger from '../core/logger';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult, Dispatcher } from '../core/types';

let dispatch: Dispatcher;

export function setDispatcher(d: Dispatcher) {
  dispatch = d;
}

export const macroHandlers = {
  async repeat_last_action(): Promise<ExecutionResult> {
    if (!dispatch) return { success: false, error: 'Dispatcher not initialized' };
    const lastAction = memoryService.getLastAction();
    if (!lastAction) {
      const lastCmds = await memoryService.getLastCommands(1);
      const lastCmd = lastCmds[0];
      if (!lastCmd) return { success: false, error: 'Nenhuma ação anterior encontrada.' };
      return await dispatch({
        intent: lastCmd.command,
        params: lastCmd.params ? JSON.parse(lastCmd.params) : {},
        raw: ''
      });
    }
    return await dispatch({
      intent: lastAction.intent,
      params: lastAction.params,
      raw: ''
    });
  },

  async automation_sequence(intent: ParsedIntent): Promise<ExecutionResult> {
    if (!dispatch) return { success: false, error: 'Dispatcher not initialized' };
    const sequence = intent.params['sequence'] as any[];
    if (!Array.isArray(sequence)) return { success: false, error: 'Formato de sequência inválido.' };
    
    let successes = 0;
    for (const step of sequence) {
       const res = await dispatch({ intent: step.intent, params: step.params || {}, raw: '' });
       if (!res.success) return { success: false, error: `Falha no passo ${step.intent}: ${res.error}` };
       successes++;
    }
    return { success: true, output: `Sequência de ${successes} ações executada com sucesso.` };
  },

  async create_sequence(intent: ParsedIntent): Promise<ExecutionResult> {
    const name = intent.params['name'] as string;
    const steps = intent.params['steps'] as any[];
    if (!name || !steps || !Array.isArray(steps)) return { success: false, error: 'Dados insuficientes.' };
    const saved = await memoryService.saveSequence(name, steps);
    return saved ? { success: true, output: `Sequência '${name}' salva.` } : { success: false, error: 'Erro ao salvar.' };
  },

  async execute_sequence(intent: ParsedIntent): Promise<ExecutionResult> {
    if (!dispatch) return { success: false, error: 'Dispatcher not initialized' };
    const name = intent.params['name'] as string;
    if (!name) return { success: false, error: 'Nome obrigatório.' };
    const steps = await memoryService.getSequence(name) as any[];
    if (!steps) return { success: false, error: `Sequência '${name}' não encontrada.` };
    
    let successes = 0;
    for (const step of steps) {
       const res = await dispatch({ intent: step.intent, params: step.params || {}, raw: '' });
       if (!res.success) return { success: false, error: `Falha em '${step.intent}': ${res.error}` };
       successes++;
    }
    return { success: true, output: `Sequência '${name}' executada (${successes} passos).` };
  },

  async list_sequences(): Promise<ExecutionResult> {
    const names = await memoryService.listSequences();
    return { success: true, output: names.length > 0 ? `Sequências: ${names.join(', ')}` : 'Nenhuma sequência salva.' };
  },

  async delete_sequence(intent: ParsedIntent): Promise<ExecutionResult> {
    const name = intent.params['name'] as string;
    if (!name) return { success: false, error: 'Nome obrigatório.' };
    const removed = await memoryService.deleteSequence(name);
    return removed ? { success: true, output: `Sequência '${name}' deletada.` } : { success: false, error: 'Erro ao deletar.' };
  }
};
