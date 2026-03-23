import { learningService, LearnedAction } from './learningService';
import { verificationService } from './verificationService';
import { visionEngine } from './visionEngine';
import { fallbackHandler } from './fallbackHandler';
import sequenceRunner, { AutomationStep } from './sequenceRunner';
import logger from '../core/logger';

export class AutomationAgent {
  private static instance: AutomationAgent;

  private constructor() {}

  public static getInstance(): AutomationAgent {
    if (!AutomationAgent.instance) {
      AutomationAgent.instance = new AutomationAgent();
    }
    return AutomationAgent.instance;
  }

  /**
   * Executes a high-level intent by breaking it down into verified steps.
   */
  public async executeAdaptive(steps: AutomationStep[], appName: string, intentName: string): Promise<boolean> {
    logger.info('AutomationAgent', `Starting adaptive execution for ${appName} - ${intentName}`);

    // 1. Check if we have a "best known method" in the learning DB
    const bestAction = await learningService.getBestMethod(appName, intentName);
    
    if (bestAction) {
       logger.info('AutomationAgent', `Found best known method: ${bestAction.method}`);
       // We could try to prioritize this method in the sequence runner
    }

    // 2. Execute steps one by one with verification
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let success = false;
      let retries = 0;

      while (!success && retries < 2) {
        try {
          logger.info('AutomationAgent', `Executing step ${i + 1}/${steps.length}: ${step.action} (Attempt ${retries + 1})`);
          
          const result = await sequenceRunner.execute([step], appName);
          
          if (result.success) {
            // 3. Verify the step
            success = await this.verifyStep(step, appName);
          }

          if (!success) {
            retries++;
            logger.warn('AutomationAgent', `Step ${i + 1} failed verification. Retrying or switching strategy...`);
            // Attempt strategy switch if vision fails
            if (step.action.startsWith('vision_')) {
               // Logic to swap vision text for template or shortcut
               success = await fallbackHandler.executeFallbacks(`${appName} ${intentName} step ${i+1}`);
            }
          }
        } catch (err) {
          logger.error('AutomationAgent', `Error in step ${i + 1}`, err);
          retries++;
        }
      }

      if (!success) {
        logger.error('AutomationAgent', `Critical failure in step ${i + 1}. Aborting sequence.`);
        await learningService.recordAction({
            app: appName,
            intent: intentName,
            method: 'ocr', // Placeholder for current method
            params: JSON.stringify(step.params),
            success_count: 0,
            fail_count: 1,
            last_used: Date.now()
        }, false);
        return false;
      }

      // Record success
      await learningService.recordAction({
          app: appName,
          intent: intentName,
          method: 'ocr', // Placeholder
          params: JSON.stringify(step.params),
          success_count: 1,
          fail_count: 0,
          last_used: Date.now()
      }, true);
    }

    return true;
  }

  private async verifyStep(step: AutomationStep, appName: string): Promise<boolean> {
    switch (step.action) {
      case 'open':
        return await verificationService.verifyWindowFocused(step.params.app || appName);
      case 'vision_click_text':
        // Wait a bit and check if a visual change occurred or if the target is gone
        await new Promise(r => setTimeout(r, 1000));
        return true; // Simplified for now
      default:
        return true; 
    }
  }
}

export const automationAgent = AutomationAgent.getInstance();
