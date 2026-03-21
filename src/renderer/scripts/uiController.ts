/**
 * uiController.ts — Orchestrates all HUD components and IPC events
 * This is the main renderer entry point
 */

declare const HudCircle: new (canvas: HTMLCanvasElement) => {
  setState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void;
  setAmplitude(value: number): void;
};

declare const StatusIndicator: new () => {
  setState(state: string): void;
  setStatusText(text: string): void;
};

declare const TypingText: new (id: string) => {
  type(text: string, speedMs?: number): Promise<void>;
  setText(text: string): void;
  clear(): void;
};

declare const AudioCapture: {
  startRecording(): Promise<void>;
  stopRecording(): void;
  isCurrentlyRecording(): boolean;
  setupAudioCaptureIPC(): void;
};

// ---- Init components ----
const canvas = document.getElementById('hud-canvas') as HTMLCanvasElement;
const hud = new HudCircle(canvas);
const statusIndicator = new StatusIndicator();
const transcriptTyper = new TypingText('transcript-text');
const responseTyper = new TypingText('response-text');

// ---- Log panel ----
const logEntries = document.getElementById('log-entries')!;
const MAX_LOG_ENTRIES = 100;

function addLog(level: string, message: string, context?: string): void {
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ctx = context ? `[${context}] ` : '';
  entry.textContent = `${time} ${ctx}${message}`;
  logEntries.appendChild(entry);

  // Limit entries
  while (logEntries.children.length > MAX_LOG_ENTRIES) {
    logEntries.removeChild(logEntries.firstChild!);
  }

  logEntries.scrollTop = logEntries.scrollHeight;
}

// ---- State management ----
let currentState: 'idle' | 'listening' | 'processing' | 'speaking' = 'idle';
const recentCommandsList = document.getElementById('recent-commands')!;
const amplitudeValueEl = document.getElementById('info-amplitude')!;
const amplitudeBarEl = document.getElementById('amplitude-bar')!;

function setState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void {
  currentState = state;
  hud.setState(state);
  statusIndicator.setState(state);

  // Flash activation effect
  if (state === 'listening') {
    document.getElementById('hud-center')?.classList.add('activation-flash');
    setTimeout(() => document.getElementById('hud-center')?.classList.remove('activation-flash'), 400);
  }
}

function addRecentCommand(text: string): void {
  const li = document.createElement('li');
  li.textContent = text.substring(0, 25) + (text.length > 25 ? '...' : '');
  recentCommandsList.insertBefore(li, recentCommandsList.firstChild);
  if (recentCommandsList.children.length > 5) {
    recentCommandsList.removeChild(recentCommandsList.lastChild!);
  }
}

// ---- Web Speech TTS fallback ----
function speakWeb(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 0.9;

    // Try to find a Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  }
}

// ---- IPC event listeners ----
function setupIpcListeners(): void {
  if (!window.jarvis) {
    console.error('[UIController] window.jarvis not available');
    addLog('error', 'IPC bridge não disponível — rodando fora do Electron?');
    return;
  }

  window.jarvis.onStatus((s: string) => {
    setState(s as 'idle' | 'listening' | 'processing' | 'speaking');
  });

  window.jarvis.onStatusText((text: string) => {
    statusIndicator.setStatusText(text);
  });

  window.jarvis.onTranscript((text: string) => {
    transcriptTyper.setText(text);
    addRecentCommand(text);
    addLog('info', `Você: "${text}"`, 'STT');
  });

  window.jarvis.onResponse((text: string) => {
    responseTyper.type(text, 20).catch(() => { /* ignore */ });
    addLog('info', `Jarvis: "${text}"`, 'LLM');
  });

  window.jarvis.onAmplitude((value: number) => {
    hud.setAmplitude(value);
    const pct = Math.min(100, value * 200);
    amplitudeValueEl.textContent = value.toFixed(3);
    amplitudeBarEl.style.width = `${pct}%`;
  });

  window.jarvis.onLog((entry: { level: string; message: string; context?: string }) => {
    addLog(entry.level, entry.message, entry.context);
  });

  window.jarvis.onDependencyStatus((depStatus: { ollama: boolean; whisper: boolean }) => {
    const ollamaEl = document.getElementById('dep-ollama');
    const whisperEl = document.getElementById('dep-whisper');
    if (ollamaEl) {
      ollamaEl.className = `dep-badge ${depStatus.ollama ? 'online' : 'offline'}`;
    }
    if (whisperEl) {
      whisperEl.className = `dep-badge ${depStatus.whisper ? 'online' : 'offline'}`;
    }

    if (!depStatus.ollama) addLog('warn', 'Ollama offline. Execute: ollama serve');
    if (!depStatus.whisper) addLog('warn', 'Whisper não encontrado. Execute: pip install openai-whisper');
  });

  window.jarvis.onTtsSpeak((text: string) => {
    speakWeb(text);
  });
}

// ---- UI controls ----
function setupControls(): void {
  // Text input
  const textInput = document.getElementById('text-input') as HTMLInputElement;
  const btnSend = document.getElementById('btn-send');

  const sendText = () => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    if (window.jarvis) window.jarvis.sendText(text);
  };

  btnSend?.addEventListener('click', sendText);
  textInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') sendText();
  });

  // Clear history
  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    logEntries.innerHTML = '';
    if (window.jarvis) window.jarvis.clearHistory();
    addLog('info', 'Histórico limpo.');
  });

  // Window controls
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.jarvis?.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.jarvis?.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.jarvis?.close());
}

// ---- Bootstrap ----
function init(): void {
  addLog('info', '◈ JarvisAI inicializando...', 'System');
  setState('idle');
  setupControls();
  setupIpcListeners();

  // Initialize audio capture IPC
  if (typeof AudioCapture !== 'undefined') {
    AudioCapture.setupAudioCaptureIPC();
    addLog('info', 'AudioCapture IPC configurado.', 'Audio');
  }

  addLog('info', 'Interface HUD carregada.', 'System');

  // Load voices for speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
