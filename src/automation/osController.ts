import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import logger from '../core/logger';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';
import windowManager from './windowManager';
import mouseController from './mouseController';
import keyboardController from './keyboardController';
import sequenceRunner, { AutomationStep } from './sequenceRunner';
import { Key } from '@nut-tree-fork/nut-js';
import { visionEngine } from './visionEngine';
import { automationAgent } from './automationAgent';
import { ragIngestionEngine } from '../ai/ragIngestionEngine';

const execAsync = promisify(exec);

const APP_MAP: Record<string, string> = {
  chrome: 'chrome.exe',
  'google chrome': 'chrome.exe',
  firefox: 'firefox.exe',
  edge: 'msedge.exe',
  notepad: 'notepad.exe',
  'bloco de notas': 'notepad.exe',
  calculator: 'calc.exe',
  calculadora: 'calc.exe',
  explorer: 'explorer.exe',
  'explorador': 'explorer.exe',
  cmd: 'cmd.exe',
  powershell: 'powershell.exe',
  word: 'WINWORD.EXE',
  excel: 'EXCEL.EXE',
  outlook: 'OUTLOOK.EXE',
  vscode: 'code.exe',
  'visual studio code': 'code.exe',
  spotify: 'Spotify.exe',
  discord: 'Discord.exe',
  vlc: 'vlc.exe',
  paint: 'mspaint.exe',
};

function resolveApp(appName: string): string {
  const lower = appName.toLowerCase().trim();
  return APP_MAP[lower] ?? appName;
}

export async function safeExec(cmd: string): Promise<ExecutionResult> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 15000 });
    return { success: true, output: stdout.trim() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

export const osHandlers = {
  async open_app(intent: ParsedIntent): Promise<ExecutionResult> {
    const appName = (intent.params['app'] as string) ?? 'notepad';
    const executable = resolveApp(appName);
    let result = await safeExec(`start "" "${executable}"`);
    if (!result.success) result = await safeExec(`start "" "${appName}"`);

    // Tentar focar a janela após abrir
    if (result.success) {
      setTimeout(async () => {
        await windowManager.waitForWindow(appName, 15000);
      }, 2000);
    }
    return result;
  },

  async close_app(intent: ParsedIntent): Promise<ExecutionResult> {
    const appName = (intent.params['app'] as string) ?? '';
    const executable = resolveApp(appName).replace('.exe', '');
    return await safeExec(`taskkill /IM "${executable}.exe" /F`);
  },

  async focus_window(intent: ParsedIntent): Promise<ExecutionResult> {
    const title = (intent.params['title'] as string) ?? '';
    const success = await windowManager.focusWindow(title);
    return { success, output: success ? `Janela "${title}" focada.` : `Janela "${title}" não encontrada.` };
  },

  async mouse_move(intent: ParsedIntent): Promise<ExecutionResult> {
    const x = intent.params['x'] as number;
    const y = intent.params['y'] as number;
    const success = await mouseController.move(x, y);
    return { success };
  },

  async mouse_click(intent: ParsedIntent): Promise<ExecutionResult> {
    const button = (intent.params['button'] as 'left' | 'right' | 'middle') ?? 'left';
    const success = await mouseController.click(button);
    return { success };
  },

  async mouse_double_click(): Promise<ExecutionResult> {
    const success = await mouseController.doubleClick();
    return { success };
  },

  async keyboard_type(intent: ParsedIntent): Promise<ExecutionResult> {
    const text = (intent.params['text'] as string) ?? '';
    const success = await keyboardController.typeText(text);
    return { success };
  },

  async keyboard_shortcut(intent: ParsedIntent): Promise<ExecutionResult> {
    const mod = intent.params['modifier'] as keyof typeof Key;
    const key = intent.params['key'] as keyof typeof Key;
    const success = await keyboardController.shortcut(Key[mod], Key[key]);
    return { success };
  },

  async keyboard_enter(): Promise<ExecutionResult> {
    const success = await keyboardController.pressEnter();
    return { success };
  },

  async automation_sequence(intent: ParsedIntent): Promise<ExecutionResult> {
    const steps = (intent.params['steps'] as AutomationStep[]) ?? [];
    if (steps.length === 0) return { success: false, error: 'Nenhum passo na sequência.' };
    
    const appName = (intent.params['app'] as string) || 'unknown';
    const success = await automationAgent.executeAdaptive(steps, appName, 'custom_sequence');
    return { success, output: success ? 'Sequência executada com sucesso.' : 'Falha na execução adaptativa.' };
  },

  async vision_click_text(intent: ParsedIntent): Promise<ExecutionResult> {
    const text = intent.params['text'] as string;
    const confidence = intent.params['confidence'] as number | undefined;
    const success = await visionEngine.findAndClick({ text, confidence });
    return { success };
  },

  async vision_click_template(intent: ParsedIntent): Promise<ExecutionResult> {
    const template = intent.params['template'] as string;
    const confidence = intent.params['confidence'] as number | undefined;
    const success = await visionEngine.findAndClick({ template, confidence });
    return { success };
  },

  async rag_ingest(intent: ParsedIntent): Promise<ExecutionResult> {
    const type = intent.params['type'] as 'github' | 'web' | 'pdf';
    const source = intent.params['source'] as string;
    const options = intent.params['options'] || {};
    const jobId = await ragIngestionEngine.ingestSource(type, source, options);
    return { success: true, output: `Processo de ingestão iniciado. Job ID: ${jobId}` };
  },

  async run_command(intent: ParsedIntent): Promise<ExecutionResult> {
    const cmd = (intent.params['cmd'] as string) ?? '';
    if (!cmd) return { success: false, error: 'Nenhum comando especificado.' };
    const dangerous = ['rm -rf', 'format', 'del /f /s /q c:', 'rd /s /q c:'];
    if (dangerous.some(d => cmd.toLowerCase().includes(d))) {
      return { success: false, error: 'Comando bloqueado por segurança.' };
    }
    return await safeExec(cmd);
  },

  async shutdown(): Promise<ExecutionResult> {
    return await safeExec('shutdown /s /t 10');
  },

  async restart(): Promise<ExecutionResult> {
    return await safeExec('shutdown /r /t 10');
  },

  async volume(intent: ParsedIntent): Promise<ExecutionResult> {
    const level = intent.params['level'] as number | undefined;
    if (level !== undefined) {
      const vbs = `$wshShell = New-Object -comObject WScript.Shell; [System.Runtime.Interopservices.Marshal]::GetActiveObject('WMPlayer.OCX').settings.volume = ${level}`;
      return await safeExec(`powershell -c "${vbs}"`);
    } else if (intent.params['action'] === 'mute') {
      return await safeExec(`powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`);
    }
    return { success: false, error: 'Parâmetros de volume inválidos.' };
  },

  async screenshot(): Promise<ExecutionResult> {
    const timestamp = Date.now();
    const picDir = path.join(os.homedir(), 'Pictures');
    const file = path.join(picDir, `syntra_screenshot_${timestamp}.png`);
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; $bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size); $bitmap.Save('${file}')`;
    const res = await safeExec(`powershell -c "${script}"`);
    if (res.success) res.output = `Screenshot salvo em Imagens`;
    return res;
  }
};
