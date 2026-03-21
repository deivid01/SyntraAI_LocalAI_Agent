/**
 * StatusIndicator — Updates state text and colors
 */
export class StatusIndicator {
  private dotEl: HTMLElement;
  private labelEl: HTMLElement;

  private readonly labels: Record<string, string> = {
    idle:       'STANDBY',
    listening:  'OUVINDO',
    processing: 'PROCESSANDO',
    speaking:   'FALANDO',
  };

  constructor() {
    this.dotEl = document.getElementById('status-dot')!;
    this.labelEl = document.getElementById('status-label')!;
  }

  setState(state: string): void {
    document.body.className = `state-${state}`;
    this.labelEl.textContent = this.labels[state] ?? state.toUpperCase();

    // Update info mode panel
    const modeEl = document.getElementById('info-mode');
    if (modeEl) modeEl.textContent = this.labels[state] ?? state.toUpperCase();
  }

  setStatusText(text: string): void {
    this.labelEl.textContent = text.toUpperCase();
  }
}

(window as Window & { StatusIndicator?: typeof StatusIndicator }).StatusIndicator = StatusIndicator;
