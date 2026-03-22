import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../core/config';
import logger from '../core/logger';

// IPC sender for renderer fallback
let ipcSender: ((channel: string, ...args: unknown[]) => void) | null = null;

export function setTTSIpcSender(sender: (channel: string, ...args: unknown[]) => void): void {
  ipcSender = sender;
}

/**
 * Edge-TTS: Uses Microsoft's neural TTS engine via Python edge-tts package.
 * Voice: pt-BR-FranciscaNeural (natural female voice, perfect for "Syntra")
 */
async function speakViaEdgeTTS(text: string): Promise<void> {
  const tmpFile = path.join(os.tmpdir(), `syntra_tts_${Date.now()}.mp3`);
  const escaped = text.replace(/"/g, '\\"');

  return new Promise<void>((resolve, reject) => {
    const args = [
      '-m', 'edge_tts',
      '--voice', 'pt-BR-FranciscaNeural',
      '--rate', '+5%',
      '--text', escaped,
      '--write-media', tmpFile,
    ];

    const proc = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 || !fs.existsSync(tmpFile)) {
        logger.warn('TTS', `Edge-TTS falhou (code=${code}): ${stderr}`);
        reject(new Error(`Edge-TTS exit code ${code}`));
        return;
      }

      // Play the audio file with PowerShell (Wait until duration is evaluated)
      const playCmd = `powershell -c "Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([Uri]'${tmpFile.replace(/\\/g, '\\\\')}'); $k=0; while (-not $player.NaturalDuration.HasTimeSpan -and $k -lt 20) { Start-Sleep -Milliseconds 100; $k++ }; $player.Play(); if ($player.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds ([int]($player.NaturalDuration.TimeSpan.TotalMilliseconds + 500)) } else { Start-Sleep -Seconds 3 }; $player.Close()"`;

      exec(playCmd, { windowsHide: true }, (err) => {
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        if (err) {
          // Fallback: try simpler playback
          const simplePlay = `powershell -c "(New-Object Media.SoundPlayer '${tmpFile}').PlaySync()"`;
          exec(simplePlay, { windowsHide: true }, () => {
            try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Windows SAPI TTS with female voice selection
 */
async function speakViaWinSAPI(text: string): Promise<void> {
  const escaped = text.replace(/'/g, "''");
  // Try to select a female voice; fall back to default
  const cmd = `powershell -c "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $voices = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Female' }; if ($voices.Count -gt 0) { $synth.SelectVoice($voices[0].VoiceInfo.Name) }; $synth.Speak('${escaped}')"`;
  await new Promise<void>((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (err) => { if (err) reject(err); else resolve(); });
  });
}

/**
 * Web Speech API fallback — sends to renderer for browser-native TTS
 */
function speakViaWebSpeech(text: string): void {
  if (ipcSender) {
    ipcSender('tts-speak-web', text);
    logger.info('TTS', 'Usando speechSynthesis (fallback)');
  } else {
    logger.warn('TTS', 'Sem IPC sender disponível para TTS fallback.');
  }
}

/**
 * Main speak function: tries Edge-TTS (Francisca Neural) → Windows SAPI (female) → Web Speech
 */
export async function speak(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  logger.info('TTS', `Falando: "${text.substring(0, 60)}..."`);

  // 1. Try Edge-TTS (natural female neural voice)
  try {
    await speakViaEdgeTTS(text);
    return;
  } catch {
    logger.warn('TTS', 'Edge-TTS indisponível, tentando Windows SAPI...');
  }

  // 2. Try Windows SAPI (female voice preference)
  try {
    await speakViaWinSAPI(text);
    return;
  } catch {
    logger.warn('TTS', 'Windows SAPI falhou, usando speechSynthesis no renderer...');
  }

  // 3. Final fallback: Web Speech API via renderer
  speakViaWebSpeech(text);
}
