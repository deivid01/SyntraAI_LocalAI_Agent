import { BaseRepository } from '../BaseRepository';
import { ISynapseFile, ISynapseChunk, ISynapseLog, ISynapseRepository } from '../../core/types';

export class SynapseRepository extends BaseRepository<any> implements ISynapseRepository {
  protected tableName = 'synapse_files';

  public async saveFile(file: ISynapseFile): Promise<void> {
    await this.query(
      `INSERT OR REPLACE INTO ${this.tableName} (id, name, type, size, status) VALUES (?, ?, ?, ?, ?)`,
      [file.id, file.name, file.type, file.size, file.status]
    );
  }

  public async updateFileStatus(id: string, status: string): Promise<void> {
    await this.query(`UPDATE ${this.tableName} SET status = ? WHERE id = ?`, [status, id]);
  }

  public async saveChunk(chunk: ISynapseChunk): Promise<void> {
    await this.query(
      `INSERT OR REPLACE INTO synapse_chunks (id, file_id, chunk_index, content, embedding_json) VALUES (?, ?, ?, ?, ?)`,
      [chunk.id, chunk.file_id, chunk.chunk_index, chunk.content, chunk.embedding_json]
    );
  }

  public async getFiles(): Promise<ISynapseFile[]> {
    const res = await this.query(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`);
    return this.mapResult(res) as ISynapseFile[];
  }

  public async getProcessedChunks(): Promise<any[]> {
    const res = await this.query(`
      SELECT c.id as chunk_id, c.content, c.embedding_json, f.name as file_name
      FROM synapse_chunks c
      JOIN synapse_files f ON c.file_id = f.id
      WHERE f.status = 'processed'
    `);
    return this.mapResult(res);
  }

  public async getChunksForFile(file_id: string): Promise<ISynapseChunk[]> {
    const res = await this.query(`SELECT * FROM synapse_chunks WHERE file_id = ?`, [file_id]);
    return this.mapResult(res) as ISynapseChunk[];
  }

  public async logEvent(event: string, message: string): Promise<void> {
    await this.query(
      `INSERT INTO synapse_logs (event, message) VALUES (?, ?)`,
      [event, message]
    );
  }

  public async getLogs(): Promise<ISynapseLog[]> {
    const res = await this.query(`SELECT * FROM synapse_logs ORDER BY created_at DESC LIMIT 100`);
    return this.mapResult(res) as ISynapseLog[];
  }

  public async getStats(): Promise<{ total_files: number; total_chunks: number; training_active: boolean }> {
    const filesRes = await this.query(`SELECT count(*) as count FROM synapse_files WHERE status = 'processed'`);
    const chunksRes = await this.query(`SELECT count(*) as count FROM synapse_chunks`);
    const settingRes = await this.getSetting('training_mode_active');
    
    return {
      total_files: (this.mapResult(filesRes)[0]?.count as number) || 0,
      total_chunks: (this.mapResult(chunksRes)[0]?.count as number) || 0,
      training_active: settingRes === 'true'
    };
  }

  public async getSetting(key: string): Promise<string | null> {
    const res = await this.query(`SELECT value FROM synapse_settings WHERE key = ?`, [key]);
    const items = this.mapResult(res);
    return items.length > 0 ? items[0].value : null;
  }

  public async setSetting(key: string, value: string): Promise<void> {
    await this.query(`
      INSERT INTO synapse_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?
    `, [key, value, value]);
  }
}
