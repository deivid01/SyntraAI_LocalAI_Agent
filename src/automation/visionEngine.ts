import { ocrEngine } from './ocrEngine';
import { templateMatcher } from './templateMatcher';
import { yoloEngine } from './yoloEngine';
import mouseController from './mouseController';
import keyboardController from './keyboardController';
import logger from '../core/logger';
import { screen } from '@nut-tree-fork/nut-js';
import * as fs from 'fs';
import * as path from 'path';

export interface VisionFindOptions {
  text?: string;
  template?: string;
  yolo_class?: string;
  confidence?: number;
  retry?: number;
}

export class VisionEngine {
  private static instance: VisionEngine;

  private constructor() {}

  public static getInstance(): VisionEngine {
    if (!VisionEngine.instance) {
      VisionEngine.instance = new VisionEngine();
    }
    return VisionEngine.instance;
  }

  /**
   * Main entry point for hybrid element finding.
   * Priority: OCR (if text provided) -> Template Matching (if template provided) -> Fallback (shortcuts)
   */
  /**
   * Main entry point for hybrid element finding.
   * Priority: YOLO -> OCR -> Template
   */
  public async find(options: VisionFindOptions): Promise<{ x: number, y: number } | null> {
    logger.info('VisionEngine', `Searching (Finding) element: ${JSON.stringify(options)}`);

    // 1. Try YOLO for visual objects
    if (options.yolo_class) {
      const yoloResult = await yoloEngine.detect(options.yolo_class);
      if (yoloResult) return { x: yoloResult.x + yoloResult.width / 2, y: yoloResult.y + yoloResult.height / 2 };
    }

    // 2. Try OCR
    if (options.text) {
      const results = await this.captureAndRecognize();
      const found = ocrEngine.findText(results, options.text, options.confidence ? options.confidence * 100 : 70);
      if (found) {
        return {
          x: found.bbox.x0 + (found.bbox.x1 - found.bbox.x0) / 2,
          y: found.bbox.y0 + (found.bbox.y1 - found.bbox.y0) / 2
        };
      }
    }

    // 3. Try Template Matching
    if (options.template) {
      const match = await templateMatcher.findTemplate(options.template, options.confidence || 0.82);
      if (match) {
        return {
          x: match.x + match.width / 2,
          y: match.y + match.height / 2
        };
      }
    }

    return null;
  }

  public async findAndClick(options: VisionFindOptions): Promise<boolean> {
    const coords = await this.find(options);
    if (coords) {
      await mouseController.move(coords.x, coords.y);
      await mouseController.click('left');
      return true;
    }
    return false;
  }

  /**
   * Captures screen and performs OCR.
   */
  private async captureAndRecognize() {
    // Note: To get a real buffer from nut-js screen, we might need a workaround or a secondary tool.
    // For now, let's use a temporary file approach via PowerShell to take a high-quality screenshot.
    const tmpPath = path.join(process.cwd(), 'tmp', `screen_${Date.now()}.png`);
    if (!fs.existsSync(path.dirname(tmpPath))) { fs.mkdirSync(path.dirname(tmpPath), { recursive: true }); }

    try {
      // PowerShell script to take a screenshot
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('{PRTSC}')
        Start-Sleep -m 500
        $img = [System.Windows.Forms.Clipboard]::GetImage()
        if ($img) {
          $img.Save("${tmpPath}")
        }
      `;
      // Actually, let's use a simpler PowerShell way to capture screen if available.
      // Or even better, a direct Buffer capture if I can find a better way.
      // Wait, Electron's desktopCapturer could be used too.
      
      // Let's use nut-js capture for now if it works.
      const screenshot = await screen.capture('screenshot.png');
      // screen.capture saves to file, we can read it.
      const buffer = fs.readFileSync('screenshot.png');
      const results = await ocrEngine.recognize(buffer);
      
      // Cleanup
      if (fs.existsSync('screenshot.png')) fs.unlinkSync('screenshot.png');
      
      return results;
    } catch (err) {
      logger.error('VisionEngine', 'Screen capture failed', err);
      return [];
    }
  }
}

export const visionEngine = VisionEngine.getInstance();
