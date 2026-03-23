import logger from '../core/logger';
import keyboardController from './keyboardController';
import { Key } from '@nut-tree-fork/nut-js';

export interface FallbackStrategy {
  name: string;
  action: () => Promise<boolean>;
}

export class FallbackHandler {
  private static instance: FallbackHandler;

  private constructor() {}

  public static getInstance(): FallbackHandler {
    if (!FallbackHandler.instance) {
      FallbackHandler.instance = new FallbackHandler();
    }
    return FallbackHandler.instance;
  }

  /**
   * Executes fallback strategies when vision fails.
   */
  public async executeFallbacks(context: string): Promise<boolean> {
    logger.warn('FallbackHandler', `Executing fallback strategies for context: ${context}`);

    const strategies: FallbackStrategy[] = [
      {
        name: 'Keyboard Shortcut: Spotify Play',
        action: async () => {
          if (context.toLowerCase().includes('spotify') && context.toLowerCase().includes('play')) {
             // Space bar is usually play/pause in Spotify if focused
             await keyboardController.pressKey(Key.Space);
             return true;
          }
          return false;
        }
      },
      {
        name: 'Keyboard Shortcut: Spotify Search',
        action: async () => {
          if (context.toLowerCase().includes('spotify') && context.toLowerCase().includes('search')) {
             // Ctrl+L focuses search in Spotify
             await keyboardController.shortcut(Key.LeftControl, Key.L);
             return true;
          }
          return false;
        }
      },
      {
        name: 'Generic Enter',
        action: async () => {
          await keyboardController.pressEnter();
          return true;
        }
      }
    ];

    for (const strategy of strategies) {
      try {
        const success = await strategy.action();
        if (success) {
          logger.info('FallbackHandler', `✅ Fallback strategy "${strategy.name}" executed successfully.`);
          return true;
        }
      } catch (err) {
        logger.error('FallbackHandler', `Error executing fallback strategy "${strategy.name}"`, err);
      }
    }

    return false;
  }
}

export const fallbackHandler = FallbackHandler.getInstance();
