import { keyboard, Key } from '@nut-tree-fork/nut-js';
import logger from '../core/logger';

export class KeyboardController {
  private static instance: KeyboardController;

  private constructor() {
    // Configurações padrão
    keyboard.config.autoDelayMs = 50;
  }

  public static getInstance(): KeyboardController {
    if (!KeyboardController.instance) {
      KeyboardController.instance = new KeyboardController();
    }
    return KeyboardController.instance;
  }

  /**
   * Digita o texto especificado.
   */
  public async typeText(text: string): Promise<boolean> {
    try {
      await keyboard.type(text);
      return true;
    } catch (error) {
      logger.error('KeyboardController', `Erro ao digitar texto:`, error);
      return false;
    }
  }

  /**
   * Pressiona uma tecla individual.
   */
  public async pressKey(...keys: Key[]): Promise<boolean> {
    try {
      await keyboard.pressKey(...keys);
      await keyboard.releaseKey(...keys);
      return true;
    } catch (error) {
      logger.error('KeyboardController', `Erro ao pressionar teclas:`, error);
      return false;
    }
  }

  /**
   * Atalho de teclado (ex: Ctrl+C).
   */
  public async shortcut(modifier: Key, key: Key): Promise<boolean> {
    try {
      await keyboard.pressKey(modifier, key);
      await keyboard.releaseKey(modifier, key);
      return true;
    } catch (error) {
      logger.error('KeyboardController', `Erro ao executar atalho:`, error);
      return false;
    }
  }

  /**
   * Pressiona Enter.
   */
  public async pressEnter(): Promise<boolean> {
    try {
      await keyboard.type(Key.Enter);
      return true;
    } catch (error) {
      logger.error('KeyboardController', 'Erro ao pressionar Enter:', error);
      return false;
    }
  }
}

export default KeyboardController.getInstance();
