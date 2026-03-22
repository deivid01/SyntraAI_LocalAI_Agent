import { keyboard, Key } from '@nut-tree-fork/nut-js';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';
import { safeExec } from './osController';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const browserHandlers = {
  async open_url(intent: ParsedIntent): Promise<ExecutionResult> {
    let url = intent.params['url'] as string;
    if (!url) return { success: false, error: 'Nenhuma URL fornecida.' };
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const res = await safeExec(`start "" "${url}"`);
    if (res.success) res.output = `Navegando para: ${url}`;
    return res;
  },

  async search(intent: ParsedIntent): Promise<ExecutionResult> {
    const query = intent.params['query'] as string;
    if (!query) return { success: false, error: 'O que você quer pesquisar?' };
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const res = await safeExec(`start "" "${url}"`);
    if (res.success) res.output = `Pesquisando por: ${query}`;
    return res;
  },

  async browser_navigate(intent: ParsedIntent): Promise<ExecutionResult> {
    let url = intent.params['url'] as string;
    if (!url) return { success: false, error: 'URL obrigatória.' };
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    await keyboard.pressKey(Key.LeftControl, Key.L);
    await keyboard.releaseKey(Key.LeftControl, Key.L);
    await sleep(200);
    keyboard.config.autoDelayMs = 5;
    await keyboard.type(url);
    await sleep(100);
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
    return { success: true, output: `Navegador direcionado para: ${url}` };
  },

  async browser_back(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.LeftAlt, Key.Left);
    await keyboard.releaseKey(Key.LeftAlt, Key.Left);
    return { success: true, output: 'Navegador: voltar página' };
  },

  async browser_forward(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.LeftAlt, Key.Right);
    await keyboard.releaseKey(Key.LeftAlt, Key.Right);
    return { success: true, output: 'Navegador: avançar página' };
  },

  async browser_refresh(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.F5);
    await keyboard.releaseKey(Key.F5);
    return { success: true, output: 'Navegador: página atualizada' };
  },

  async browser_close_tab(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.LeftControl, Key.W);
    await keyboard.releaseKey(Key.LeftControl, Key.W);
    return { success: true, output: 'Navegador: aba fechada' };
  },

  async browser_new_tab(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.LeftControl, Key.T);
    await keyboard.releaseKey(Key.LeftControl, Key.T);
    return { success: true, output: 'Navegador: nova aba aberta' };
  },

  async browser_search(intent: ParsedIntent): Promise<ExecutionResult> {
    const query = intent.params['query'] as string;
    if (!query) return { success: false, error: 'Texto de busca obrigatório.' };
    await keyboard.pressKey(Key.LeftControl, Key.L);
    await keyboard.releaseKey(Key.LeftControl, Key.L);
    await sleep(200);
    keyboard.config.autoDelayMs = 5;
    await keyboard.type(query);
    await sleep(100);
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
    return { success: true, output: `Pesquisando no navegador: ${query}` };
  }
};
