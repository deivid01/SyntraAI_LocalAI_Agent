import { app } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
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
