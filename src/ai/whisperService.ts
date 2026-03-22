import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../core/config';
import logger from '../core/logger';

export class WhisperService {
  private static instance: WhisperService;

  private constructor() {}

  public static getInstance(): WhisperService {
    if (!WhisperService.instance) {
      WhisperService.instance = new WhisperService();
    }
    return WhisperService.instance;
  }

  public async transcribe(audioFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const model = config.whisperModel;
      logger.info('WhisperService', `Transcrevendo com modelo "${model}": ${audioFilePath}`);

      const run = (modelName: string) => {
        const outputDir = path.dirname(audioFilePath);
        const args = [
          '-m', 'whisper',
          audioFilePath,
          '--model', modelName,
          '--language', config.whisperLanguage,
          '--output_format', 'txt',
          '--output_dir', outputDir,
          '--fp16', 'False',
        ];

        const proc = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] });

        proc.on('error', (err) => {
          logger.error('WhisperService', `Falha ao iniciar Python: ${err.message}`);
          reject(err);
        });

        let stdoutText = '';
        proc.stdout.on('data', (d: Buffer) => { stdoutText += d.toString(); });
        let stderr = '';
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
          if (code !== 0) {
            logger.error('WhisperService', `Whisper saiu com código ${code}`, stderr);
            if (modelName !== config.whisperFallbackModel) {
              logger.warn('WhisperService', `Tentando fallback com modelo "${config.whisperFallbackModel}"...`);
              run(config.whisperFallbackModel);
            } else {
              reject(new Error(`Whisper falhou: ${stderr}`));
            }
            return;
          }

          const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
          
          try {
            const files = fs.readdirSync(outputDir);
            const txtFile = files.find(f => f.startsWith(baseName) && f.endsWith('.txt'));
            
            let text = '';
            let txtPath = '';
            if (txtFile) {
               txtPath = path.join(outputDir, txtFile);
               text = fs.readFileSync(txtPath, 'utf-8').trim();
               try { fs.unlinkSync(txtPath); } catch {}
            } else {
               logger.warn('WhisperService', `Arquivo TXT ausente. Usando stdout fallback.`);
               const lines = stdoutText.split('\n');
               for (const line of lines) {
                  const match = line.match(/\]\s+(.*)/);
                  if (match) text += match[1].trim() + ' ';
               }
               text = text.trim();
               if (!text && stdoutText.trim()) text = stdoutText.trim();
               if (!text) throw new Error('O áudio transcrito está vazio e nenhum arquivo foi gerado.');
            }
            
            logger.info('WhisperService', `Transcrição: "${text}"`);
            try { fs.unlinkSync(audioFilePath); } catch {}
            resolve(text);
          } catch (readErr) {
            const errStr = readErr instanceof Error ? readErr.message : String(readErr);
            logger.error('WhisperService', `Falha ao processar resposta do Whisper: ${errStr}`);
            reject(readErr);
          }
        });
      };

      run(model);
    });
  }

  public async checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('python', ['-c', 'import whisper; print("ok")'], { stdio: 'pipe' });
      proc.on('close', (code) => resolve(code === 0));
    });
  }
}

export const whisperService = WhisperService.getInstance();
