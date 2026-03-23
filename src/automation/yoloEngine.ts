import logger from '../core/logger';
import { templateMatcher } from './templateMatcher';
import * as path from 'path';
import * as fs from 'fs';

// Future integration: npm install onnxruntime-node
// import * as ort from 'onnxruntime-node';

export interface YoloBox {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class YoloEngine {
  private static instance: YoloEngine;
  private modelPath: string;
  private isModelLoaded: boolean = false;

  private constructor() {
    this.modelPath = path.join(process.cwd(), 'assets', 'models', 'ui_elements.onnx');
  }

  public static getInstance(): YoloEngine {
    if (!YoloEngine.instance) {
      YoloEngine.instance = new YoloEngine();
    }
    return YoloEngine.instance;
  }

  /**
   * Detects UI elements using YOLO.
   * Fallback to Template Matching if YOLO model is not yet provisioned.
   */
  public async detect(targetClass: string): Promise<YoloBox | null> {
    logger.info('YoloEngine', `Searching for UI element class: ${targetClass}`);

    if (this.isModelLoaded) {
       // Real YOLO inference logic would go here
       // const result = await this.runInference(targetClass);
       // if (result) return result;
    }

    // Fallback: Use Template Matching as a proxy for YOLO detection
    // Many UI elements can be found via templates effectively.
    const templateName = `yolo_${targetClass}.png`;
    const match = await templateMatcher.findTemplate(templateName, 0.75);
    
    if (match) {
      logger.info('YoloEngine', `✅ YOLO Class "${targetClass}" found via template fallback.`);
      return {
        label: targetClass,
        confidence: match.confidence,
        x: match.x,
        y: match.y,
        width: match.width,
        height: match.height
      };
    }

    logger.warn('YoloEngine', `❌ Element class "${targetClass}" not detected.`);
    return null;
  }

  /**
   * Specifically finds Play/Search icons which are common in Spotify/Browser.
   */
  public async findIcon(iconName: 'play' | 'search' | 'pause' | 'skip'): Promise<YoloBox | null> {
    return await this.detect(iconName);
  }
}

export const yoloEngine = YoloEngine.getInstance();
