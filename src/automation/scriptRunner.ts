import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../core/logger';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';
import { safeExec } from './osController';

const execAsync = promisify(exec);

const BLOCKED_PATHS = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'];
const ALLOWED_SCRIPT_EXTENSIONS = ['.js', '.ts', '.bat', '.ps1'];
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i, /del\s+\/[fsq]/i, /rd\s+\/s/i, /format\s+[a-z]:/i,
  /Remove-Item.*-Recurse.*-Force/i, /reg\s+(add|delete)/i, /New-ItemProperty.*Registry/i,
  /Invoke-WebRequest/i, /curl\s+.*-d/i, /wget/i, /net\s+user/i, /net\s+localgroup/i,
  /runas/i, /shutdown/i, /bcdedit/i, /diskpart/i,
];

export function isPathSafe(filepath: string): boolean {
  const resolved = path.resolve(filepath);
  return !BLOCKED_PATHS.some(bp => resolved.toLowerCase().startsWith(bp.toLowerCase()));
}

function validateScriptContent(content: string): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) return `Padrão perigoso detectado: ${pattern.source}`;
  }
  return null;
}

function getScriptRunner(ext: string): string {
  switch (ext) {
    case '.js':  return 'node';
    case '.ts':  return 'npx ts-node';
    case '.bat': return 'cmd /c';
    case '.ps1': return 'powershell -ExecutionPolicy Bypass -File';
    default:     return 'node';
  }
}

export const scriptHandlers = {
  async run_script(intent: ParsedIntent): Promise<ExecutionResult> {
    const scriptPath = intent.params['script_path'] as string;
    if (!scriptPath) return { success: false, error: 'Caminho do script obrigatório.' };

    const resolved = path.resolve(scriptPath);
    if (!isPathSafe(resolved)) return { success: false, error: 'Script em caminho bloqueado por segurança.' };
    if (!fs.existsSync(resolved)) return { success: false, error: `Script não encontrado: ${resolved}` };

    const ext = path.extname(resolved).toLowerCase();
    if (!ALLOWED_SCRIPT_EXTENSIONS.includes(ext)) {
      return { success: false, error: `Extensão não permitida: ${ext}` };
    }

    try {
      const stat = fs.statSync(resolved);
      if (stat.size > 512 * 1024) return { success: false, error: 'Script muito grande (>512KB).' };
      const content = fs.readFileSync(resolved, 'utf-8');
      const danger = validateScriptContent(content);
      if (danger) {
        logger.warn('ScriptSecurity', `Script bloqueado: ${resolved} — ${danger}`);
        return { success: false, error: `Script bloqueado: ${danger}` };
      }
    } catch (readErr: any) {
      return { success: false, error: `Erro ao ler script: ${readErr.message}` };
    }

    const runner = getScriptRunner(ext);
    const cmd = `${runner} "${resolved}"`;
    logger.info('ScriptExec', `Executando: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      const output = (stdout || '').trim();
      const errors = (stderr || '').trim();
      if (errors && !output) return { success: false, error: errors.substring(0, 500) };
      return { success: true, output: output.substring(0, 1000) || 'Script executado com sucesso.' };
    } catch (err: any) {
      return { success: false, error: `Falha na execução: ${err.message.substring(0, 300)}` };
    }
  }
};
