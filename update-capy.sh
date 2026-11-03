#!/usr/bin/env bash
# update-capy.sh  ·  brneon Arcade
# Ejecútalo con:  bash update-capy.sh      (dentro de la carpeta del proyecto o en la que la contiene)
# Rediseña SOLO Capy Run: estilo retro arcade monocromo (verde de consola portátil, de noche invertido),
# capibara más chiquito y cabezón, bambú y cuervos simplificados, sin fondo detallado.
# Requiere haber aplicado antes update.sh. Guarda copia de lo que cambia en .backup-capy-<fecha>/
set -euo pipefail
if [ -f package.json ] && [ -d src ]; then ROOT="."
else
  ROOT=""
  for d in */; do [ -f "$d/package.json" ] && [ -d "$d/src" ] && ROOT="${d%/}" && break; done
  [ -n "$ROOT" ] || { echo "No encuentro el proyecto. Ejecuta este script dentro de la carpeta brneon-arcade."; exit 1; }
fi
cd "$ROOT"
[ -f src/games/capy/CapyGame.tsx ] || { echo "No existe Capy Run: aplica primero update.sh."; exit 1; }
BK=".backup-capy-$(date +%Y%m%d-%H%M%S)"
for f in src/games/capy/sprites.ts src/games/capy/CapyGame.tsx src/ui/Menu.tsx; do mkdir -p "$BK/$(dirname "$f")"; cp "$f" "$BK/$f"; done

echo "  escribiendo src/games/capy/sprites.ts"
cat > 'src/games/capy/sprites.ts' <<'CAPY_EOF_0'
// Sprites pixel-art retro, 1 solo color (D) + el color del fondo (w = "hueco"). '.' = transparente.
export const SPRITES = {
  capyA: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DD..DD.....DD.DD.',
    '.DD..DD.....DD.DD.',
    '.DD..DD.....DD.DD.',
    '.DD............DD.'
  ],
  capyB: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD...DD..DD.',
    '..DD..DD...DD..DD.',
    '..DD..DD...DD..DD.',
    '......DD...DD.....'
  ],
  capyJump: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    'DD..DD......DD..DD',
    '....DD......DD....',
    '..................',
    '..................'
  ],
  capyDuck: [
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.'
  ],
  capyDead: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDwDwDD',
    '..DDDDDDDDDDDDwDDD',
    '.DDDDDDDDDDDDwDwDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.'
  ],
  bambooTall: [
    '.D......D..',
    '.DDD..DDD..',
    '..DDDDDD...',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.DD..',
    '...DDDD....',
    '....DD.....',
    '.DD.DD.....',
    '...DDD.....',
    '...DDDD....',
    '....DD.....',
    '....DD.....',
    '....DD.....'
  ],
  bambooShort: [
    '.D......D..',
    '.DDD..DDD..',
    '..DDDDDD...',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '...DDDD....',
    '....DD.....',
    '....DD.....',
    '....DD.....'
  ],
  crowUp: [
    '........DD..',
    '.......DDD..',
    '..DDD.DDDDD.',
    '.DwDDDDDDDD.',
    'DDDDDDDDDDDD',
    'DDDDDDDDDDDD',
    '...DDDDDDD..',
    '............',
    '............'
  ],
  crowDown: [
    '............',
    '............',
    '..DDD.......',
    '.DwDDDDDDDD.',
    'DDDDDDDDDDDD',
    'DDDDDDDDDDDD',
    '...DDDDDDD..',
    '......DDDDD.',
    '.......DDD..'
  ],
} as const;
export type SpriteName = keyof typeof SPRITES;

export const PX = 3; // cada píxel de arte se dibuja de 3x3 px lógicos
export const spriteSize = (n: SpriteName) => ({ w: SPRITES[n][0].length, h: SPRITES[n].length });

// Paleta tipo consola portátil: de día sprites oscuros sobre fondo claro; de noche, al revés.
export interface Theme { bg: string; ink: string; soft: string }
export const DAY: Theme = { bg: '#9bbc0f', ink: '#0f380f', soft: '#8bac0f' };
export const NIGHT: Theme = { bg: '#0f380f', ink: '#9bbc0f', soft: '#306230' };

const cache = new Map<string, HTMLCanvasElement>();
/** Sprite ya "pintado" en un canvas del tamaño del arte; se dibuja ampliado sin suavizado. */
export function getSprite(n: SpriteName, t: Theme): HTMLCanvasElement {
  const key = n + t.ink;
  let c = cache.get(key);
  if (c) return c;
  const rows = SPRITES[n];
  c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; g.fillStyle = ch === 'D' ? t.ink : t.bg; g.fillRect(x, y, 1, 1); } });
  cache.set(key, c);
  return c;
}

/** Mismo sprite como trazado SVG (arte del menú). */
export function spritePath(n: SpriteName): string {
  let d = '';
  SPRITES[n].forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'D') d += `M${x} ${y}h1v1h-1z`; });
  return d;
}
CAPY_EOF_0

echo "  escribiendo src/games/capy/CapyGame.tsx"
cat > 'src/games/capy/CapyGame.tsx' <<'CAPY_EOF_1'
// Capy Run: estilo "dinosaurio de Chrome". Un capibara pixel-art corre, salta bambú y se agacha ante los cuervos.
import { useEffect, useRef, useState } from 'react';
import { PX, DAY, NIGHT, getSprite, spriteSize } from './sprites.ts';
import type { SpriteName } from './sprites.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';

type Overlay = 'ready' | 'play' | 'pause' | 'over';
type Lane = 'low' | 'mid' | 'high';

// ---------- física (unidades: px lógicos y frames a 60 Hz)
const GRAVITY = 0.7, JUMP_V = 12, FAST_FALL = 3;
const SPEED0 = 6, SPEED_MAX = 13, ACCEL = 0.0024;
const CROW_EXTRA = 1.4;                      // los cuervos vuelan más rápido que el suelo
const LANE_LIFT: Record<Lane, number> = { low: 0, mid: 28, high: 62 }; // altura del borde inferior del sprite sobre el suelo
const FLOOR = 36;                            // franja bajo el suelo

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Part { sprite: SpriteName; dx: number }
interface Obstacle { kind: 'bamboo' | 'crow'; x: number; lift: number; w: number; h: number; parts: Part[]; boxes: Box[]; vx: number; lane?: Lane }

const SZ = (n: SpriteName) => { const s = spriteSize(n); return { w: s.w * PX, h: s.h * PX }; };
// cajas de colisión relativas a la esquina superior izquierda de cada sprite (px lógicos)
const CAPY_BOX: Box = { x0: 6, y0: 3, x1: 49, y1: 39 };
const CAPY_DUCK_BOX: Box = { x0: 6, y0: 3, x1: 49, y1: 26 };
const CROW_BOX: Box = { x0: 3, y0: 3, x1: 33, y1: 24 };
const STALK = { x0: 9, x1: 24 };            // el tallo (las hojas son decorativas: no cuentan)

function makeBamboo(count: number): Obstacle {
  const order: SpriteName[] = count === 1 ? [Math.random() < 0.5 ? 'bambooTall' : 'bambooShort'] : count === 2 ? ['bambooShort', 'bambooTall'] : ['bambooShort', 'bambooTall', 'bambooShort'];
  const parts: Part[] = []; const boxes: Box[] = [];
  let dx = 0, h = 0;
  for (const sprite of order) {
    const { w: sw, h: sh } = SZ(sprite);
    parts.push({ sprite, dx });
    boxes.push({ x0: dx + STALK.x0, x1: dx + STALK.x1, y0: 2 * PX, y1: sh }); // desde la punta del tallo
    h = Math.max(h, sh);
    dx += 9 * PX;
  }
  const w = dx - 9 * PX + SZ(order[order.length - 1]).w;
  return { kind: 'bamboo', x: 0, lift: 0, w, h, parts, boxes, vx: 0 };
}
function makeCrow(lane: Lane): Obstacle {
  const { w, h } = SZ('crowUp');
  return { kind: 'crow', x: 0, lift: LANE_LIFT[lane], w, h, parts: [{ sprite: 'crowUp', dx: 0 }], boxes: [CROW_BOX], vx: CROW_EXTRA, lane };
}

// decoración repetible (nubes y suelo)
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const TUFTS = Array.from({ length: 60 }, () => ({ x: Math.round(rnd() * 2400), y: 4 + Math.round(rnd() * 24), w: rnd() < 0.5 ? 1 : 2 }));

export default function CapyGame({ onExit }: { onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Overlay>('ready');
  const [overlay, setOverlayState] = useState<Overlay>('ready');
  const [hud, setHud] = useState({ score: 0, best: load<number>('capyHi', 0), blink: false });
  const [newBest, setNewBest] = useState(false);

  const g = useRef({
    speed: SPEED0, dist: 0, score: 0, best: load<number>('capyHi', 0), night: false,
    py: 0, vy: 0, duck: false, duckKey: false, duckBtn: false, onGround: true, dead: false, deadT: 0, anim: 0,
    obs: [] as Obstacle[], gap: 0, blink: 0, shake: 0,
    clouds: Array.from({ length: 5 }, (_, i) => ({ x: i * 220 + rnd() * 80, y: 24 + rnd() * 60, w: 6 + Math.floor(rnd() * 3) })),
    ground: 0, t: 0, lastShown: -1, lastShownScore: -1, view: { W: 600, H: 240, scale: 1, dpr: 1 },
  });

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };

  const reset = () => {
    const s = g.current;
    Object.assign(s, { speed: SPEED0, dist: 0, score: 0, night: false, py: 0, vy: 0, duck: false, onGround: true, dead: false, deadT: 0, anim: 0,
      obs: [], gap: 420, blink: 0, shake: 0, ground: 0, lastShown: -1, lastShownScore: -1 });
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

    const update = () => {
      s.t += 1 / 60;
      const playing = overlayRef.current === 'play';
      s.clouds.forEach((c) => { c.x -= 0.15 + (playing && !s.dead ? s.speed * 0.05 : 0); if (c.x < -80) { c.x = s.view.W + 40 + rnd() * 120; c.y = 20 + rnd() * 70; } });
      if (s.dead) {
        s.deadT++; s.vy -= GRAVITY; s.py = Math.max(0, s.py + s.vy);
        if (s.py === 0) s.vy = 0;
        if (s.shake > 0) s.shake--;
        if (s.deadT === 36 && overlayRef.current === 'play') setOverlay('over');
        return;
      }
      if (!playing) return;

      s.speed = Math.min(SPEED_MAX, s.speed + ACCEL);
      s.dist += s.speed; s.score += s.speed * 0.05;
      s.ground = (s.ground + s.speed) % 2400;
      s.anim++;

      // día/noche (colores invertidos) cada 700 puntos
      const phase = Math.floor(s.score / 700) % 2 === 1;
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
        if (s.py <= 0) { s.py = 0; s.vy = 0; s.onGround = true; sfx.land(); }
      }

      // obstáculos
      spawn();
      for (const o of s.obs) o.x -= s.speed + o.vx;
      s.obs = s.obs.filter((o) => o.x + o.w > -20);

      // colisiones
      const capyX = 40;
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
      const c = getSprite(name, s.night ? NIGHT : DAY);
      ctx.drawImage(c, Math.round(x), Math.round(y), c.width * PX, c.height * PX);
    };

    const draw = () => {
      const { W, H, scale, dpr } = s.view;
      const GROUND = H - FLOOR;
      const th = s.night ? NIGHT : DAY;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const k = scale * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      ctx.fillStyle = th.bg; ctx.fillRect(-10, -10, W + 20, H + 20);

      // nubes: bloques planos de un tono suave
      ctx.fillStyle = th.soft;
      for (const c of s.clouds) {
        const x = Math.round(c.x / PX) * PX, y = Math.round(c.y / PX) * PX, w = c.w * PX;
        ctx.fillRect(x, y, w, PX); ctx.fillRect(x + PX, y - PX, w - 3 * PX, PX); ctx.fillRect(x - PX, y + PX, w + 2 * PX, PX);
      }

      // suelo: una línea y puntitos que pasan
      ctx.fillStyle = th.ink; ctx.fillRect(-10, GROUND, W + 20, PX);
      for (const t of TUFTS) {
        const x = ((t.x - s.ground) % 2400 + 2400) % 2400 - 100;
        if (x > W + 20) continue;
        const py = GROUND + 2 * PX + Math.round(t.y / PX) * PX;
        if (py > H) continue;
        ctx.fillRect(Math.round(x / PX) * PX, py, t.w * PX, PX);
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
      spr(name, 40, GROUND - s.py - SZ(name).h);
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
CAPY_EOF_1

echo "  escribiendo src/ui/Menu.tsx"
cat > 'src/ui/Menu.tsx' <<'CAPY_EOF_2'
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';
import { spritePath, DAY } from '../games/capy/sprites.ts';
import type { SpriteName } from '../games/capy/sprites.ts';

export type MenuTarget = 'pool' | 'hockey' | 'lucky' | 'game2048' | 'capy';
interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; go: (n: MenuTarget) => void }

function PoolArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="62" y="10" width="46" height="46" fill="#ff0055" stroke="#fff" strokeWidth="3" />
      <text x="85" y="40" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="11" fill="#fff">2048</text>
      <rect x="12" y="52" width="20" height="20" fill="#ffea00" stroke="#fff580" strokeWidth="2" />
      <rect x="38" y="62" width="14" height="14" fill="#00ffcc" stroke="#99ffe6" strokeWidth="2" />
      <circle cx="26" cy="26" r="11" fill="#00ffcc" /><circle cx="26" cy="26" r="6.5" fill="#0099ff" />
      <path d="M36 30 L58 36" stroke="#00ffcc" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  );
}
function HockeyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="4" y="6" width="112" height="68" rx="6" fill="none" stroke="#2a2152" strokeWidth="2" />
      <line x1="60" y1="6" x2="60" y2="74" stroke="#9a93c4" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="2" y="28" width="5" height="24" fill="#19f4ff" /><rect x="113" y="28" width="5" height="24" fill="#ff2bd6" />
      <circle cx="28" cy="40" r="12" fill="#19f4ff" /><circle cx="28" cy="40" r="7" fill="#0a5d73" /><circle cx="28" cy="40" r="3.5" fill="#19f4ff" />
      <circle cx="94" cy="40" r="12" fill="#ff2bd6" /><circle cx="94" cy="40" r="7" fill="#6b0f5c" /><circle cx="94" cy="40" r="3.5" fill="#ff2bd6" />
      <circle cx="60" cy="40" r="6" fill="#f4f1ff" stroke="#19f4ff" strokeWidth="2" />
    </svg>
  );
}
function LuckyArt() {
  const cols = ['#ff0055', '#ffea00', '#00ffcc'];
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={10 + i * 36} y="14" width="30" height="30" rx="5" fill={i === 1 ? cols[1] : '#1d1545'} stroke={i === 1 ? '#fff580' : '#3a2d7a'} strokeWidth="2.5" />
          <text x={25 + i * 36} y="36" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="14" fill={i === 1 ? '#302800' : '#19f4ff'}>{i === 1 ? '64' : '?'}</text>
        </g>
      ))}
      <text x="60" y="68" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="9" fill="#ffb800">3 = ?</text>
    </svg>
  );
}
function Art2048() {
  const cells: [number, number, string, string][] = [[0, 0, '2', '#00ffcc'], [1, 0, '4', '#ff00aa'], [0, 1, '8', '#ff3300'], [2, 1, '128', '#00ff66'], [3, 2, '2048', '#ff0055'], [1, 3, '16', '#ff8800']];
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      {cells.map(([c, r, v, col], i) => (
        <g key={i}>
          <rect x={10 + c * 25} y={r * 19 + 2} width="22" height="17" rx="3" fill={col} />
          <text x={21 + c * 25} y={r * 19 + 14} textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize={v.length > 3 ? 5 : 7} fill="#fff">{v}</text>
        </g>
      ))}
    </svg>
  );
}
// Capy Run: mismos sprites retro del juego, dibujados como SVG
function Sprite({ name, x, y, scale }: { name: SpriteName; x: number; y: number; scale: number }) {
  return <path transform={`translate(${x} ${y}) scale(${scale})`} d={spritePath(name)} fill={DAY.ink} />;
}
function CapyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden shapeRendering="crispEdges">
      <rect width="120" height="80" fill={DAY.bg} />
      <rect x="70" y="14" width="22" height="3" fill={DAY.soft} /><rect x="14" y="22" width="18" height="3" fill={DAY.soft} />
      <rect x="0" y="62" width="120" height="3" fill={DAY.ink} />
      <Sprite name="capyA" x={10} y={39} scale={1.6} />
      <Sprite name="bambooTall" x={66} y={36} scale={1.6} />
      <Sprite name="crowUp" x={88} y={22} scale={1.6} />
    </svg>
  );
}

const GAMES: { id: MenuTarget; title: string; desc: string; color: string; art: JSX.Element; tags: string[] }[] = [
  { id: 'pool', title: 'Neon 2048 Pool', desc: 'Parte la ficha gigante a golpes de bola.', color: 'c-cyan', art: <PoolArt />, tags: ['1 jugador', 'Skins'] },
  { id: 'hockey', title: 'Air Hockey', desc: 'Contra la CPU o de a dos en la misma pantalla.', color: 'c-pink', art: <HockeyArt />, tags: ['1-2 jugadores', '3 dificultades', 'Skins'] },
  { id: 'lucky', title: 'Suerte 2048', desc: 'Voltea 3 fichas "?" y suma. Gana el que más junte.', color: 'c-amber', art: <LuckyArt />, tags: ['Vs máquina', 'Multijugador'] },
  { id: 'game2048', title: '2048', desc: 'El clásico: desliza y fusiona hasta llegar al 2048.', color: 'c-lime', art: <Art2048 />, tags: ['1 jugador', 'Récord'] },
  { id: 'capy', title: 'Capy Run', desc: 'Un capibara corre, salta bambú y esquiva cuervos.', color: 'c-green', art: <CapyArt />, tags: ['1 jugador', 'Récord', 'Pixel art'] },
];

export default function Menu({ settings, onChange, go }: Props) {
  const nav = (n: MenuTarget) => { sfx.unlock(); sfx.click(); go(n); };
  return (
    <main className="menu scroll">
      <button className="ibtn sound" onClick={() => { sfx.unlock(); onChange({ sound: !settings.sound }); }} aria-label={settings.sound ? 'Silenciar' : 'Activar sonido'} aria-pressed={settings.sound} title={settings.sound ? 'Sonido: sí' : 'Sonido: no'}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
          {settings.sound ? <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" /></> : <path d="M16 9l5 6M21 9l-5 6" />}
        </svg>
      </button>
      <header className="brand">
        <h1 className="tube" aria-label="brneon Arcade">
          <span className="br">br</span><span className="neon">neon</span>
        </h1>
        <p className="games">Arcade</p>
        <p className="tag">Juegos para el celular y el PC. Cada uno trae sus propios modos y botones.</p>
      </header>
      <section aria-label="Juegos">
        <h2 className="sec">Juegos <span>{GAMES.length}</span></h2>
        <nav className="cabs">
          {GAMES.map((g) => (
            <button key={g.id} className={'cab ' + g.color} onClick={() => nav(g.id)}>
              {g.art}
              <span className="cab-t">{g.title}</span>
              <span className="cab-s">{g.desc}</span>
              <span className="cab-tags">{g.tags.map((t) => <i key={t}>{t}</i>)}</span>
            </button>
          ))}
        </nav>
      </section>
      <footer className="foot"><span>brneon Arcade</span></footer>
    </main>
  );
}
CAPY_EOF_2

echo "Listo. Copia de seguridad en: $ROOT/$BK"
if command -v npm >/dev/null 2>&1 && [ -d node_modules ]; then
  if npm run build >/dev/null 2>&1; then echo "Compilación OK. Corre: npm run dev"; else echo "AVISO: la compilación falló; ejecuta 'npm run build' para ver el error."; fi
fi
