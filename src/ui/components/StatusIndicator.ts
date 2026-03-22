/**
 * StatusIndicator — Updates state text and colors
 */
export class StatusIndicator {
  private dotEl: HTMLElement;
  private labelEl: HTMLElement;

  private readonly labels: Record<string, string> = {
    idle:       'STANDBY',
    listening:  'LISTENING',
    processing: 'THINKING',
    speaking:   'SPEAKING',
  };

  private readonly colors: Record<string, string> = {
    idle:       'bg-zinc-500',
    listening:  'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    processing: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    speaking:   'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]',
  };

  constructor() {
    this.dotEl = document.getElementById('status-dot')!;
    this.labelEl = document.getElementById('status-label')!;
  }

  setState(state: string): void {
    const label = this.labels[state] || state.toUpperCase();
    this.labelEl.textContent = label;
    
    // Reset and apply dot color
    this.dotEl.className = `w-2 h-2 rounded-full transition-all duration-300 ${this.colors[state] || 'bg-zinc-500'}`;
    if (state === 'listening' || state === 'processing') {
      this.dotEl.classList.add('animate-pulse');
    }

    // Update info mode panel if it exists
    const modeEl = document.getElementById('info-mode');
    if (modeEl) {
      modeEl.textContent = label;
      modeEl.className = `text-xs font-semibold ${state === 'listening' ? 'text-emerald-400' : 'text-violet-400'}`;
    }
  }

  setStatusText(text: string): void {
    this.labelEl.textContent = text.toUpperCase();
  }
}

(window as any).StatusIndicator = StatusIndicator;
