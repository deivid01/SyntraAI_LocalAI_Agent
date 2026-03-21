import axios from 'axios';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../utils/config';
import logger from '../utils/logger';

// IPC sender for renderer fallback
let ipcSender: ((channel: string, ...args: unknown[]) => void) | null = null;

export function setTTSIpcSender(sender: (channel: string, ...args: unknown[]) => void): void {
  ipcSender = sender;
}

async function speakViaCoqui(text: string): Promise<void> {
  // Try Coqui TTS HTTP API (tts-server running on port 5002)
  const url = `${config.ttsUrl}/api/tts`;
  const response = await axios.get(url, {
    params: { text },
    responseType: 'arraybuffer',
    timeout: 15000,
  });

  // Save wav to temp and play with powershell
  const tmpFile = path.join(os.tmpdir(), `jarvis_tts_${Date.now()}.wav`);
  fs.writeFileSync(tmpFile, Buffer.from(response.data as ArrayBuffer));

  await new Promise<void>((resolve, reject) => {
    const cmd = `powershell -c "(New-Object Media.SoundPlayer '${tmpFile}').PlaySync();"`;
    exec(cmd, (err) => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      if (err) reject(err); else resolve();
    });
  });
}

function speakViaWebSpeech(text: string): void {
  // Fallback: send to renderer to use speechSynthesis
  if (ipcSender) {
    ipcSender('tts-speak-web', text);
    logger.info('TTS', 'Usando speechSynthesis (fallback)');
  } else {
    logger.warn('TTS', 'Sem IPC sender disponível para TTS fallback.');
  }
}

async function speakViaWinSAPI(text: string): Promise<void> {
  // Windows built-in SAPI via PowerShell — works offline
  const escaped = text.replace(/'/g, "''");
  const cmd = `powershell -c "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${escaped}')"`;
  await new Promise<void>((resolve, reject) => {
    exec(cmd, (err) => { if (err) reject(err); else resolve(); });
  });
}

export async function speak(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  logger.info('TTS', `Falando: "${text.substring(0, 60)}..."`);

  // Try Coqui TTS first
  if (config.ttsEnabled) {
    try {
      await speakViaCoqui(text);
      return;
    } catch {
      logger.warn('TTS', 'Coqui TTS indisponível, tentando Windows SAPI...');
    }
  }

  // Try Windows SAPI
  try {
    await speakViaWinSAPI(text);
    return;
  } catch {
    logger.warn('TTS', 'Windows SAPI falhou, usando speechSynthesis no renderer...');
  }

  // Final fallback: Web Speech API via renderer
  speakViaWebSpeech(text);
}
