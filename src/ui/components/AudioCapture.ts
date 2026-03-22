/**
 * AudioCapture — Handles microphone recording for Whisper STT
 * Uses MediaRecorder API (stable, crash-proof, native Chromium pipeline).
 * 
 * Flow:
 *  1. Main process sends 'start-recording' IPC event
 *  2. MediaRecorder captures audio in webm/opus format
 *  3. Main process sends 'stop-recording' IPC event
 *  4. The complete blob is sent back via 'recorded-audio' IPC channel
 *  5. Main process saves it as a file for Whisper to process
 */

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let micStream: MediaStream | null = null;

async function ensureMicStream(): Promise<MediaStream> {
  if (micStream && micStream.active) return micStream;
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  return micStream;
}

async function startRecording(): Promise<void> {
  try {
    const stream = await ensureMicStream();
    audioChunks = [];

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      if (window.syntra && typeof window.syntra.sendRecordedAudio === 'function') {
        window.syntra.sendRecordedAudio(uint8);
      } else {
        console.error('[AudioCapture] IPC sendRecordedAudio not available');
      }
    };

    mediaRecorder.start();
    console.log('[AudioCapture] Recording started');
  } catch (err) {
    console.error('[AudioCapture] Failed to start recording:', err);
  }
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    console.log('[AudioCapture] Recording stopped');
  }
}

function isCurrentlyRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// Setup IPC listeners from main process
function setupAudioCaptureIPC(): void {
  if (!window.syntra) {
    console.warn('[AudioCapture] IPC bridge not available, audio capture disabled');
    return;
  }

  window.syntra.onStartRecording(() => {
    console.log('[AudioCapture] Received start-recording from main');
    startRecording();
  });

  window.syntra.onStopRecording(() => {
    console.log('[AudioCapture] Received stop-recording from main');
    stopRecording();
  });

  console.log('[AudioCapture] IPC listeners ready');
}

const AudioCaptureAPI = {
  startRecording,
  stopRecording,
  isCurrentlyRecording,
  setupAudioCaptureIPC,
};

// Expose globally
(window as Window & { AudioCapture?: typeof AudioCaptureAPI }).AudioCapture = AudioCaptureAPI;

export const AudioCapture = AudioCaptureAPI;
(window as any).AudioCapture = AudioCapture;
