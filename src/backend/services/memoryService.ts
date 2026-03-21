import { getDb, saveDb } from '../../database/db';
import { Database } from 'sql.js';
import logger from '../utils/logger';

export interface Interaction {
  id?: number;
  timestamp?: string;
  input: string;
  intent: string;
  response?: string;
  params?: string;
  success?: number;
}

export interface CommandRecord {
  id?: number;
  timestamp?: string;
  command: string;
  params?: string;
  output?: string;
  success?: number;
}

class MemoryService {
  private dbPromise: Promise<Database> = getDb();

  private async db(): Promise<Database> {
    return this.dbPromise;
  }

  async saveInteraction(interaction: Interaction): Promise<void> {
    try {
      const db = await this.db();
      db.run(
        `INSERT INTO interactions (input, intent, response, params, success)
         VALUES (?, ?, ?, ?, ?)`,
        [
          interaction.input,
          interaction.intent,
          interaction.response ?? null,
          interaction.params ? JSON.stringify(interaction.params) : null,
          interaction.success ?? 1,
        ]
      );
      saveDb();
      logger.debug('Memory', `Interação salva: intent=${interaction.intent}`);
    } catch (err) {
      logger.error('Memory', 'Erro ao salvar interação', err);
    }
  }

  async saveCommand(record: CommandRecord): Promise<void> {
    try {
      const db = await this.db();
      db.run(
        `INSERT INTO commands (command, params, output, success) VALUES (?, ?, ?, ?)`,
        [record.command, record.params ?? null, record.output ?? null, record.success ?? 1]
      );
      saveDb();
    } catch (err) {
      logger.error('Memory', 'Erro ao salvar comando', err);
    }
  }

  async getHistory(limit = 20): Promise<Interaction[]> {
    try {
      const db = await this.db();
      const stmt = db.prepare(`SELECT * FROM interactions ORDER BY timestamp DESC LIMIT ?`);
      stmt.bind([limit]);
      const rows: Interaction[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Interaction);
      stmt.free();
      return rows;
    } catch (err) {
      logger.error('Memory', 'Erro ao ler histórico', err);
      return [];
    }
  }

  async getLastCommands(limit = 10): Promise<CommandRecord[]> {
    try {
      const db = await this.db();
      const stmt = db.prepare(`SELECT * FROM commands ORDER BY timestamp DESC LIMIT ?`);
      stmt.bind([limit]);
      const rows: CommandRecord[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as unknown as CommandRecord);
      stmt.free();
      return rows;
    } catch (err) {
      logger.error('Memory', 'Erro ao ler comandos', err);
      return [];
    }
  }

  async getContextSummary(limit = 5): Promise<string> {
    const history = await this.getHistory(limit);
    if (history.length === 0) return '';
    return history
      .reverse()
      .map(h => `Usuário: ${h.input}\nJarvis: ${h.response ?? h.intent}`)
      .join('\n');
  }

  async clearHistory(): Promise<void> {
    const db = await this.db();
    db.run('DELETE FROM interactions');
    db.run('DELETE FROM commands');
    saveDb();
    logger.info('Memory', 'Histórico limpo.');
  }
}

export default new MemoryService();
