import { visionEngine } from './visionEngine';
import { fallbackHandler } from './fallbackHandler';
import logger from '../core/logger';
import windowManager from './windowManager';
import mouseController from './mouseController';
import keyboardController from './keyboardController';
import { Key } from '@nut-tree-fork/nut-js';

export interface AutomationStep {
  action: 'open' | 'wait' | 'focus' | 'type' | 'click' | 'double_click' | 'shortcut' | 'enter' | 'move' | 'vision_click_text' | 'vision_click_template';
  params: Record<string, any>;
}

export class SequenceRunner {
  private static instance: SequenceRunner;

  private constructor() {}

  public static getInstance(): SequenceRunner {
    if (!SequenceRunner.instance) {
      SequenceRunner.instance = new SequenceRunner();
    }
    return SequenceRunner.instance;
  }

  public async execute(steps: AutomationStep[], context: string = 'generic'): Promise<{ success: boolean; error?: string }> {
    logger.info('SequenceRunner', `Iniciando sequência de ${steps.length} passos.`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      logger.info('SequenceRunner', `Executando passo ${i + 1}: ${step.action}`);

      try {
        switch (step.action) {
          case 'open':
            // A abertura de app ainda é tratada pelo osController principal por enquanto
            // ou podemos implementar aqui se necessário.
            break;

          case 'wait':
            const ms = step.params.ms || 1000;
            await new Promise(resolve => setTimeout(resolve, ms));
            break;

          case 'focus':
            const title = step.params.title;
            if (title) {
              const focused = await windowManager.waitForWindow(title, step.params.timeout || 10000);
              if (!focused) throw new Error(`Não foi possível focar na janela: ${title}`);
            }
            break;

          case 'type':
            const text = step.params.text;
            if (text) {
              await keyboardController.typeText(text);
            }
            break;

          case 'click':
            await mouseController.click(step.params.button || 'left');
            break;

          case 'double_click':
            await mouseController.doubleClick();
            break;

          case 'enter':
            await keyboardController.pressEnter();
            break;

          case 'shortcut':
            const mod = step.params.modifier as keyof typeof Key;
            const key = step.params.key as keyof typeof Key;
            if (mod && key) {
              await keyboardController.shortcut(Key[mod], Key[key]);
            }
            break;

          case 'move':
            await mouseController.move(step.params.x, step.params.y);
            break;

          case 'vision_click_text': {
            const text = step.params.text;
            const success = await visionEngine.findAndClick({ text, confidence: step.params.confidence });
            if (!success) {
              const fallbackSuccess = await fallbackHandler.executeFallbacks(`${context} search for text: ${text}`);
              if (!fallbackSuccess) throw new Error(`Vision and Fallback failed for text: ${text}`);
            }
            break;
          }

          case 'vision_click_template': {
            const template = step.params.template;
            const success = await visionEngine.findAndClick({ template, confidence: step.params.confidence });
            if (!success) {
              const fallbackSuccess = await fallbackHandler.executeFallbacks(`${context} search for template: ${template}`);
              if (!fallbackSuccess) throw new Error(`Vision and Fallback failed for template: ${template}`);
            }
            break;
          }

          default:
            logger.warn('SequenceRunner', `Ação desconhecida: ${step.action}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('SequenceRunner', `Falha no passo ${i + 1} (${step.action}): ${msg}`);
        return { success: false, error: msg };
      }
    }

    return { success: true };
  }
}

export default SequenceRunner.getInstance();
