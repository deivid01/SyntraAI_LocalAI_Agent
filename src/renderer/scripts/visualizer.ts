/**
 * visualizer.ts — Connects browser microphone to Waveform canvas
 * Runs in renderer process context
 */

declare const Waveform: {
  new(canvas: HTMLCanvasElement): {
    connectMicrophone(): Promise<void>;
    setAmplitude(value: number): void;
  };
};

let waveformInstance: InstanceType<typeof Waveform> | null = null;

function initVisualizer(): void {
  const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.warn('[Visualizer] waveform-canvas not found');
    return;
  }

  waveformInstance = new Waveform(canvas);
  waveformInstance.connectMicrophone().catch((err) => {
    console.warn('[Visualizer] Microphone unavailable:', err);
  });

  // Also listen for amplitude events from main process (backend audio)
  if (window.jarvis) {
    window.jarvis.onAmplitude((value: number) => {
      waveformInstance?.setAmplitude(value);
    });
  }
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualizer);
} else {
  initVisualizer();
}
