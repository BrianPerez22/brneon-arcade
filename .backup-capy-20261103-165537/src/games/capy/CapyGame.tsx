// Capy Run: estilo "dinosaurio de Chrome". Un capibara pixel-art corre, salta bambú y se agacha ante los cuervos.
import { useEffect, useRef, useState } from 'react';
import { PX, getSprite, spriteSize } from './sprites.ts';
import type { SpriteName } from './sprites.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';

type Overlay = 'ready' | 'play' | 'pause' | 'over';
type Lane = 'low' | 'mid' | 'high';

// ---------- física (unidades: px lógicos y frames a 60 Hz)
const GRAVITY = 0.72, JUMP_V = 13.5, FAST_FALL = 3;
const SPEED0 = 6, SPEED_MAX = 14, ACCEL = 0.0024;
const CROW_EXTRA = 1.6;                      // los cuervos vuelan más rápido que el suelo
const LANE_LIFT: Record<Lane, number> = { low: 0, mid: 31, high: 75 }; // altura del borde inferior del sprite sobre el suelo
const FLOOR = 40;                            // franja de tierra bajo el suelo

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Part { sprite: SpriteName; dx: number }
interface Obstacle { kind: 'bamboo' | 'crow'; x: number; lift: number; w: number; h: number; parts: Part[]; boxes: Box[]; vx: number; lane?: Lane }
interface Dust { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number }

const SZ = (n: SpriteName) => { const s = spriteSize(n); return { w: s.w * PX, h: s.h * PX }; };
// cajas de colisión relativas a la esquina superior izquierda de cada sprite (px lógicos)
const CAPY_BOX: Box = { x0: 9, y0: 12, x1: 84, y1: 60 };
const CAPY_DUCK_BOX: Box = { x0: 9, y0: 9, x1: 84, y1: 36 };
const CROW_BOX: Box = { x0: 6, y0: 12, x1: 48, y1: 36 };
const STALK = { x0: 25, x1: 47 };           // el tallo (las hojas son decorativas: no cuentan)

function makeBamboo(count: number): Obstacle {
  const order: SpriteName[] = count === 1 ? [Math.random() < 0.5 ? 'bambooTall' : 'bambooShort'] : count === 2 ? ['bambooShort', 'bambooTall'] : ['bambooShort', 'bambooTall', 'bambooShort'];
  const parts: Part[] = []; const boxes: Box[] = [];
  let dx = 0, h = 0;
  for (const sprite of order) {
    const { w: sw, h: sh } = SZ(sprite);
    parts.push({ sprite, dx });
    boxes.push({ x0: dx + STALK.x0, x1: dx + STALK.x1, y0: 5 * PX, y1: sh }); // desde la punta del tallo
    h = Math.max(h, sh);
    dx += 14 * PX;
  }
  const w = dx - 14 * PX + SZ(order[order.length - 1]).w;
  return { kind: 'bamboo', x: 0, lift: 0, w, h, parts, boxes, vx: 0 };
}
function makeCrow(lane: Lane): Obstacle {
  const { w, h } = SZ('crowUp');
  return { kind: 'crow', x: 0, lift: LANE_LIFT[lane], w, h, parts: [{ sprite: 'crowUp', dx: 0 }], boxes: [CROW_BOX], vx: CROW_EXTRA, lane };
}

// ---------- colores (amanecer neón -> noche), se mezclan con nm 0..1
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const SKY_DAY = ['#3a1c78', '#7a2a9a', '#c4369a', '#ff5f8a', '#ff8f6a', '#ffc27a'];
const SKY_NIGHT = ['#03021a', '#080531', '#100a45', '#181059', '#201468', '#2a1a78'];

// decoración repetible: montañas, nubes, estrellas, hierbas
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const MOUNT_FAR = Array.from({ length: 48 }, (_, i) => 36 + Math.round(26 * Math.abs(Math.sin(i * 0.47) + 0.5 * Math.sin(i * 1.3))) );
const MOUNT_NEAR = Array.from({ length: 40 }, (_, i) => 14 + Math.round(16 * Math.abs(Math.sin(i * 0.9 + 1) + 0.4 * Math.sin(i * 2.1))));
const STARS = Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd() * 0.62, p: rnd() * 6 }));
const TUFTS = Array.from({ length: 70 }, () => ({ x: Math.round(rnd() * 2400), y: 8 + Math.round(rnd() * 24), k: rnd() < 0.55 ? 0 : 1 }));
const COL = 12; // ancho de columna de las montañas

export default function CapyGame({ onExit }: { onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Overlay>('ready');
  const [overlay, setOverlayState] = useState<Overlay>('ready');
  const [hud, setHud] = useState({ score: 0, best: load<number>('capyHi', 0), blink: false });
  const [newBest, setNewBest] = useState(false);

  const g = useRef({
    speed: SPEED0, dist: 0, score: 0, best: load<number>('capyHi', 0), nm: 0, night: false,
    py: 0, vy: 0, duck: false, duckKey: false, duckBtn: false, onGround: true, dead: false, deadT: 0, anim: 0,
    obs: [] as Obstacle[], gap: 0, dust: [] as Dust[], dustT: 0, blink: 0, shake: 0,
    clouds: Array.from({ length: 6 }, (_, i) => ({ x: i * 190 + rnd() * 80, y: 20 + rnd() * 70, w: 6 + Math.floor(rnd() * 4) })),
    ground: 0, far: 0, near: 0, t: 0, lastShown: -1, lastShownScore: -1, view: { W: 600, H: 240, scale: 1, dpr: 1 },
  });

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };

  const reset = () => {
    const s = g.current;
    Object.assign(s, { speed: SPEED0, dist: 0, score: 0, nm: 0, night: false, py: 0, vy: 0, duck: false, onGround: true, dead: false, deadT: 0, anim: 0,
      obs: [], gap: 420, dust: [], dustT: 0, blink: 0, shake: 0, ground: 0, far: 0, near: 0, lastShown: -1, lastShownScore: -1 });
    setNewBest(false);
    setHud((h) => ({ ...h, score: 0, blink: false }));
  };
  const begin = () => { sfx.unlock(); sfx.click(); reset(); setOverlay('play'); };
  const pause = () => { if (overlayRef.current === 'play') setOverlay('pause'); };
  const resume = () => { sfx.unlock(); setOverlay('play'); };

  const jump = () => {
    const s = g.current;
    if (overlayRef.current === 'ready') { begin(); return; }
    if (overlayRef.current !== 'play' || s.dead) return;
    if (s.onGround) { s.vy = JUMP_V; s.onGround = false; s.duck = false; sfx.jump(); }
  };
  const setDuck = (v: boolean, src: 'key' | 'btn') => { if (src === 'key') g.current.duckKey = v; else g.current.duckBtn = v; };

  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = g.current;

    const refit = () => {
      const bw = Math.max(50, box.clientWidth), bh = Math.max(50, box.clientHeight);
      const W = Math.max(560, Math.min(960, Math.round(240 * bw / bh)));
      const H = Math.max(240, Math.min(360, Math.round(W * bh / bw)));
      const scale = Math.min(bw / W, bh / H);
      const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
      s.view = { W, H, scale: cssW / W, dpr };
    };
    refit();
    const ro = new ResizeObserver(refit); ro.observe(box);
    window.addEventListener('orientationchange', refit);

    // ------------------------------------------------ lógica
    const spawn = () => {
      const { W } = s.view;
      const last = s.obs[s.obs.length - 1];
      const lastRight = last ? last.x + last.w : -Infinity;
      const x = W + 30;
      if (x - lastRight < s.gap) return;
      let o: Obstacle;
      if (s.score >= 110 && Math.random() < Math.min(0.42, 0.18 + s.score / 4000)) {
        const r = Math.random();
        o = makeCrow(r < 0.3 ? 'low' : r < 0.78 ? 'mid' : 'high');
        sfx.caw();
      } else {
        const r = Math.random(), more = Math.min(0.25, s.score / 3000);
        o = makeBamboo(r < 0.5 - more ? 1 : r < 0.82 - more / 2 ? 2 : 3);
      }
      o.x = x;
      s.obs.push(o);
      // distancia hasta el siguiente: lo que se recorre en un salto + margen aleatorio
      s.gap = s.speed * 36 * (1 + Math.random() * 0.7) + 150 + (o.kind === 'crow' ? 80 : 0) + o.w * 0.4;
    };

    const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

    const die = () => {
      if (s.dead) return;
      s.dead = true; s.deadT = 0; s.shake = 10; sfx.hit();
      const final = Math.floor(s.score);
      if (final > s.best) { s.best = final; save('capyHi', final); setNewBest(true); setHud((h) => ({ ...h, best: final })); }
    };

    const puff = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) s.dust.push({ x, y, vx: -Math.random() * 2 - 0.4, vy: -Math.random() * 1.6, life: 0, max: 14 + Math.random() * 10, s: PX * (Math.random() < 0.5 ? 1 : 2) });
    };

    const update = () => {
      s.t += 1 / 60;
      const playing = overlayRef.current === 'play';
      s.nm += ((s.night ? 1 : 0) - s.nm) * 0.012;                  // transición día/noche suave
      s.clouds.forEach((c) => { c.x -= 0.15 + (playing && !s.dead ? s.speed * 0.05 : 0); if (c.x < -80) { c.x = s.view.W + 40 + rnd() * 120; c.y = 20 + rnd() * 70; } });
      if (s.dead) {
        s.deadT++; s.vy -= GRAVITY; s.py = Math.max(0, s.py + s.vy);
        if (s.py === 0) s.vy = 0;
        if (s.shake > 0) s.shake--;
        s.dust.forEach((d) => { d.x += d.vx; d.y += d.vy; d.life++; }); s.dust = s.dust.filter((d) => d.life < d.max);
        if (s.deadT === 36 && overlayRef.current === 'play') setOverlay('over');
        return;
      }
      if (!playing) return;

      s.speed = Math.min(SPEED_MAX, s.speed + ACCEL);
      s.dist += s.speed; s.score += s.speed * 0.05;
      s.ground = (s.ground + s.speed) % 2400; s.far = (s.far + s.speed * 0.12) % (MOUNT_FAR.length * COL); s.near = (s.near + s.speed * 0.3) % (MOUNT_NEAR.length * COL);
      s.anim++;

      // día/noche cada 500 puntos
      const phase = Math.floor(s.score / 500) % 2 === 1;
      if (phase !== s.night) s.night = phase;
      // hito de 100 puntos
      const hundred = Math.floor(s.score / 100);
      if (hundred > 0 && hundred !== s.lastShown) { if (s.lastShown >= 0) { sfx.power(); s.blink = 45; } s.lastShown = hundred; }
      if (s.blink > 0) s.blink--;

      // salto / agacharse
      s.duck = (s.duckKey || s.duckBtn);
      if (!s.onGround) {
        s.vy -= GRAVITY * (s.duck ? FAST_FALL : 1);
        s.py += s.vy;
        if (s.py <= 0) { s.py = 0; s.vy = 0; s.onGround = true; sfx.land(); puff(70, s.view.H - FLOOR, 6); }
      } else {
        s.dustT++;
        if (s.dustT % 7 === 0 && !s.duck) puff(24, s.view.H - FLOOR, 1);
      }

      // obstáculos
      spawn();
      for (const o of s.obs) o.x -= s.speed + o.vx;
      s.obs = s.obs.filter((o) => o.x + o.w > -20);

      // colisiones
      const capyX = 60;
      const ducking = s.duck && s.onGround;
      const sh = ducking ? SZ('capyDuck').h : SZ('capyA').h;
      const top = s.view.H - FLOOR - s.py - sh;
      const cb = ducking ? CAPY_DUCK_BOX : CAPY_BOX;
      const me: Box = { x0: capyX + cb.x0, x1: capyX + cb.x1, y0: top + cb.y0, y1: top + cb.y1 };
      for (const o of s.obs) {
        const oTop = s.view.H - FLOOR - o.lift - o.h;
        for (const b of o.boxes) {
          if (hits(me, { x0: o.x + b.x0, x1: o.x + b.x1, y0: oTop + b.y0, y1: oTop + b.y1 })) { die(); break; }
        }
        if (s.dead) break;
      }
      // HUD de React (solo cuando cambia el entero)
      const shown = Math.floor(s.score);
      if (shown !== s.lastShownScore) { s.lastShownScore = shown; setHud((h) => ({ ...h, score: shown, blink: s.blink > 0 })); }
    };

    // ------------------------------------------------ dibujo
    const spr = (name: SpriteName, x: number, y: number) => {
      const c = getSprite(name);
      ctx.drawImage(c, Math.round(x), Math.round(y), c.width * PX, c.height * PX);
    };

    const draw = () => {
      const { W, H, scale, dpr } = s.view;
      const GROUND = H - FLOOR;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const k = scale * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      const nm = s.nm;

      // cielo en franjas (look pixel)
      const bands = SKY_DAY.length, bh = Math.ceil(GROUND / bands);
      for (let i = 0; i < bands; i++) { ctx.fillStyle = mix(SKY_DAY[i], SKY_NIGHT[i], nm); ctx.fillRect(-10, i * bh, W + 20, bh + 1); }
      // estrellas
      if (nm > 0.05) {
        for (const st of STARS) { const tw = (Math.sin(s.t * 2 + st.p) + 1) / 2; ctx.globalAlpha = nm * (0.35 + tw * 0.65); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(st.x * W / PX) * PX, Math.round(st.y * GROUND / PX) * PX, PX, PX); }
        ctx.globalAlpha = 1;
      }
      // sol / luna (píxeles)
      const cx = Math.round(W * 0.78 / PX) * PX, cy = Math.round(GROUND * 0.3 / PX) * PX, R = 6;
      const disc = (col: string, a: number) => { if (a < 0.02) return; ctx.globalAlpha = a; ctx.fillStyle = col; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R + 1) ctx.fillRect(cx + x * PX, cy + y * PX, PX, PX); ctx.globalAlpha = 1; };
      disc('#ffe38a', 1 - nm);
      if (nm > 0.02) { disc('#e9f3ff', nm); ctx.globalAlpha = nm; ctx.fillStyle = '#b8c8e6'; ctx.fillRect(cx - 2 * PX, cy - 2 * PX, 2 * PX, 2 * PX); ctx.fillRect(cx + 1 * PX, cy + 1 * PX, 3 * PX, 2 * PX); ctx.fillRect(cx - 3 * PX, cy + 2 * PX, PX, PX); ctx.globalAlpha = 1; }
      // nubes
      ctx.fillStyle = mix('#ffd9ec', '#46398f', nm); ctx.globalAlpha = 0.55 + 0.1 * (1 - nm);
      for (const c of s.clouds) {
        const x = Math.round(c.x / PX) * PX, y = Math.round(c.y / PX) * PX, w = c.w * PX;
        ctx.fillRect(x, y, w, PX); ctx.fillRect(x + PX, y - PX, w - 3 * PX, PX); ctx.fillRect(x + 2 * PX, y - 2 * PX, Math.max(PX, w - 6 * PX), PX); ctx.fillRect(x - PX, y + PX, w + 2 * PX, PX);
      }
      ctx.globalAlpha = 1;
      // montañas lejanas y cercanas (columnas de 12 px)
      const layer = (arr: number[], off: number, col: string, base: number) => {
        ctx.fillStyle = col;
        const n = arr.length, first = Math.floor(off / COL), shift = off % COL;
        for (let i = 0; i <= W / COL + 1; i++) { const h = arr[(first + i) % n]; ctx.fillRect(i * COL - shift, base - Math.round(h / PX) * PX, COL + 1, Math.round(h / PX) * PX + 1); }
      };
      layer(MOUNT_FAR, s.far, mix('#7a3b8c', '#1a1052', nm), GROUND - 4);
      layer(MOUNT_NEAR, s.near, mix('#4a2670', '#0f0833', nm), GROUND);

      // suelo
      ctx.fillStyle = mix('#5a3a2c', '#241520', nm); ctx.fillRect(-10, GROUND, W + 20, FLOOR + 10);
      ctx.fillStyle = mix('#47b862', '#1f6a46', nm); ctx.fillRect(-10, GROUND, W + 20, PX * 2);
      ctx.fillStyle = mix('#2f8a48', '#134a32', nm); ctx.fillRect(-10, GROUND + PX * 2, W + 20, PX);
      for (const t of TUFTS) {
        const x = ((t.x - s.ground) % 2400 + 2400) % 2400 - 100;
        if (x > W + 20) continue;
        const px = Math.round(x / PX) * PX, py = GROUND + 3 * PX + Math.round(t.y / PX) * PX;
        if (py > H) continue;
        ctx.fillStyle = mix(t.k ? '#7a5a46' : '#3f9a58', t.k ? '#3b2a38' : '#18583c', nm);
        if (t.k) { ctx.fillRect(px, py, 2 * PX, PX); } else { ctx.fillRect(px, py, PX, PX); ctx.fillRect(px + 2 * PX, py, PX, PX); ctx.fillRect(px + PX, py - PX, PX, PX); }
      }

      // obstáculos
      for (const o of s.obs) {
        const top = GROUND - o.lift - o.h;
        if (o.kind === 'bamboo') for (const p of o.parts) spr(p.sprite, o.x + p.dx, GROUND - SZ(p.sprite).h);
        else spr(Math.floor(s.t * 8) % 2 ? 'crowUp' : 'crowDown', o.x, top);
      }

      // capibara
      const ducking = s.duck && s.onGround && !s.dead;
      const name: SpriteName = s.dead ? 'capyDead' : !s.onGround ? 'capyJump' : ducking ? 'capyDuck' : overlayRef.current !== 'play' ? 'capyA' : Math.floor(s.anim / 5) % 2 ? 'capyB' : 'capyA';
      const sh = SZ(name).h, capyY = GROUND - s.py - sh;
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; const shw = Math.max(30, 78 - s.py * 0.3); ctx.fillRect(60 + 6 + (78 - shw) / 2, GROUND + 1, shw, PX);
      spr(name, 60, capyY);

      // polvo
      for (const d of s.dust) { ctx.globalAlpha = 1 - d.life / d.max; ctx.fillStyle = mix('#e8d2b0', '#6a5a7a', nm); ctx.fillRect(Math.round(d.x / PX) * PX, Math.round(d.y / PX) * PX, d.s, d.s); }
      ctx.globalAlpha = 1;
    };

    // ------------------------------------------------ bucle
    let raf = 0, last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { acc -= STEP; update(); }
      draw();
    };
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------ entrada
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const jumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
      const duckKey = e.code === 'ArrowDown' || e.code === 'KeyS';
      if (jumpKey || duckKey) e.preventDefault();
      if (down) {
        if (jumpKey && !e.repeat) {
          if (overlayRef.current === 'over' && g.current.deadT > 45) begin();
          else if (overlayRef.current === 'pause') resume();
          else jump();
        }
        if (duckKey) setDuck(true, 'key');
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (overlayRef.current === 'play') pause(); else if (overlayRef.current === 'pause') resume(); }
      } else if (duckKey) setDuck(false, 'key');
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => { g.current.duckKey = false; g.current.duckBtn = false; pause(); };
    const vis = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', vis);
    const tap = (e: PointerEvent) => { e.preventDefault(); jump(); };
    canvas.addEventListener('pointerdown', tap);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('orientationchange', refit);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointerdown', tap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game capy">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className={'stat' + (hud.blink ? ' blink' : '')}><span>Puntos</span><b>{hud.score}</b></div>
          <div className="stat"><span>Récord</span><b>{hud.best}</b></div>
        </div>
        <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv pix" />
        {overlay === 'ready' && (
          <div className="ov">
            <h2 className="ov-title lime">Capy Run</h2>
            <p className="ov-text">Corre lo más lejos que puedas: salta el bambú y agáchate ante los cuervos. Cada vez va más rápido.</p>
            <ul className="legend how">
              <li><i>☝</i> Celular: toca la pantalla para saltar y mantén «Agacharse»</li>
              <li><i>⌨</i> PC: Espacio / ↑ salta · ↓ se agacha · P pausa</li>
            </ul>
            <button className="btn lime" onClick={begin}>¡Correr!</button>
          </div>
        )}
        {overlay === 'pause' && (
          <div className="ov">
            <h2 className="ov-title amber">Pausa</h2>
            <button className="btn lime" onClick={resume}>Continuar</button>
            <button className="btn ghost" onClick={begin}>Reiniciar</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'over' && (
          <div className="ov">
            <h2 className="ov-title pink">¡Ouch!</h2>
            <p className="ov-text">Puntos: <b>{hud.score}</b> · Récord: <b>{hud.best}</b>{newBest && <span className="newbest"> · ¡nuevo récord!</span>}</p>
            <button className="btn lime" onClick={begin}>Reintentar</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
      </div>
      <footer className="capy-ctl">
        <button className="btn lime" onPointerDown={(e) => { e.preventDefault(); jump(); }} aria-label="Saltar">▲ Saltar</button>
        <button className="btn ghost" onPointerDown={(e) => { e.preventDefault(); setDuck(true, 'btn'); }} onPointerUp={() => setDuck(false, 'btn')}
          onPointerLeave={() => setDuck(false, 'btn')} onPointerCancel={() => setDuck(false, 'btn')} onContextMenu={(e) => e.preventDefault()} aria-label="Agacharse">▼ Agacharse</button>
      </footer>
    </div>
  );
}
