import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

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
  private outPath: string = '';

  constructor() {
    super();
    this.outPath = path.join(path.resolve(process.env['TEMP_DIR'] ?? './tmp'), 'recording.webm');
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

    try {
      fs.writeFileSync(this.outPath, data);
      logger.info('Voice', `Gravação salva: ${this.outPath} (${data.length} bytes)`);
      this.emit('recording-complete', this.outPath);
    } catch (err) {
      logger.error('Voice', 'Erro ao salvar gravação', err);
      this.emit('error', err);
    }
  }
}

export default new VoiceListener();
