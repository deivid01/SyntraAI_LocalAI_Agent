import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../core/logger';
import { config } from '../core/config';

export interface LearnedAction {
  id?: number;
  app: string;
  intent: string;
  method: 'ocr' | 'template' | 'yolo' | 'shortcut';
  params: string;
  success_count: number;
  fail_count: number;
  last_used: number;
}

export class LearningService {
  private static instance: LearningService;
  private db: Database | null = null;
  private dbPath: string;

  private constructor() {
    this.dbPath = config.dbPath; // Using the existing database path
  }

  public static getInstance(): LearningService {
    if (!LearningService.instance) {
      LearningService.instance = new LearningService();
    }
    return LearningService.instance;
  }

  public async init(): Promise<void> {
    try {
      const SQL = await initSqlJs();
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        logger.info('LearningService', 'Database loaded from ' + this.dbPath);
      } else {
        this.db = new SQL.Database();
        logger.info('LearningService', 'New in-memory database created (will save to ' + this.dbPath + ')');
      }

      this.createTables();
    } catch (err) {
      logger.error('LearningService', 'Error initializing database', err);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS learned_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app TEXT,
        intent TEXT,
        method TEXT,
        params TEXT,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_used INTEGER,
        UNIQUE(app, intent, method, params)
      );
    `);
    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public async recordAction(action: LearnedAction, success: boolean): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const lastUsed = Date.now();
    try {
      this.db.run(`
        INSERT INTO learned_actions (app, intent, method, params, success_count, fail_count, last_used)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(app, intent, method, params) DO UPDATE SET
          success_count = success_count + ?,
          fail_count = fail_count + ?,
          last_used = ?
      `, [
        action.app, action.intent, action.method, action.params, 
        success ? 1 : 0, success ? 0 : 1, lastUsed,
        success ? 1 : 0, success ? 0 : 1, lastUsed
      ]);
      this.save();
    } catch (err) {
      logger.error('LearningService', 'Error recording action', err);
    }
  }

  public async getBestMethod(app: string, intent: string): Promise<LearnedAction | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM learned_actions 
        WHERE app = ? AND intent = ? 
        ORDER BY (success_count * 1.0 / (success_count + fail_count + 1)) DESC, last_used DESC
        LIMIT 1
      `);
      stmt.bind([app, intent]);
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        stmt.free();
        return row as LearnedAction;
      }
      stmt.free();
    } catch (err) {
      logger.error('LearningService', 'Error getting best method', err);
    }
    return null;
  }
}

export const learningService = LearningService.getInstance();
