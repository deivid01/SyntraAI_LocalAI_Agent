/**
 * HudCircle — Canvas 2D Syntra HUD ring animation
 * Draws: outer rotating ring, radar lines, inner pulsing ring, arc segments
 */
export class HudCircle {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: 'idle' | 'listening' | 'processing' | 'speaking' = 'idle';
  private amplitude = 0;
  private rotation = 0;
  private pulseScale = 1;
  private pulseDir = 1;
  private animFrame = 0;
  private radarAngle = 0;

  private readonly cx: number;
  private readonly cy: number;
  private readonly r: number; // outer radius

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cx = canvas.width / 2;
    this.cy = canvas.height / 2;
    this.r = Math.min(canvas.width, canvas.height) * 0.42;
    this.animate();
  }

  setState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void {
    this.state = state;
  }

  setAmplitude(value: number): void {
    this.amplitude = Math.min(1, Math.max(0, value));
  }

  private animate(): void {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  private update(): void {
    this.animFrame++;

    switch (this.state) {
      case 'idle':
        this.rotation += 0.003;
        this.radarAngle += 0.01;
        this.pulseScale = 1;
        break;
      case 'listening':
        this.rotation += 0.006;
        this.radarAngle += 0.025;
        this.pulseScale = 1 + this.amplitude * 0.08;
        break;
      case 'processing':
        this.rotation += 0.04;
        this.radarAngle += 0.05;
        this.pulseScale = 1 + Math.sin(this.animFrame * 0.15) * 0.04;
        break;
      case 'speaking':
        this.rotation += 0.008;
        this.radarAngle += 0.02;
        this.pulseScale = 1 + Math.sin(this.animFrame * 0.08) * 0.06 + this.amplitude * 0.04;
        break;
    }
  }

  private draw(): void {
    const { ctx, cx, cy, r } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const color = this.getStateColor();
    const alpha = this.state === 'idle' ? 0.5 : 0.85;

    // ----- Outer ring -----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    this.drawRing(0, r * 0.98, r * 1.0, color, 0.15 * alpha);
    this.drawDashedRing(0, r * 0.95, 1.5, color, 0.5 * alpha, 60);
    this.restoreAndDot(ctx, r * 0.97, color);
    ctx.restore();

    // ----- Radar sweep -----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.radarAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.88, -Math.PI / 6, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.08)`;
    ctx.fill();

    // Radar line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.88, 0);
    ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ----- Inner ring (counter-rotating) -----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.rotation * 1.5);
    this.drawDashedRing(0, r * 0.78, 1, color, 0.35 * alpha, 24);
    ctx.restore();

    // ----- Middle solid ring -----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation * 0.5);
    this.drawDashedRing(0, r * 0.88, 2, color, 0.6 * alpha, 12);
    ctx.restore();

    // ----- Pulsing center ring -----
    const ps = this.pulseScale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(ps, ps);
    this.drawGlowCircle(0, r * 0.62, color, 0.15 * alpha, 2);
    this.drawGlowCircle(0, r * 0.58, color, 0.08 * alpha, 1);
    ctx.restore();

    // ----- Arc tick marks (outer decorative) -----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation * 0.3);
    this.drawTickMarks(r * 0.93, 36, 6, 2, color, 0.4 * alpha);
    this.drawTickMarks(r * 0.93, 36, 2, 8, color, 0.2 * alpha);
    ctx.restore();

    // ----- Amplitude arcs (when listening/speaking) -----
    if (this.amplitude > 0.01 && (this.state === 'listening' || this.state === 'speaking')) {
      const arcAlpha = this.amplitude * 0.7;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.rotation * 2);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.amplitude);
      ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, ${arcAlpha})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawRing(x: number, innerR: number, outerR: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, 0, outerR, 0, Math.PI * 2);
    ctx.arc(x, 0, innerR, Math.PI * 2, 0, true);
    ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
    ctx.fill();
  }

  private drawDashedRing(x: number, radius: number, lineWidth: number, color: string, alpha: number, dashes: number): void {
    const ctx = this.ctx;
    const step = (Math.PI * 2) / dashes;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;

    for (let i = 0; i < dashes; i += 2) {
      ctx.beginPath();
      ctx.arc(x, 0, radius, step * i, step * (i + 0.8));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private drawGlowCircle(x: number, radius: number, color: string, alpha: number, lineWidth: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawTickMarks(radius: number, count: number, length: number, skip: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    const step = (Math.PI * 2) / count;
    ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i += skip) {
      const angle = step * i;
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius - length);
      const y2 = Math.sin(angle) * (radius - length);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private restoreAndDot(ctx: CanvasRenderingContext2D, radius: number, color: string): void {
    // Draw a bright dot at top of outer ring (rotating indicator)
    const x = Math.cos(-Math.PI / 2) * radius;
    const y = Math.sin(-Math.PI / 2) * radius;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private getStateColor(): string {
    switch (this.state) {
      case 'idle':       return '#8b5cf6'; // Violet-500
      case 'listening':  return '#10b981'; // Emerald-500
      case 'processing': return '#f59e0b'; // Amber-500
      case 'speaking':   return '#7c3aed'; // Violet-600
      default:           return '#8b5cf6';
    }
  }

  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }
}

(window as any).HudCircle = HudCircle;
