import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('syntra', {
  // Send text command manually
  sendText: (text: string) => ipcRenderer.send('send-text', text),

  // History
  getHistory: () => ipcRenderer.send('get-history'),
  clearHistory: () => ipcRenderer.send('clear-history'),

  // Audio capture
  sendRecordedAudio: (data: Uint8Array) => ipcRenderer.send('recorded-audio', data),
  sendAudioAmplitude: (amp: number) => ipcRenderer.send('audio-amplitude', amp),

  // Window controls
  runSetup: () => ipcRenderer.send('run-setup-script'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Synapse Access (RAG)
  synapseGetStats: () => ipcRenderer.invoke('synapse-get-stats'),
  synapseGetFiles: () => ipcRenderer.invoke('synapse-get-files'),
  synapseGetLogs: () => ipcRenderer.invoke('synapse-get-logs'),
  synapseToggleTraining: (active: boolean) => ipcRenderer.invoke('synapse-toggle-training', active),
  synapseUploadFile: (filePath: string, originalName: string) => ipcRenderer.invoke('synapse-upload-file', filePath, originalName),


  // Listen to events from main process
  onStatus: (callback: (status: string) => void) =>
    ipcRenderer.on('status-change', (_event, status) => callback(status)),

  onStatusText: (callback: (text: string) => void) =>
    ipcRenderer.on('status-text', (_event, text) => callback(text)),

  onTranscript: (callback: (text: string) => void) =>
    ipcRenderer.on('transcript', (_event, text) => callback(text)),

  onResponse: (callback: (text: string) => void) =>
    ipcRenderer.on('response', (_event, text) => callback(text)),

  onAmplitude: (callback: (value: number) => void) =>
    ipcRenderer.on('amplitude', (_event, value) => callback(value)),

  onLog: (callback: (entry: { level: string; message: string; context?: string }) => void) =>
    ipcRenderer.on('log-entry', (_event, entry) => callback(entry)),

  onHistoryData: (callback: (history: unknown[]) => void) =>
    ipcRenderer.on('history-data', (_event, data) => callback(data)),

  onDependencyStatus: (callback: (status: { ollama: boolean; whisper: boolean }) => void) =>
    ipcRenderer.on('dependency-status', (_event, status) => callback(status)),

  onTtsSpeak: (callback: (text: string) => void) =>
    ipcRenderer.on('tts-speak-web', (_event, text) => callback(text)),

  onStartRecording: (callback: () => void) =>
    ipcRenderer.on('start-recording', () => callback()),

  onStopRecording: (callback: () => void) =>
    ipcRenderer.on('stop-recording', () => callback()),
});

// Type declaration for renderer TypeScript
declare global {
  interface Window {
    syntra: {
      sendText(text: string): void;
      getHistory(): void;
      clearHistory(): void;
      sendRecordedAudio(data: Uint8Array): void;
      sendAudioAmplitude(amp: number): void;
      runSetup(): void;
      minimize(): void;
      maximize(): void;
      close(): void;
      synapseGetStats(): Promise<any>;
      synapseGetFiles(): Promise<any[]>;
      synapseGetLogs(): Promise<any[]>;
      synapseToggleTraining(active: boolean): Promise<void>;
      synapseUploadFile(filePath: string, originalName: string): Promise<void>;
      onStatus(cb: (status: string) => void): void;
      onStatusText(cb: (text: string) => void): void;
      onTranscript(cb: (text: string) => void): void;
      onResponse(cb: (text: string) => void): void;
      onAmplitude(cb: (value: number) => void): void;
      onLog(cb: (entry: { level: string; message: string; context?: string }) => void): void;
      onHistoryData(cb: (history: unknown[]) => void): void;
      onDependencyStatus(cb: (status: { ollama: boolean; whisper: boolean }) => void): void;
      onTtsSpeak(cb: (text: string) => void): void;
      onStartRecording(cb: () => void): void;
      onStopRecording(cb: () => void): void;
    };
  }
}
