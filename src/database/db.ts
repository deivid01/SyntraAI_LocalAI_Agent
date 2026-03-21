import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../backend/utils/config';
import logger from '../backend/utils/logger';

let _db: Database | null = null;
const dbPath = path.resolve(config.dbPath);

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  let data: Buffer | undefined;
  if (fs.existsSync(dbPath)) {
    data = fs.readFileSync(dbPath);
  }

  const db = data ? new SQL.Database(new Uint8Array(data.buffer)) : new SQL.Database();

  // Run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.run(fs.readFileSync(schemaPath, 'utf-8'));
    logger.info('DB', 'Schema carregado.');
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        input TEXT NOT NULL, intent TEXT NOT NULL,
        response TEXT, params TEXT, success INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        command TEXT NOT NULL, params TEXT, output TEXT,
        success INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
  }

  logger.info('DB', `Banco inicializado: ${dbPath}`);
  return db;
}

function persistDb(db: Database): void {
  const data = db.export();
  fs.writeFileSync(dbPath, data);
}

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await initDb();
  return _db;
}

export function saveDb(): void {
  if (_db) persistDb(_db);
}

export function closeDb(): void {
  if (_db) {
    saveDb();
    _db.close();
    _db = null;
    logger.info('DB', 'Banco fechado.');
  }
}

export default getDb;
