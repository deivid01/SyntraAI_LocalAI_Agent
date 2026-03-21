import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../utils/config';
import logger from '../utils/logger';

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const model = config.whisperModel;
    logger.info('Whisper', `Transcrevendo com modelo "${model}": ${audioFilePath}`);

    const run = (modelName: string) => {
      const outputDir = os.tmpdir();
      const args = [
        '-m', 'whisper',
        audioFilePath,
        '--model', modelName,
        '--language', config.whisperLanguage,
        '--output_format', 'txt',
        '--output_dir', outputDir,
        '--fp16', 'False', // CPU-only, avoids GPU requirement
      ];

      const proc = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          logger.error('Whisper', `Whisper saiu com código ${code}`, stderr);

          // Fallback to smaller model
          if (modelName !== config.whisperFallbackModel) {
            logger.warn('Whisper', `Tentando fallback com modelo "${config.whisperFallbackModel}"...`);
            run(config.whisperFallbackModel);
          } else {
            reject(new Error(`Whisper falhou: ${stderr}`));
          }
          return;
        }

        // Read generated .txt file
        const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
        const txtPath = path.join(os.tmpdir(), `${baseName}.txt`);

        try {
          const text = fs.readFileSync(txtPath, 'utf-8').trim();
          fs.unlinkSync(txtPath);
          logger.info('Whisper', `Transcrição: "${text}"`);
          resolve(text);
        } catch (readErr) {
          reject(readErr);
        }
      });
    };

    run(model);
  });
}

export async function checkWhisperAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-c', 'import whisper; print("ok")'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
  });
}
