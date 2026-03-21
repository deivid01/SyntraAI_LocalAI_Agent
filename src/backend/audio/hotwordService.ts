import { EventEmitter } from 'events';
import { config } from '../utils/config';
import logger from '../utils/logger';



interface AudioChunk {
  chunk: Buffer;
  amplitude: number;
}

export class HotwordService extends EventEmitter {
  private readonly hotword: string;
  private readonly energyThreshold = 0.02; // Minimum energy to process
  private readonly highEnergyThreshold = 0.15; // Energy burst threshold
  private recentAmplitudes: number[] = [];
  private readonly windowSize = 10;
  private lastDetectionTime = 0;
  private readonly cooldownMs = 3000;
  private framesSinceHighEnergy = 0;
  private highEnergyCount = 0;

  constructor() {
    super();
    this.hotword = config.hotword.toLowerCase();
  }

  processChunk(data: AudioChunk): void {
    const { amplitude } = data;

    // Maintain sliding window
    this.recentAmplitudes.push(amplitude);
    if (this.recentAmplitudes.length > this.windowSize) {
      this.recentAmplitudes.shift();
    }

    const avgAmplitude = this.recentAmplitudes.reduce((a, b) => a + b, 0) / this.recentAmplitudes.length;

    // Track energy bursts that match hotword energy pattern
    if (amplitude > this.highEnergyThreshold) {
      this.highEnergyCount++;
      this.framesSinceHighEnergy = 0;
    } else {
      this.framesSinceHighEnergy++;
    }

    // Reset high energy count after quiet period
    if (this.framesSinceHighEnergy > 20) {
      if (this.highEnergyCount >= 3 && this.highEnergyCount <= 15) {
        // Energy pattern consistent with a short word being spoken
        this.checkHotwordPattern(avgAmplitude);
      }
      this.highEnergyCount = 0;
      this.framesSinceHighEnergy = 0;
    }
  }

  private checkHotwordPattern(avgAmplitude: number): void {
    const now = Date.now();
    if (now - this.lastDetectionTime < this.cooldownMs) return;
    if (avgAmplitude < this.energyThreshold) return;

    // Energy burst pattern suggests a short command word was spoken
    // This is a lightweight heuristic — in production use Porcupine/Vosk
    logger.debug('Hotword', `Padrão de energia detectado (avg=${avgAmplitude.toFixed(3)}). Ativando escuta...`);

    this.lastDetectionTime = now;
    this.emit('hotword-detected', { confidence: avgAmplitude, hotword: this.hotword });
    logger.info('Hotword', `Hotword "${this.hotword}" detectada (heurística de energia)`);
  }

  reset(): void {
    this.recentAmplitudes = [];
    this.highEnergyCount = 0;
    this.framesSinceHighEnergy = 0;
    this.lastDetectionTime = 0;
  }
}

export default new HotwordService();
