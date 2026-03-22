import { keyboard, mouse, Point, Button, straightTo, Key } from '@nut-tree-fork/nut-js';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';

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
    await mouse.setPosition(new Point(x, y));
    return { success: true, output: `Mouse movido para ${x}, ${y}` };
  },

  async mouse_click(intent: ParsedIntent): Promise<ExecutionResult> {
    const button = intent.params['button'] as string ?? 'left';
    if (button === 'right') await mouse.rightClick();
    else await mouse.leftClick();
    return { success: true, output: `Mouse clicado (${button})` };
  },

  async mouse_double_click(): Promise<ExecutionResult> {
    await mouse.doubleClick(Button.LEFT);
    return { success: true, output: `Mouse duplo clique` };
  },

  async mouse_drag(intent: ParsedIntent): Promise<ExecutionResult> {
    const x = intent.params['x'] as number;
    const y = intent.params['y'] as number;
    if (x === undefined || y === undefined) return { success: false, error: 'X e Y obrigatórios.' };
    await mouse.drag(straightTo(new Point(x, y)));
    return { success: true, output: `Mouse arrastado para ${x}, ${y}` };
  },

  async keyboard_type(intent: ParsedIntent): Promise<ExecutionResult> {
    const text = intent.params['text'] as string ?? '';
    if (!text) return { success: false, error: 'Nenhum texto fornecido.' };
    keyboard.config.autoDelayMs = 10; 
    await keyboard.type(text);
    return { success: true, output: `Digitado: ${text}` };
  },

  async keyboard_enter(): Promise<ExecutionResult> {
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
    return { success: true, output: `Enter pressionado` };
  },

  async keyboard_shortcut(intent: ParsedIntent): Promise<ExecutionResult> {
    const keysStr = intent.params['keys'] as string;
    if (!keysStr) return { success: false, error: 'Nenhuma tecla fornecida.' };
    const parts = keysStr.split(',').map(k => k.trim().toLowerCase());
    const keys = parts.map(p => KEY_MAP[p]).filter(k => k !== undefined);
    if (keys.length === 0) return { success: false, error: 'Teclas inválidas.' };
    await keyboard.pressKey(...keys);
    await keyboard.releaseKey(...keys);
    return { success: true, output: `Atalho executado: ${keysStr}` };
  },

  async scroll(intent: ParsedIntent): Promise<ExecutionResult> {
    const amount = intent.params['amount'] as number ?? 100; 
    if (amount < 0) await mouse.scrollDown(Math.abs(amount));
    else await mouse.scrollUp(amount);
    return { success: true, output: `Scroll realizado: ${amount}` };
  }
};
