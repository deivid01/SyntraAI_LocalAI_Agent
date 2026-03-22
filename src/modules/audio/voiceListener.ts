import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import logger from '../../core/logger';

export type VoiceListenerEvent = 'recording-start' | 'recording-complete' | 'error';

/**
 * VoiceListener — Receives recorded audio blobs from the Renderer process
 * (MediaRecorder API) and saves them as files for Whisper to process.
 *
 * No longer uses sox, node-record-lpcm16, or ScriptProcessorNode.
 * Audio flows: Renderer MediaRecorder → IPC → this module → file → Whisper
 */
export class VoiceListener extends EventEmitter {
  private isRecording = false;
  private outDir: string;
  private outPath: string;

  constructor() {
    super();
    // Use OS temp directory (always exists) instead of relative ./tmp
    this.outDir = path.join(os.tmpdir(), 'syntra-audio');
    this.outPath = path.join(this.outDir, `recording_${Date.now()}.webm`);

    // Ensure output directory exists
    try {
      if (!fs.existsSync(this.outDir)) {
        fs.mkdirSync(this.outDir, { recursive: true });
      }
    } catch (err) {
      logger.error('Voice', 'Failed to create audio temp directory', err);
    }
  }

  /** Called when the main process wants to start recording */
  start(): void {
    logger.info('Voice', 'VoiceListener pronto (MediaRecorder mode)');
  }

  stop(): void {
    this.isRecording = false;
  }

  startRecording(): void {
    if (this.isRecording) return;
    this.isRecording = true;
    this.emit('recording-start');
    logger.info('Voice', 'Gravação iniciada (MediaRecorder)');
  }

  /**
   * Called by main.ts when the renderer sends a completed audio blob.
   * The data is a Uint8Array of a webm/opus file.
   */
  receiveRecordedAudio(data: Buffer): void {
    this.isRecording = false;

    if (data.length < 100) {
      logger.warn('Voice', 'Gravação muito curta, ignorando.');
      return;
    }

    // Generate unique filename each time to avoid file lock issues
    this.outPath = path.join(this.outDir, `recording_${Date.now()}.webm`);

    try {
      // Ensure directory still exists
      if (!fs.existsSync(this.outDir)) {
        fs.mkdirSync(this.outDir, { recursive: true });
      }

      fs.writeFileSync(this.outPath, data);
      logger.info('Voice', `Gravação salva: ${this.outPath} (${data.length} bytes)`);
      this.emit('recording-complete', this.outPath);
    } catch (err) {
      logger.error('Voice', `Erro ao salvar gravação em ${this.outPath}`, err);
      this.emit('error', err);
    }
  }
}

export default new VoiceListener();
