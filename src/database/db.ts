import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../core/config';
import logger from '../core/logger';

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
      CREATE TABLE IF NOT EXISTS sequences (
        name TEXT PRIMARY KEY,
        steps TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      
      -- Synapse Access
      CREATE TABLE IF NOT EXISTS synapse_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS synapse_files (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
        size INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE TABLE IF NOT EXISTS synapse_chunks (
        id TEXT PRIMARY KEY, file_id TEXT NOT NULL, chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL, embedding_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS synapse_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL,
        message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
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
