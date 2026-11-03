// Sintetizador 8-bit con Web Audio. iOS exige crear/reanudar el contexto dentro de un gesto del usuario.
class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    } catch { /* sin audio */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, endFreq?: number, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  shoot() { this.tone(320, 0.15, 'square', 0.2, 80); }
  bounce() { this.tone(180, 0.08, 'triangle', 0.12, 90); }
  split(v: number) { const p = 200 + Math.log2(v || 2) * 40; this.tone(p, 0.05, 'square', 0.16); this.tone(p * 1.3, 0.07, 'square', 0.16, undefined, 0.04); }
  pop() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.08, 'square', 0.12, undefined, i * 0.04)); }
  bomb() { this.tone(150, 0.4, 'sawtooth', 0.3, 30); }
  power() { [440, 660, 880].forEach((f, i) => this.tone(f, 0.09, 'square', 0.14, undefined, i * 0.05)); }
  win() { [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.18, undefined, i * 0.07)); }
  lose() { [220, 180, 140, 90].forEach((f, i) => this.tone(f, 0.18, 'sawtooth', 0.2, undefined, i * 0.12)); }
  combo() { [600, 800, 1000, 1300].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.16, undefined, i * 0.05)); }
  // hockey
  puckHit(strength: number) { this.tone(260 + strength * 14, 0.07, 'square', 0.1 + Math.min(0.12, strength * 0.006), 120); }
  puckWall(strength: number) { this.tone(150 + strength * 6, 0.06, 'triangle', 0.08 + Math.min(0.08, strength * 0.004), 80); }
  goal() { [392, 523.25, 659.25, 784, 1046.5].forEach((f, i) => this.tone(f, 0.16, 'square', 0.16, undefined, i * 0.07)); }
  beep(high = false) { this.tone(high ? 880 : 520, 0.12, 'square', 0.14); }
  click() { this.tone(700, 0.04, 'square', 0.07); }
}
export const sfx = new Sfx();

export function installAudioUnlock() {
  const unlock = () => sfx.unlock();
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((n) => window.addEventListener(n, unlock, { passive: true }));
}
