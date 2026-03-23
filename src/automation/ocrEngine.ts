import { createWorker } from 'tesseract.js';
import logger from '../core/logger';

export interface OcrResult {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export class OcrEngine {
  private static instance: OcrEngine;

  private constructor() {}

  public static getInstance(): OcrEngine {
    if (!OcrEngine.instance) {
      OcrEngine.instance = new OcrEngine();
    }
    return OcrEngine.instance;
  }

  /**
   * Performs OCR on an image buffer.
   */
  public async recognize(imageBuffer: Buffer, language: string = 'por+eng'): Promise<OcrResult[]> {
    const worker = await createWorker(language);
    try {
      const { data } = await worker.recognize(imageBuffer);
      const words = (data as any).words;
      
      const results: OcrResult[] = words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        }
      }));

      logger.info('OcrEngine', `OCR recognized ${results.length} words.`);
      return results;
    } catch (err) {
      logger.error('OcrEngine', 'Error during OCR recognition', err);
      return [];
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Finds the coordinates of a specific text on the screen.
   */
  public findText(results: OcrResult[], targetText: string, minConfidence: number = 60): OcrResult | null {
    const target = targetText.toLowerCase();
    // Try exact match first
    let found = results.find(r => r.text.toLowerCase() === target && r.confidence >= minConfidence);
    
    // Fallback to partial match if not found
    if (!found) {
      found = results.find(r => r.text.toLowerCase().includes(target) && r.confidence >= minConfidence);
    }

    return found || null;
  }
}

export const ocrEngine = OcrEngine.getInstance();
