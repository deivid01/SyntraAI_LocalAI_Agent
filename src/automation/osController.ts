import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import logger from '../core/logger';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';

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
    return result;
  },

  async close_app(intent: ParsedIntent): Promise<ExecutionResult> {
    const appName = (intent.params['app'] as string) ?? '';
    const executable = resolveApp(appName).replace('.exe', '');
    return await safeExec(`taskkill /IM "${executable}.exe" /F`);
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
