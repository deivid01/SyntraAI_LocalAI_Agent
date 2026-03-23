import { screen, imageResource, Region } from '@nut-tree-fork/nut-js';
import * as path from 'path';
import logger from '../core/logger';
import { config } from '../core/config';

export interface MatchResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export class TemplateMatcher {
  private static instance: TemplateMatcher;
  private templateDir: string;

  private constructor() {
    this.templateDir = path.join(process.cwd(), 'assets', 'templates');
  }

  public static getInstance(): TemplateMatcher {
    if (!TemplateMatcher.instance) {
      TemplateMatcher.instance = new TemplateMatcher();
    }
    return TemplateMatcher.instance;
  }

  /**
   * Finds an image template on the screen.
   */
  public async findTemplate(templateName: string, confidence: number = 0.8): Promise<MatchResult | null> {
    const templatePath = path.join(this.templateDir, templateName);
    try {
      logger.info('TemplateMatcher', `Searching for template: ${templateName}`);
      const resource = await imageResource(templatePath);
      const region = await screen.find(resource, { confidence });
      
      logger.info('TemplateMatcher', `✅ Template ${templateName} found at ${region.left}, ${region.top}`);
      return {
        x: region.left,
        y: region.top,
        width: region.width,
        height: region.height,
        confidence
      };
    } catch (err) {
      logger.warn('TemplateMatcher', `❌ Template ${templateName} not found or error occurred.`, err);
      return null;
    }
  }

  /**
   * Waits for a template to appear on the screen.
   */
  public async waitForTemplate(templateName: string, timeoutMs: number = 10000): Promise<MatchResult | null> {
     const start = Date.now();
     while (Date.now() - start < timeoutMs) {
       const result = await this.findTemplate(templateName);
       if (result) return result;
       await new Promise(r => setTimeout(r, 1000));
     }
     return null;
  }
}

export const templateMatcher = TemplateMatcher.getInstance();
