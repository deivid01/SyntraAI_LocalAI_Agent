import { app } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Polyfill for File/Blob in Electron Main process (required for some Node modules like undici)
if (typeof File === 'undefined') {
  const { Blob } = require('buffer');
  class File extends Blob {
    readonly name: string;
    readonly lastModified: number;
    constructor(chunks: any[], name: string, options?: any) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  }
  (global as any).File = File;
}

import { appController } from '../controllers/AppController';
import logger from '../../core/logger';

// Global Error Handling for Main Process
process.on('uncaughtException', (error) => {
  logger.error('MainProcess', '🛑 UNCAUGHT EXCEPTION:', error);
  // Optional: Notify user via UI if window is available, or just log and stay alive
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('MainProcess', '⚠️ UNHANDLED REJECTION:', reason);
});

// Initial config
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

app.on('ready', () => {
  appController.init();
});

app.on('window-all-closed', () => {
  appController.cleanup();
  app.quit();
});

app.on('activate', () => {
  // handled in AppController
});
