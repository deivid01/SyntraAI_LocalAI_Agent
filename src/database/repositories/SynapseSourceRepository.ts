import { BaseRepository } from '../BaseRepository';

export interface ISynapseSource {
  id: string;
  type: 'github' | 'web' | 'wikipedia' | 'stackoverflow' | 'pdf';
  source: string;
  options?: any;
  description?: string;
  last_sync?: string;
  created_at?: string;
}

export class SynapseSourceRepository extends BaseRepository<ISynapseSource> {
  protected tableName = 'synapse_sources';

  public async addSource(source: ISynapseSource): Promise<void> {
    await this.query(
      `INSERT INTO ${this.tableName} (id, type, source, options, description, last_sync) VALUES (?, ?, ?, ?, ?, ?)`,
      [source.id, source.type, source.source, JSON.stringify(source.options || {}), source.description, source.last_sync]
    );
  }

  public async getSources(): Promise<ISynapseSource[]> {
    const res = await this.query(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`);
    return this.mapResult(res).map(s => ({
        ...s,
        options: JSON.parse(s.options || '{}')
    }));
  }

  public async removeSource(id: string): Promise<void> {
    await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  public async updateLastSync(id: string): Promise<void> {
    const now = new Date().toLocaleString('pt-BR');
    await this.query(`UPDATE ${this.tableName} SET last_sync = ? WHERE id = ?`, [now, id]);
  }
}
