/**
 * TypingText — Character-by-character typing animation
 */
export class TypingText {
  private element: HTMLElement;
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;
  private charDelay = 25; // ms per character

  constructor(elementId: string) {
    this.element = document.getElementById(elementId)!;
    if (!this.element) console.warn(`[TypingText] Element #${elementId} not found`);
  }

  async type(text: string, speedMs?: number): Promise<void> {
    this.clear();
    const delay = speedMs ?? this.charDelay;
    this.element.classList.add('typing');
    this.element.textContent = '';

    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i < text.length) {
          this.element.textContent += text[i++];
          this.currentTimeout = setTimeout(next, delay);
        } else {
          this.element.classList.remove('typing');
          resolve();
        }
      };
      next();
    });
  }

  setText(text: string): void {
    this.clear();
    this.element.classList.remove('typing');
    this.element.textContent = text;
  }

  clear(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.element.textContent = '';
  }
}

(window as Window & { TypingText?: typeof TypingText }).TypingText = TypingText;
