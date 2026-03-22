import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const num = parseFloat(val);
  return isNaN(num) ? defaultValue : num;
}

export const config = {
  // Ollama
  ollamaUrl: getEnv('OLLAMA_URL', 'http://127.0.0.1:11434'),
  ollamaModel: getEnv('OLLAMA_MODEL', 'phi3'),
  ollamaFallbackModel: getEnv('OLLAMA_FALLBACK_MODEL', 'llama3'),

  // Whisper
  whisperModel: getEnv('WHISPER_MODEL', 'base'),
  whisperFallbackModel: getEnv('WHISPER_FALLBACK_MODEL', 'tiny'),
  whisperLanguage: getEnv('WHISPER_LANGUAGE', 'pt'),

  // TTS
  ttsUrl: getEnv('TTS_URL', 'http://localhost:5002'),
  ttsEnabled: getEnvBool('TTS_ENABLED', false), // Disabled by default, using Windows SAPI/Web Speech instead

  // Audio
  hotword: getEnv('HOTWORD', 'syntra'),
  clapThreshold: getEnvNumber('CLAP_THRESHOLD', 0.75),
  clapCooldownMs: getEnvNumber('CLAP_COOLDOWN_MS', 2000),
  silenceThreshold: getEnvNumber('SILENCE_THRESHOLD', 0.01),
  silenceDurationMs: getEnvNumber('SILENCE_DURATION_MS', 1500),
  recordingSampleRate: getEnvNumber('RECORDING_SAMPLE_RATE', 16000),

  // App
  debugMode: getEnvBool('DEBUG_MODE', false),
  logLevel: getEnv('LOG_LEVEL', 'info'),
  dbPath: getEnv('DB_PATH', './syntra.db'),
  tempDir: getEnv('TEMP_DIR', './tmp'),

  // System prompt para o LLM
  systemPrompt: `Você é Syntra, uma assistente pessoal inteligente e direta, com personalidade feminina. Seu nome é SYNTRA (não confunda com a cidade Sintra de Portugal). Quando o usuário disser "Syntra", ele está falando COM VOCÊ, não sobre uma cidade.
Analise o comando do usuário e responda SEMPRE com um JSON válido no seguinte formato:
{
  "intent": "string (open_app|close_app|run_command|shutdown|restart|chat|search|timer|reminder)",
  "response": "string (resposta para falar, opcional)",
  "params": {}
}

Exemplos:
- "Abra o Chrome" → {"intent":"open_app","response":"Abrindo o Chrome, senhor.","params":{"app":"chrome"}}
- "Desligar o computador" → {"intent":"shutdown","response":"Desligando o sistema.","params":{}}
- "Oi Syntra" → {"intent":"chat","response":"Olá! Estou pronta para ajudar. O que precisa?","params":{}}
- "Boa noite Syntra" → {"intent":"chat","response":"Boa noite! Em que posso ajudar?","params":{}}
- "Execute ipconfig" → {"intent":"run_command","response":"Executando o comando.","params":{"cmd":"ipconfig"}}

Seja concisa, precisa e sempre em português brasileiro. Nunca inclua markdown no JSON. Use linguagem feminina (pronta, feita, etc).`,
} as const;

export type Config = typeof config;
