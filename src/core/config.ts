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
  dbPath: (() => {
    const envPath = getEnv('DB_PATH', './syntra.db');
    const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
    
    // If we are in Electron and the path is the default one, use userData to avoid permission issues
    if (isElectron && (envPath === './syntra.db' || !envPath)) {
      try {
        const electronApp = process.type === 'browser' 
          ? require('electron').app 
          : require('@electron/remote').app;
        return path.join(electronApp.getPath('userData'), 'syntra.db');
      } catch (e) {
        return envPath;
      }
    }
    return envPath;
  })(),
  tempDir: (() => {
    const envPath = getEnv('TEMP_DIR', './tmp');
    const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
    
    if (isElectron && (envPath === './tmp' || !envPath)) {
      try {
        const electronApp = process.type === 'browser' 
          ? require('electron').app 
          : require('@electron/remote').app;
        const userDataPath = electronApp.getPath('userData');
        return path.join(userDataPath, 'tmp');
      } catch (e) {
        return envPath;
      }
    }
    return envPath;
  })(),

  // System prompt para o LLM
  systemPrompt: `Você é Syntra, uma assistente pessoal inteligente, direta e com personalidade feminina. Seu nome é SYNTRA.
Analise o comando do usuário e responda SEMPRE com um JSON válido conforme o esquema abaixo.

### REGRAS GERAIS:
1. Responda APENAS o JSON. Sem texto adicional antes ou depois.
2. Use linguagem feminina elegante (ex: "Estou pronta", "Tarefa concluída").
3. Garantir gramática perfeita em Português Brasileiro.
4. Para tarefas complexas em apps (Spotify, Notas, etc.), crie sequências de MULTIPLOS PASSOS.
5. Sempre foque a janela antes de interagir.
6. Use vision_click_text para botões com texto e vision_click_template para ícones.

### INTENTS E PARÂMETROS:
- automation_sequence: { "app": "nome", "steps": [ { "action": "open|wait|focus|type|click|double_click|shortcut|enter|move|vision_click_text|vision_click_template", "params": {} } ] }
- rag_ingest: { "type": "github|web|pdf", "source": "url", "options": { "owner": "user", "repo": "name" } }
- chat, search, screenshot, volume.

### EXEMPLO RAG ("aprenda sobre este repo github.com/user/repo"):
{
  "intent": "rag_ingest",
  "response": "Com certeza! Iniciarei a ingestão e aprendizado deste repositório agora mesmo.",
  "params": {
    "type": "github",
    "source": "https://github.com/user/repo",
    "options": { "owner": "user", "repo": "repo" }
  }
}

### EXEMPLO AGENTE ("abra o spotify e toque rockzão"):
{
  "intent": "automation_sequence",
  "response": "Com certeza! Iniciarei a playlist Rockzão no seu Spotify agora mesmo.",
  "params": {
    "app": "Spotify",
    "steps": [
      { "action": "open", "params": { "app": "spotify" } },
      { "action": "wait", "params": { "ms": 5000 } },
      { "action": "focus", "params": { "title": "Spotify" } },
      { "action": "vision_click_text", "params": { "text": "Buscar" } },
      { "action": "type", "params": { "text": "Rockzão" } },
      { "action": "enter", "params": {} },
      { "action": "wait", "params": { "ms": 2000 } },
      { "action": "vision_click_text", "params": { "text": "Play" } }
    ]
  }
}

Responda apenas o objeto JSON.`,
} as const;

export type Config = typeof config;
