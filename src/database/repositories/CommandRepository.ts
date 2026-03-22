import { BaseRepository } from '../BaseRepository';
import { ICommandRecord } from '../../core/types';

export class CommandRepository extends BaseRepository<ICommandRecord> {
  protected tableName = 'commands';

  public async save(entity: ICommandRecord): Promise<void> {
    await this.query(
      `INSERT INTO ${this.tableName} (command, params, output, success) VALUES (?, ?, ?, ?)`,
      [entity.command, entity.params, entity.output, entity.success]
    );
  }

  public async getById(id: string | number): Promise<ICommandRecord | null> {
    const res = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    const items = this.mapResult(res);
    return items.length > 0 ? items[0] as ICommandRecord : null;
  }

  public async getRecent(limit: number): Promise<ICommandRecord[]> {
    const res = await this.query(`SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT ?`, [limit]);
    return this.mapResult(res) as ICommandRecord[];
  }
}
