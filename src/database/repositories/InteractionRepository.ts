import { BaseRepository } from '../BaseRepository';
import { IInteraction, IInteractionRepository } from '../../core/types';

export class InteractionRepository extends BaseRepository<IInteraction> implements IInteractionRepository {
  protected tableName = 'interactions';

  public async save(entity: IInteraction): Promise<void> {
    await this.query(
      `INSERT INTO ${this.tableName} (input, intent, response, params, success) VALUES (?, ?, ?, ?, ?)`,
      [entity.input, entity.intent, entity.response, entity.params, entity.success]
    );
  }

  public async getById(id: string | number): Promise<IInteraction | null> {
    const res = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    const items = this.mapResult(res);
    return items.length > 0 ? items[0] as IInteraction : null;
  }

  public async getRecent(limit: number): Promise<IInteraction[]> {
    const res = await this.query(`SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT ?`, [limit]);
    return this.mapResult(res) as IInteraction[];
  }
}
