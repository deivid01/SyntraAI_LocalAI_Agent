import { BaseRepository } from '../BaseRepository';
import { ISequence, ISequenceRepository } from '../../core/types';

export class SequenceRepository extends BaseRepository<ISequence> implements ISequenceRepository {
  protected tableName = 'sequences';

  public async save(entity: ISequence): Promise<void> {
    await this.query(
      `INSERT OR REPLACE INTO ${this.tableName} (name, steps) VALUES (?, ?)`,
      [entity.name, entity.steps]
    );
  }

  public async getById(name: string): Promise<ISequence | null> {
    return this.findByName(name);
  }

  public async findByName(name: string): Promise<ISequence | null> {
    const res = await this.query(`SELECT * FROM ${this.tableName} WHERE name = ?`, [name]);
    const items = this.mapResult(res);
    return items.length > 0 ? items[0] as ISequence : null;
  }
}
