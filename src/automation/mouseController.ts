import { mouse, Button, Point, straightTo } from '@nut-tree-fork/nut-js';
import logger from '../core/logger';

export class MouseController {
  private static instance: MouseController;

  private constructor() {
    // Configurações padrão
    mouse.config.mouseSpeed = 1000; // pixels por segundo para movimento suave
  }

  public static getInstance(): MouseController {
    if (!MouseController.instance) {
      MouseController.instance = new MouseController();
    }
    return MouseController.instance;
  }

  /**
   * Move o mouse para uma posição (x, y).
   */
  public async move(x: number, y: number): Promise<boolean> {
    try {
      await mouse.move(straightTo(new Point(x, y)));
      return true;
    } catch (error) {
      logger.error('MouseController', `Erro ao mover mouse para (${x}, ${y}):`, error);
      return false;
    }
  }

  /**
   * Clica com o botão especificado.
   */
  public async click(button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    try {
      const btn = button === 'right' ? Button.RIGHT : button === 'middle' ? Button.MIDDLE : Button.LEFT;
      await mouse.click(btn);
      return true;
    } catch (error) {
      logger.error('MouseController', `Erro ao clicar com botão ${button}:`, error);
      return false;
    }
  }

  /**
   * Duplo clique.
   */
  public async doubleClick(): Promise<boolean> {
    try {
      await mouse.doubleClick(Button.LEFT);
      return true;
    } catch (error) {
      logger.error('MouseController', 'Erro ao realizar duplo clique:', error);
      return false;
    }
  }

  /**
   * Arrastar e soltar.
   */
  public async drag(startX: number, startY: number, endX: number, endY: number): Promise<boolean> {
    try {
      await mouse.setPosition(new Point(startX, startY));
      await mouse.pressButton(Button.LEFT);
      await mouse.move(straightTo(new Point(endX, endY)));
      await mouse.releaseButton(Button.LEFT);
      return true;
    } catch (error) {
      logger.error('MouseController', `Erro ao arrastar de (${startX}, ${startY}) para (${endX}, ${endY}):`, error);
      return false;
    }
  }

  /**
   * Scroll.
   */
  public async scroll(amount: number): Promise<boolean> {
    try {
      if (amount < 0) await mouse.scrollDown(Math.abs(amount));
      else await mouse.scrollUp(amount);
      return true;
    } catch (error) {
      logger.error('MouseController', `Erro ao realizar scroll:`, error);
      return false;
    }
  }
}

export default MouseController.getInstance();
