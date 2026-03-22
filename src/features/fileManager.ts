import * as fs from 'fs';
import * as path from 'path';
import { ParsedIntent } from '../core/intentParser';
import { ExecutionResult } from '../core/types';
import { isPathSafe } from '../automation/scriptRunner';

export const fileHandlers = {
  async create_file(intent: ParsedIntent): Promise<ExecutionResult> {
    const filename = intent.params['filename'] as string ?? 'novo_arquivo.txt';
    const content = intent.params['content'] as string ?? '';
    if (!isPathSafe(filename)) return { success: false, error: 'Caminho bloqueado por segurança.' };
    try {
      const dir = path.dirname(path.resolve(filename));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filename, content, 'utf-8');
      return { success: true, output: `Arquivo criado: ${path.resolve(filename)}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async read_file(intent: ParsedIntent): Promise<ExecutionResult> {
    const filename = intent.params['filename'] as string;
    if (!filename) return { success: false, error: 'Nome de arquivo obrigatório.' };
    try {
      const resolved = path.resolve(filename);
      if (!fs.existsSync(resolved)) return { success: false, error: `Arquivo não encontrado: ${resolved}` };
      const stat = fs.statSync(resolved);
      if (stat.size > 1024 * 1024) return { success: false, error: 'Arquivo muito grande (>1MB).' };
      const content = fs.readFileSync(resolved, 'utf-8');
      return { success: true, output: content.substring(0, 1000) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async edit_file(intent: ParsedIntent): Promise<ExecutionResult> {
    const filename = intent.params['filename'] as string;
    const content = intent.params['content'] as string ?? '';
    const mode = (intent.params['mode'] as string ?? 'append').toLowerCase();
    if (!filename) return { success: false, error: 'Nome de arquivo obrigatório.' };
    if (!isPathSafe(filename)) return { success: false, error: 'Caminho bloqueado por segurança.' };
    try {
      const resolved = path.resolve(filename);
      if (mode === 'overwrite') {
        fs.writeFileSync(resolved, content, 'utf-8');
        return { success: true, output: `Arquivo sobrescrito: ${resolved}` };
      } else {
        fs.appendFileSync(resolved, content, 'utf-8');
        return { success: true, output: `Conteúdo adicionado ao arquivo: ${resolved}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async delete_file(intent: ParsedIntent): Promise<ExecutionResult> {
    const filename = intent.params['filename'] as string;
    if (!filename) return { success: false, error: 'Nome de arquivo obrigatório.' };
    if (!isPathSafe(filename)) return { success: false, error: 'Caminho bloqueado por segurança.' };
    try {
      const resolved = path.resolve(filename);
      if (!fs.existsSync(resolved)) return { success: false, error: `Arquivo não encontrado: ${resolved}` };
      fs.unlinkSync(resolved);
      return { success: true, output: `Arquivo deletado: ${resolved}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
