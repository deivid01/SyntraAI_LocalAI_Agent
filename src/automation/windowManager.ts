import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../core/logger';

const execAsync = promisify(exec);

export class WindowManager {
  private static instance: WindowManager;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * Procura uma janela pelo título e a traz para o primeiro plano.
   * @param windowTitle Parte do título da janela.
   */
  public async focusWindow(windowTitle: string): Promise<boolean> {
    const script = `
      $title = "${windowTitle}"
      $wshell = New-Object -ComObject WScript.Shell
      $processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*$title*" }
      if ($processes) {
        $id = $processes[0].Id
        $wshell.AppActivate($id)
        return $true
      }
      return $false
    `;

    try {
      const { stdout } = await execAsync(`powershell -command "${script.replace(/\n/g, ' ')}"`);
      return stdout.trim().toLowerCase() === 'true';
    } catch (error) {
      logger.error('WindowManager', `Erro ao focar janela "${windowTitle}":`, error);
      return false;
    }
  }

  /**
   * Aguarda até que uma janela com o título especificado esteja disponível e a foca.
   * @param windowTitle Parte do título da janela.
   * @param timeout Timeout em milissegundos.
   */
  public async waitForWindow(windowTitle: string, timeout: number = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const success = await this.focusWindow(windowTitle);
      if (success) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }
}

export default WindowManager.getInstance();
