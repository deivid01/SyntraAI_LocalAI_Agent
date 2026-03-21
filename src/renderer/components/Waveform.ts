/**
 * Waveform — Real-time audio visualizer bar chart
 * Uses ONLY AnalyserNode for visualization (no ScriptProcessorNode).
 * Audio capture for Whisper is handled separately via MediaRecorder in AudioCapture.ts.
 */
export class Waveform {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private amplitude = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  async connectMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);

      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.startDraw();
    } catch (err) {
      console.warn('[Waveform] No microphone access:', err);
      this.drawFlat();
    }
  }

  setAmplitude(value: number): void {
    this.amplitude = value;
  }

  private startDraw(): void {
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.drawBars();
    };
    draw();
  }

  private drawBars(): void {
    if (!this.analyser || !this.dataArray) return;
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

    const { ctx } = this;
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const barCount = 80;
    const barWidth = w / barCount - 1;
    const step = Math.floor(this.dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = this.dataArray[i * step] / 255;
      const barH = value * h * 0.85;
      const x = i * (barWidth + 1);
      const y = (h - barH) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, `rgba(0, 234, 255, ${0.3 + value * 0.6})`);
      grad.addColorStop(0.5, `rgba(0, 234, 255, ${0.6 + value * 0.4})`);
      grad.addColorStop(1, `rgba(0, 180, 210, ${0.3 + value * 0.4})`);

      ctx.fillStyle = grad;
      ctx.shadowColor = '#00eaff';
      ctx.shadowBlur = value > 0.3 ? 8 : 0;
      ctx.fillRect(x, y, barWidth, barH);
    }

    ctx.shadowBlur = 0;
  }

  private drawFlat(): void {
    const { ctx } = this;
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = 'rgba(0, 234, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

(window as Window & { Waveform?: typeof Waveform }).Waveform = Waveform;
