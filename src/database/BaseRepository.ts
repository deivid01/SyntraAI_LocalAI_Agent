import { Database } from 'sql.js';
import { getDb, saveDb } from './db';

interface QueryResults {
  columns: string[];
  values: any[][];
}

export abstract class BaseRepository<T> {
  protected abstract tableName: string;

  protected async db(): Promise<Database> {
    return await getDb();
  }

  protected async query(sql: string, params: any[] = []): Promise<QueryResults[]> {
    const db = await this.db();
    const res = db.exec(sql, params) as unknown as QueryResults[];
    saveDb();
    return res;
  }

  protected mapResult(results: QueryResults[]): any[] {
    if (results.length === 0) return [];
    const columns = results[0].columns;
    return results[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  public async getAll(): Promise<T[]> {
    const res = await this.query(`SELECT * FROM ${this.tableName}`);
    return this.mapResult(res) as T[];
  }

  public async delete(id: string | number): Promise<void> {
    await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}
