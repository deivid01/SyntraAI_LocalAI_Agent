import { Key } from '@nut-tree-fork/nut-js';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';
import mouseController from './mouseController';
import keyboardController from './keyboardController';

const KEY_MAP: Record<string, Key> = {
  'ctrl': Key.LeftControl, 'alt': Key.LeftAlt, 'shift': Key.LeftShift,
  'win': Key.LeftSuper, 'super': Key.LeftSuper,
  'c': Key.C, 'v': Key.V, 'a': Key.A, 'z': Key.Z, 'x': Key.X, 's': Key.S,
  'enter': Key.Enter, 'tab': Key.Tab, 'esc': Key.Escape, 'space': Key.Space,
  'up': Key.Up, 'down': Key.Down, 'left': Key.Left, 'right': Key.Right,
};

export const guiHandlers = {
  async mouse_move(intent: ParsedIntent): Promise<ExecutionResult> {
    const x = intent.params['x'] as number;
    const y = intent.params['y'] as number;
    if (x === undefined || y === undefined) return { success: false, error: 'X e Y obrigatórios.' };
    const success = await mouseController.move(x, y);
    return { success, output: success ? `Mouse movido para ${x}, ${y}` : `Falha ao mover mouse.` };
  },

  async mouse_click(intent: ParsedIntent): Promise<ExecutionResult> {
    const button = (intent.params['button'] as 'left' | 'right' | 'middle') ?? 'left';
    const success = await mouseController.click(button);
    return { success, output: success ? `Mouse clicado (${button})` : `Falha ao clicar.` };
  },

  async mouse_double_click(): Promise<ExecutionResult> {
    const success = await mouseController.doubleClick();
    return { success, output: success ? `Mouse duplo clique realizado.` : `Falha no duplo clique.` };
  },

  async mouse_drag(intent: ParsedIntent): Promise<ExecutionResult> {
    const x = intent.params['x'] as number;
    const y = intent.params['y'] as number;
    const startX = intent.params['startX'] as number ?? 0;
    const startY = intent.params['startY'] as number ?? 0;
    if (x === undefined || y === undefined) return { success: false, error: 'X e Y finais obrigatórios.' };
    const success = await mouseController.drag(startX, startY, x, y);
    return { success, output: success ? `Mouse arrastado para ${x}, ${y}` : `Falha ao arrastar.` };
  },

  async keyboard_type(intent: ParsedIntent): Promise<ExecutionResult> {
    const text = intent.params['text'] as string ?? '';
    if (!text) return { success: false, error: 'Nenhum texto fornecido.' };
    const success = await keyboardController.typeText(text);
    return { success, output: success ? `Digitado: ${text}` : `Falha ao digitar.` };
  },

  async keyboard_enter(): Promise<ExecutionResult> {
    const success = await keyboardController.pressEnter();
    return { success, output: success ? `Enter pressionado` : `Falha ao pressionar Enter.` };
  },

  async keyboard_shortcut(intent: ParsedIntent): Promise<ExecutionResult> {
    const keysStr = intent.params['keys'] as string;
    if (!keysStr) return { success: false, error: 'Nenhuma tecla fornecida.' };
    const parts = keysStr.split(',').map(k => k.trim().toLowerCase());
    const keys = parts.map(p => KEY_MAP[p]).filter(k => k !== undefined);
    if (keys.length === 0) return { success: false, error: 'Teclas inválidas.' };
    // Se for um atalho de duas teclas, usa o método shortcut
    let success = false;
    if (keys.length === 2) {
      success = await keyboardController.shortcut(keys[0], keys[1]);
    } else {
      success = await keyboardController.pressKey(...keys);
    }
    return { success, output: success ? `Atalho executado: ${keysStr}` : `Falha no atalho.` };
  },

  async scroll(intent: ParsedIntent): Promise<ExecutionResult> {
    const amount = intent.params['amount'] as number ?? 100;
    const success = await mouseController.scroll(amount);
    return { success, output: success ? `Scroll realizado: ${amount}` : `Falha ao realizar scroll.` };
  }
};

