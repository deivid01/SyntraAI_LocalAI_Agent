import { EventEmitter } from 'events';
import { config } from '../../core/config';
import logger from '../../core/logger';

interface AudioChunk {
  chunk: Buffer;
  amplitude: number;
}

export class ClapDetector extends EventEmitter {
  private lastClapTime = 0;
  private readonly cooldownMs: number;
  private readonly threshold: number;
  private previousAmplitude = 0;
  private quietFramesCount = 0;
  private readonly minQuietFramesBetweenClaps = 3;

  constructor() {
    super();
    this.cooldownMs = config.clapCooldownMs;
    this.threshold = config.clapThreshold;
  }

  processChunk(data: AudioChunk): void {
    const { amplitude } = data;
    const now = Date.now();

    // A clap is a sudden high-amplitude spike after relative quiet
    const wasQuiet = this.previousAmplitude < this.threshold * 0.3;
    const isLoud = amplitude >= this.threshold;

    if (wasQuiet && isLoud && this.quietFramesCount >= this.minQuietFramesBetweenClaps) {
      if (now - this.lastClapTime >= this.cooldownMs) {
        this.lastClapTime = now;
        this.quietFramesCount = 0;
        logger.info('ClapDetector', `Palma detectada! amplitude=${amplitude.toFixed(3)}`);
        this.emit('clap-detected', { amplitude, timestamp: now });
      }
    }

    if (amplitude < this.threshold * 0.2) {
      this.quietFramesCount++;
    } else {
      this.quietFramesCount = 0;
    }

    this.previousAmplitude = amplitude;
  }

  reset(): void {
    this.previousAmplitude = 0;
    this.quietFramesCount = 0;
    this.lastClapTime = 0;
  }
}

export default new ClapDetector();
