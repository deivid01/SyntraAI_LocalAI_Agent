import { exec } from 'child_process';
import { promisify } from 'util';
import { ParsedIntent } from './intentParser';
import logger from '../utils/logger';
import memoryService from '../services/memoryService';

const execAsync = promisify(exec);

// Map of common app names to Windows executables
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

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

async function safeExec(cmd: string): Promise<ExecutionResult> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10000 });
    return { success: true, output: stdout.trim() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

export async function executeIntent(intent: ParsedIntent): Promise<ExecutionResult> {
  logger.info('CommandExecutor', `Executando intent: ${intent.intent}`, intent.params);

  let result: ExecutionResult;

  switch (intent.intent) {
    case 'open_app': {
      const appName = (intent.params['app'] as string) ?? 'notepad';
      const executable = resolveApp(appName);
      result = await safeExec(`start "" "${executable}"`);
      if (!result.success) {
        // Try with just the name directly
        result = await safeExec(`start "" "${appName}"`);
      }
      break;
    }

    case 'close_app': {
      const appName = (intent.params['app'] as string) ?? '';
      const executable = resolveApp(appName).replace('.exe', '');
      result = await safeExec(`taskkill /IM "${executable}.exe" /F`);
      break;
    }

    case 'run_command': {
      const cmd = (intent.params['cmd'] as string) ?? '';
      if (!cmd) {
        result = { success: false, error: 'Nenhum comando especificado.' };
        break;
      }
      // Safety: block obviously dangerous commands
      const dangerous = ['rm -rf', 'format', 'del /f /s /q c:', 'rd /s /q c:'];
      if (dangerous.some(d => cmd.toLowerCase().includes(d))) {
        result = { success: false, error: 'Comando bloqueado por segurança.' };
        break;
      }
      result = await safeExec(cmd);
      break;
    }

    case 'shutdown': {
      result = await safeExec('shutdown /s /t 10');
      break;
    }

    case 'restart': {
      result = await safeExec('shutdown /r /t 10');
      break;
    }

    case 'volume': {
      const level = intent.params['level'] as number | undefined;
      if (level !== undefined) {
        const vbs = `$wshShell = New-Object -comObject WScript.Shell; [System.Runtime.Interopservices.Marshal]::GetActiveObject('WMPlayer.OCX').settings.volume = ${level}`;
        result = await safeExec(`powershell -c "${vbs}"`);
      } else if (intent.params['action'] === 'mute') {
        result = await safeExec(`powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`);
      } else {
        result = { success: false, error: 'Parâmetros de volume inválidos.' };
      }
      break;
    }

    case 'screenshot': {
      const timestamp = Date.now();
      const file = `%USERPROFILE%\\Pictures\\jarvis_screenshot_${timestamp}.png`;
      result = await safeExec(`powershell -c "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; $bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size); $bitmap.Save('${file}')"`);
      if (result.success) result.output = `Screenshot salvo: ${file}`;
      break;
    }

    case 'chat':
    default:
      result = { success: true, output: 'Resposta de chat' };
      break;
  }

  // Log to memory
  memoryService.saveCommand({
    command: intent.intent,
    params: JSON.stringify(intent.params),
    output: result.output,
    success: result.success ? 1 : 0,
  });

  if (!result.success) {
    logger.warn('CommandExecutor', `Execução falhou: ${result.error}`);
  } else {
    logger.info('CommandExecutor', `Execução bem-sucedida`, result.output);
  }

  return result;
}
