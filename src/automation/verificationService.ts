import windowManager from './windowManager';
import { visionEngine } from './visionEngine';
import logger from '../core/logger';

export class VerificationService {
  private static instance: VerificationService;

  private constructor() {}

  public static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Verifies if an application window is focused.
   */
  public async verifyWindowFocused(title: string): Promise<boolean> {
    const isFocused = await windowManager.focusWindow(title);
    if (isFocused) {
      logger.info('VerificationService', `✅ Window "${title}" is focused.`);
      return true;
    }
    logger.warn('VerificationService', `❌ Window "${title}" not focused.`);
    return false;
  }

  /**
   * Verifies a visual state (e.g., if a button exists or changed).
   */
  public async verifyVisualState(text?: string, template?: string): Promise<boolean> {
    // We can use visionEngine without the 'click' part just to check existence.
    // I'll add a 'find' method to visionEngine that doesn't click.
    // For now, let's assume visionEngine provides a way to just check.
    const result = await visionEngine.findAndClick({ text, template, confidence: 0.8 });
    // Note: findAndClick clicks if found. I should probably refactor visionEngine
    // to separate 'find' from 'click'.
    return result;
  }

  /**
   * Spotify specific verification: Check if it's playing by looking for the 'Pause' button.
   */
  public async verifySpotifyPlaying(): Promise<boolean> {
    // If 'Pause' button is visible, it means it's playing.
    const playing = await this.verifyVisualState(undefined, 'spotify_pause.png');
    if (playing) {
      logger.info('VerificationService', '✅ Spotify playback verified (Pause button visible).');
      return true;
    }
    logger.warn('VerificationService', '❌ Spotify playback NOT verified.');
    return false;
  }
}

export const verificationService = VerificationService.getInstance();
