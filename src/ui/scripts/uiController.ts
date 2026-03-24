/**
 * uiController.ts — Orchestrates all HUD components and IPC events
 */

declare const HudCircle: new (canvas: HTMLCanvasElement) => {
  setState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void;
  setAmplitude(value: number): void;
};

declare const StatusIndicator: new () => {
  setState(state: string): void;
  setStatusText(text: string): void;
};

declare const AudioCapture: {
  setupAudioCaptureIPC(): void;
};

// ---- Init components ----
console.log('[Syntra] UI Script starting...');

const canvas = document.getElementById('hud-canvas') as HTMLCanvasElement;
const welcomeScreen = document.getElementById('welcome-screen');
const conversationArea = document.getElementById('conversation-area')!;

let hud: any = null;
let statusIndicator: any = null;

try {
  console.log('[Syntra] Initializing components...');
  hud = new HudCircle(canvas);
  statusIndicator = new StatusIndicator();
  console.log('[Syntra] Components initialized.');
} catch (e) {
  console.error('[Syntra] Component init failed', e);
}

// Templates
const userTemplate = document.getElementById('transcript-box')!;
const aiTemplate = document.getElementById('response-box')!;

function addMessage(role: 'user' | 'ai', text: string): HTMLElement {
  // Hide welcome screen on first interaction
  if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
    welcomeScreen.classList.add('opacity-0');
    setTimeout(() => welcomeScreen.classList.add('hidden'), 700);
    console.log('[Syntra] Welcome screen hidden.');
  }

  const clone = (role === 'user' ? userTemplate : aiTemplate).cloneNode(true) as HTMLElement;
  clone.id = '';
  const textEl = clone.querySelector('p');
  if (textEl) {
    textEl.id = '';
    textEl.textContent = text;
    if (role === 'ai') textEl.classList.remove('typing');
  }
  conversationArea.appendChild(clone);
  conversationArea.scrollTop = conversationArea.scrollHeight;
  return clone;
}

// Typing effect for AI
async function typeMessage(text: string): Promise<void> {
  if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
    welcomeScreen.classList.add('opacity-0');
    setTimeout(() => welcomeScreen.classList.add('hidden'), 700);
  }

  const clone = aiTemplate.cloneNode(true) as HTMLElement;
  clone.id = '';
  const textEl = clone.querySelector('p')!;
  textEl.id = '';
  textEl.textContent = '';
  textEl.classList.add('typing');
  conversationArea.appendChild(clone);
  
  let current = '';
  for (const char of text) {
    current += char;
    textEl.textContent = current;
    await new Promise(r => setTimeout(r, 15));
    conversationArea.scrollTop = conversationArea.scrollHeight;
  }
  textEl.classList.remove('typing');
}

// ---- Log panel ----
const logEntries = document.getElementById('log-entries')!;
const MAX_LOG_ENTRIES = 100;

export function addLog(level: 'info' | 'success' | 'warn' | 'error', message: string, context?: string) {
  const container = document.getElementById('log-entries');
  if (!container) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry opacity-0 border-l-2 pl-3 py-1 transition-all duration-300 ${
    level === 'error' ? 'border-red-500 bg-red-500/5 text-red-200' :
    level === 'success' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-200' :
    level === 'warn' ? 'border-amber-500 bg-amber-500/5 text-amber-200' :
    'border-zinc-700 bg-white/5 text-zinc-400'
  }`;
  
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  entry.innerHTML = `
    <div class="flex justify-between items-start mb-0.5">
      <span class="text-[8px] font-bold opacity-40">${time}</span>
      ${context ? `<span class="text-[8px] font-black uppercase text-violet-500/50 px-1.5 py-0.5 rounded-sm bg-violet-500/5">${context}</span>` : ''}
    </div>
    <div class="text-[10px] leading-snug">${message}</div>
  `;
  
  container.prepend(entry);
  setTimeout(() => entry.classList.remove('opacity-0', 'translate-x-4'), 10);
  
  // Keep only last 50
  if (container.children.length > 50) container.lastChild?.remove();
}

// Expose to window for React to use
(window as any).addLog = addLog;

// ---- State management ----
let currentState: 'starting' | 'idle' | 'listening' | 'processing' | 'speaking' = 'idle';

function setState(state: 'starting' | 'idle' | 'listening' | 'processing' | 'speaking'): void {
  currentState = state;
  if (hud) hud.setState(state === 'starting' ? 'idle' : state);
  if (statusIndicator) statusIndicator.setState(state);
  addLog('info', `Estado alterado: ${state}`, 'System');
}

// Set initial Red state
if (statusIndicator) statusIndicator.setState('starting');

function addRecentCommand(text: string): void {
  // Function logic removed as the UI element is no longer present
  console.log('[Syntra] Activity recorded:', text);
}

// ---- Web Speech TTS fallback ----
function speakWeb(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    // Try to find a female pt-BR voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('pt') && v.name.toLowerCase().includes('femin'))
      || voices.find(v => v.lang.includes('pt-BR'))
      || voices.find(v => v.lang.includes('pt'));
    if (femaleVoice) utterance.voice = femaleVoice;
    window.speechSynthesis.speak(utterance);
    addLog('info', 'TTS Web triggered (female voice preferred)', 'Audio');
  }
}

// ---- IPC event listeners ----
function setupIpcListeners(): void {
  if (!window.syntra) {
    addLog('error', 'CRITICAL: IPC bridge (window.syntra) IS NOT AVAILABLE.');
    return;
  }

  addLog('success', 'IPC Bridge connected successfully.', 'System');

  window.syntra.onStatus((s: string) => setState(s as any));
  window.syntra.onStatusText((text: string) => statusIndicator?.setStatusText(text));

  window.syntra.onTranscript((text: string) => {
    addLog('info', `Transcrição recebida: "${text}"`, 'STT');
    addMessage('user', text);
    addRecentCommand(text);
  });

  window.syntra.onResponse((text: string) => {
    addLog('success', `Resposta recebida do LLM: "${text.substring(0, 30)}..."`, 'LLM');
    typeMessage(text).catch(() => addMessage('ai', text));
  });

  window.syntra.onAmplitude((value: number) => {
    if (hud) hud.setAmplitude(value);
  });

  window.syntra.onLog((entry: { level: string; message: string; context?: string }) => {
    addLog(entry.level as any, entry.message, entry.context);
  });

  window.syntra.onDependencyStatus((depStatus: { ollama: boolean; whisper: boolean }) => {
    addLog('info', `Deps: Ollama=${depStatus.ollama}, Whisper=${depStatus.whisper}`, 'Health');
    const ollamaEl = document.getElementById('dep-ollama');
    const whisperEl = document.getElementById('dep-whisper');
    
    const setDepStyle = (el: HTMLElement | null, online: boolean) => {
      if (!el) return;
      el.className = `text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
        online ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-red-500/30 text-red-400/70 bg-red-500/5'
      }`;
    };

    setDepStyle(ollamaEl, depStatus.ollama);
    setDepStyle(whisperEl, depStatus.whisper);
  });

  window.syntra.onTtsSpeak((text: string) => speakWeb(text));
}

// ---- UI controls ----
function setupControls(): void {
  const textInput = document.getElementById('text-input') as HTMLInputElement;
  const btnSend = document.getElementById('btn-send');
  const btnMic = document.getElementById('btn-mic');
  const micIcon = document.getElementById('mic-icon');

  // ---- Push-to-Talk state ----
  let isRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        addLog('info', '🛑 Gravação encerrada. Processando...', 'Audio');
      }
      isRecording = false;
      if (btnMic) {
        btnMic.className = 'ml-2 w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/5';
      }
      if (micIcon) micIcon.textContent = '🎙️';
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all mic tracks
          stream.getTracks().forEach(t => t.stop());

          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);

          addLog('info', `📤 Enviando ${(uint8.length / 1024).toFixed(1)}KB de áudio para transcrição...`, 'Audio');

          if (window.syntra && typeof window.syntra.sendRecordedAudio === 'function') {
            window.syntra.sendRecordedAudio(uint8);
          } else {
            addLog('error', 'IPC sendRecordedAudio não disponível.', 'Audio');
          }
        };

        mediaRecorder.start();
        isRecording = true;
        addLog('info', '🔴 Gravando... Clique novamente para parar.', 'Audio');

        if (btnMic) {
          btnMic.className = 'ml-2 w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-red-600 hover:bg-red-500 text-white border border-red-400/30 shadow-lg shadow-red-600/30 animate-pulse';
        }
        if (micIcon) micIcon.textContent = '⏹️';
      } catch (err) {
        addLog('error', `Falha ao acessar microfone: ${err instanceof Error ? err.message : String(err)}`, 'Audio');
      }
    }
  };

  btnMic?.addEventListener('click', toggleRecording);

  const sendText = () => {
    const text = textInput.value.trim();
    if (!text) return;
    
    addLog('info', `Sending manual text: "${text}"`, 'UI');
    addMessage('user', text);
    addRecentCommand(text);
    textInput.value = '';
    
    if (window.syntra) {
      window.syntra.sendText(text);
    } else {
      addLog('error', 'Cannot send: syntra object missing');
    }
  };

  btnSend?.addEventListener('click', sendText);
  textInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') sendText();
  });

  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    conversationArea.innerHTML = '';
    if (window.syntra) window.syntra.clearHistory();
    addLog('info', 'Histórico de conversa limpo.');
  });

  document.getElementById('btn-minimize')?.addEventListener('click', () => window.syntra?.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.syntra?.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.syntra?.close());

    document.getElementById('btn-setup')?.addEventListener('click', () => {
      if (window.syntra && confirm('Deseja iniciar o instalador automático?')) {
        window.syntra.runSetup();
      }
    });

    // Synapse Access Modal Trigger (Restored)
    const synapseBtn = document.getElementById('synapse-access-btn');
    const synapseModal = document.getElementById('synapse-modal');
    const synapseClose = document.getElementById('synapse-close');

    if (synapseBtn && synapseModal && synapseClose) {
        synapseBtn.addEventListener('click', () => {
            addLog('info', 'Solicitando acesso ao Synapse Cluster...', 'UI');
            synapseModal.classList.remove('hidden');
            addLog('success', 'Synapse Modal aberto.', 'UI');
        });
        synapseClose.addEventListener('click', () => {
            synapseModal.classList.add('hidden');
            addLog('info', 'Conexão Synapse encerrada.', 'UI');
        });
    } else {
        if (!synapseBtn) addLog('error', 'Botão synapse-access-btn não encontrado no DOM!', 'System');
        if (!synapseModal) addLog('error', 'Modal synapse-modal não encontrado no DOM!', 'System');
    }
}

// ---- Bootstrap ----
function init(): void {
  console.log('[Syntra] Bootstrap init starting...');
  addLog('success', '◈ SyntraAI inicializando interface...', 'System');
  
  try {
    setState('idle');
    setupControls();
    setupIpcListeners();

    if (typeof AudioCapture !== 'undefined' && (AudioCapture as any).setupAudioCaptureIPC) {
      (AudioCapture as any).setupAudioCaptureIPC();
      addLog('info', 'Audio Capture IPC ready.', 'Audio');
    }

    addLog('success', 'Bootstrap complete. Ready for interaction.', 'System');

    // Auto-hide welcome screen after 3.5s
    setTimeout(() => {
      if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
        welcomeScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          welcomeScreen.classList.add('hidden');
          welcomeScreen.remove();
          console.log('[Syntra] Welcome screen removed after timeout.');
        }, 800);
      }
    }, 3500);
  } catch (err) {
    console.error('[Syntra] Bootstrap crash!', err);
    addLog('error', `Falha no bootstrap: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Immediate execution check
console.log('[Syntra] Script loaded, checking DOM state:', document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Syntra] DOMContentLoaded fired.');
    init();
  });
} else {
  console.log('[Syntra] DOM already ready, firing init.');
  init();
}
