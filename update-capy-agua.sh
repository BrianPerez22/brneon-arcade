#!/usr/bin/env bash
# BrNeon Games - Capy Run BAJO EL AGUA (restaura el modo Capy Run en el menú).
#  - Fondo submarino: superficie y cielo arriba, rayos de luz, burbujas, algas y arena.
#  - Corales en vez de bambú, medusas en vez de cuervos; la jugabilidad es la misma.
#  - Capibara cabezón, cuerpo chiquito, patas traseras pegadas a las delanteras y casco de burbuja de aire.
#  - Color neón del juego: azul neón por defecto; se cambia en Skins -> Capibara.
#  - Historial de partidas (boton con trofeo) y récord guardados en cada dispositivo hasta borrar los datos del sitio.
# Requisito: haber aplicado update-multi.sh (trae scores.ts, Scoreboard y el ajuste capyColor).
# Uso: copia este archivo a la carpeta del proyecto (donde está package.json) y ejecuta:  bash update-capy-agua.sh
set -e

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "x Ejecuta este script dentro de la carpeta del proyecto (donde está package.json)."; exit 1
fi
if [ ! -f src/core/scores.ts ] || [ ! -f src/ui/Scoreboard.tsx ] || [ ! -f src/core/capybara.ts ] || ! grep -q capyColor src/core/storage.ts; then
  echo "x Falta la actualización anterior. Ejecuta primero:  bash update-multi.sh   y luego este script."; exit 1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP=".backup-capy-agua-$STAMP"
echo "> Respaldando archivos que se reemplazan en $BACKUP/ ..."
for f in src/core/capybara.ts src/games/capy/capy.css src/games/capy/CapyGame.tsx src/ui/Skins.tsx src/ui/Menu.tsx src/App.tsx src/games/capy/CapyGame.tsx src/games/capy/sprites.ts ; do
  if [ -f "$f" ]; then mkdir -p "$BACKUP/$(dirname "$f")"; cp "$f" "$BACKUP/$f"; fi
done

mkdir -p src/core src/ui src/games/capy
echo "> Escribiendo src/core/capybara.ts"
cat > "src/core/capybara.ts" <<'BRNEON_EOF'
// Capibara tierno: cabezón, cuerpo chiquito, patas traseras pegadas a las delanteras y casco de burbuja de aire.
// Se dibuja mirando a la derecha. Origen (0,0) ≈ centro del cuerpo; los pies tocan el suelo en y = 0.35 * s.
export interface CapyColor { id: string; name: string; color: string }

// Por defecto 'azul' = el mismo azul neón del resto de BrNeon (--cyan)
export const CAPY_COLORS: CapyColor[] = [
  { id: 'azul', name: 'Azul neón', color: '#19f4ff' },
  { id: 'rosa', name: 'Rosa neón', color: '#ff2bd6' },
  { id: 'ambar', name: 'Ámbar', color: '#ffb800' },
  { id: 'lima', name: 'Lima', color: '#b6ff2e' },
  { id: 'violeta', name: 'Violeta', color: '#9b7bff' },
  { id: 'verde', name: 'Verde menta', color: '#38ff9c' },
  { id: 'rojo', name: 'Rojo neón', color: '#ff3b6b' },
];
export const findCapyColor = (id: string) => CAPY_COLORS.find((c) => c.id === id) ?? CAPY_COLORS[0];

export type CapyPose = 'run' | 'jump' | 'dead';
export interface CapyOpts { glow: string; t?: number; blink?: boolean; pose?: CapyPose; step?: number; helmet?: boolean }

const ell = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };

export function drawCapybara(ctx: CanvasRenderingContext2D, s: number, o: CapyOpts) {
  const t = o.t ?? 0, pose = o.pose ?? 'run', step = o.step ?? t * 14;
  const fur = '#b9854f', furDark = '#8a5c33', belly = '#dcae78', ink = '#2a1608';
  const bob = pose === 'run' ? Math.sin(step * 2) * s * 0.012 : pose === 'jump' ? 0 : 0;
  ctx.save();
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const lw = Math.max(1.5, s * 0.03);

  // pieza con contorno neón
  const piece = (path: () => void, fill: string, glow = true) => {
    path(); ctx.fillStyle = fill; ctx.shadowColor = o.glow; ctx.shadowBlur = glow ? s * 0.1 : 0; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = o.glow; ctx.lineWidth = lw; ctx.stroke();
  };

  // patas cortitas: las traseras (-0.12 / -0.06) casi tocan a las delanteras (0.06 / 0.12)
  const leg = (x: number, k: number, shade: string) => {
    const lift = pose === 'jump' ? s * 0.05 : Math.max(0, Math.sin(step + k)) * s * 0.05;
    const h = pose === 'jump' ? s * 0.1 : s * 0.14;
    piece(() => { ctx.beginPath(); ctx.roundRect(x - s * 0.05, s * 0.35 - h - lift, s * 0.1, h, s * 0.045); }, shade, false);
  };
  leg(-s * 0.06, 0, furDark); leg(s * 0.12, 0.2, furDark);        // las del lado lejano (más oscuras)

  // cuerpo chiquito
  piece(() => ell(ctx, -s * 0.02, s * 0.13, s * 0.24, s * 0.16), fur);
  ctx.fillStyle = belly; ell(ctx, -s * 0.01, s * 0.2, s * 0.14, s * 0.06); ctx.fill();

  leg(-s * 0.12, Math.PI, fur); leg(s * 0.06, Math.PI + 0.2, fur); // las del lado cercano

  // cabezota
  piece(() => ell(ctx, s * 0.13, -s * 0.1, s * 0.33, s * 0.29), fur);
  // hocico chato y redondeado
  piece(() => { ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.1, s * 0.2, s * 0.21, s * 0.09); }, fur, false);
  ctx.fillStyle = fur; ell(ctx, s * 0.13, -s * 0.1, s * 0.31, s * 0.27); ctx.fill();   // tapa la unión con el hocico

  // orejita
  ctx.fillStyle = furDark; ell(ctx, -s * 0.02, -s * 0.33, s * 0.06, s * 0.05); ctx.fill();
  ctx.fillStyle = belly; ell(ctx, -s * 0.02, -s * 0.33, s * 0.03, s * 0.025); ctx.fill();

  // ojo grande
  const ex = s * 0.22, ey = -s * 0.14;
  if (pose === 'dead') {
    ctx.strokeStyle = ink; ctx.lineWidth = s * 0.022; ctx.beginPath();
    ctx.moveTo(ex - s * 0.04, ey - s * 0.04); ctx.lineTo(ex + s * 0.04, ey + s * 0.04); ctx.moveTo(ex + s * 0.04, ey - s * 0.04); ctx.lineTo(ex - s * 0.04, ey + s * 0.04); ctx.stroke();
  } else if (o.blink) {
    ctx.strokeStyle = ink; ctx.lineWidth = s * 0.022; ctx.beginPath(); ctx.arc(ex, ey, s * 0.04, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ctx.fillStyle = ink; ell(ctx, ex, ey, s * 0.048, s * 0.058); ctx.fill();
    ctx.fillStyle = '#fff'; ell(ctx, ex + s * 0.016, ey - s * 0.022, s * 0.017, s * 0.019); ctx.fill();
  }
  // naricita, sonrisa y cachete
  ctx.fillStyle = ink; ell(ctx, s * 0.43, -s * 0.05, s * 0.018, s * 0.024); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.015; ctx.beginPath(); ctx.arc(s * 0.36, s * 0.01, s * 0.05, 0.25, Math.PI * 0.8); ctx.stroke();
  ctx.fillStyle = '#ff8fa3aa'; ell(ctx, s * 0.15, s * 0.02, s * 0.045, s * 0.03); ctx.fill();

  // casco de burbuja de aire
  if (o.helmet !== false) {
    const cx = s * 0.13, cy = -s * 0.1, R = s * 0.46;
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.20)'); g.addColorStop(0.7, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.shadowColor = o.glow; ctx.shadowBlur = s * 0.14; ctx.fill();
    ctx.strokeStyle = o.glow; ctx.lineWidth = lw * 1.2; ctx.stroke(); ctx.shadowBlur = 0;
    // reflejos
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = lw * 1.3;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, cx - R * 0.62, cy - R * 0.5, R * 0.05, R * 0.05); ctx.fill();
    // aro del cuello
    ctx.strokeStyle = '#d8e6f0'; ctx.lineWidth = lw * 2.2; ctx.beginPath(); ctx.arc(cx, cy, R * 0.97, Math.PI * 0.12, Math.PI * 0.62); ctx.stroke();
  }
  ctx.restore();
}
BRNEON_EOF
echo "> Escribiendo src/games/capy/capy.css"
cat > "src/games/capy/capy.css" <<'BRNEON_EOF'
/* ===== Capy Run bajo el agua ===== */
.cy .cv { cursor: pointer; }
.cy-ctl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 14px calc(var(--sab) + 12px); flex: none; }
.cy-ctl .btn { min-height: 56px; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.cy .stat.blink b { color: var(--amber); text-shadow: 0 0 10px var(--amber); }
.cy .newbest { color: var(--amber); }
.cy .ov .row { width: min(100%, 360px); }
BRNEON_EOF
echo "> Escribiendo src/games/capy/CapyGame.tsx"
cat > "src/games/capy/CapyGame.tsx" <<'BRNEON_EOF'
// Capy Run bajo el agua: el capibara (con casco de burbuja) nada corriendo por el fondo, salta corales
// y se agacha ante las medusas. Misma jugabilidad que antes; arriba se ve la superficie y el cielo.
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';
import { drawCapybara, findCapyColor } from '../../core/capybara.ts';
import { addScore, loadScores } from '../../core/scores.ts';
import type { ScoreEntry } from '../../core/scores.ts';
import Scoreboard from '../../ui/Scoreboard.tsx';
import './capy.css';

type Overlay = 'ready' | 'play' | 'pause' | 'over';
type Lane = 'low' | 'mid' | 'high';
type Kind = 'tall' | 'short';

// sonidos: usa el primero que exista en audio.ts (así funciona con cualquier versión)
const fx = (...names: string[]) => {
  const a = sfx as unknown as Record<string, unknown>;
  for (const n of names) { const f = a[n]; if (typeof f === 'function') { try { (f as () => void).call(sfx); } catch { /* sin audio */ } return; } }
};

// ---------- física (unidades: px lógicos y frames a 60 Hz) -- igual que antes
const GRAVITY = 0.7, JUMP_V = 12, FAST_FALL = 3;
const SPEED0 = 6, SPEED_MAX = 13, ACCEL = 0.0024;
const JELLY_EXTRA = 1.4;                       // las medusas avanzan más rápido que el fondo
const LANE_LIFT: Record<Lane, number> = { low: 0, mid: 28, high: 62 };
const FLOOR = 36;                              // franja de arena bajo el suelo
const S = 52;                                  // tamaño del capibara
const OX = 40 + 0.34 * S;                      // origen de dibujo del capibara (x)
const DUCK_K = 0.6;

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Part { kind: Kind; dx: number }
interface Obstacle { kind: 'coral' | 'jelly'; x: number; lift: number; w: number; h: number; parts: Part[]; boxes: Box[]; vx: number; lane?: Lane; ph: number }
interface Bubble { x: number; y: number; r: number; vy: number; ph: number; life?: number; max?: number }

const CORAL_W = 33, CORAL_H: Record<Kind, number> = { tall: 48, short: 33 };
const JELLY_W = 36, JELLY_H = 27;
const STALK = { x0: 10, x1: 23 };              // solo el tronco hace daño; las ramas son decorativas
const JELLY_BOX: Box = { x0: 4, y0: 2, x1: 32, y1: 22 };   // la campana; los tentáculos no cuentan

function makeCoral(count: number): Obstacle {
  const order: Kind[] = count === 1 ? [Math.random() < 0.5 ? 'tall' : 'short'] : count === 2 ? ['short', 'tall'] : ['short', 'tall', 'short'];
  const parts: Part[] = [], boxes: Box[] = [];
  let dx = 0, h = 0;
  for (const kind of order) {
    const sh = CORAL_H[kind];
    parts.push({ kind, dx });
    boxes.push({ x0: dx + STALK.x0, x1: dx + STALK.x1, y0: 6, y1: sh });
    h = Math.max(h, sh); dx += 27;
  }
  return { kind: 'coral', x: 0, lift: 0, w: dx - 27 + CORAL_W, h, parts, boxes, vx: 0, ph: Math.random() * 6 };
}
function makeJelly(lane: Lane): Obstacle {
  return { kind: 'jelly', x: 0, lift: LANE_LIFT[lane], w: JELLY_W, h: JELLY_H, parts: [], boxes: [JELLY_BOX], vx: JELLY_EXTRA, lane, ph: Math.random() * 6 };
}

// ---------- color
const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b), h = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return `#${h(0)}${h(1)}${h(2)}`;
};
const jellyColor = (accent: string) => (accent === '#ff2bd6' || accent === '#9b7bff' || accent === '#ff3b6b' ? '#ffb800' : '#ff6ad5');

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const TUFTS = Array.from({ length: 60 }, () => ({ x: Math.round(rnd() * 2400), y: 4 + Math.round(rnd() * 24), w: rnd() < 0.5 ? 2 : 4 }));
const STARS = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), p: rnd() * 6 }));
const WEEDS = Array.from({ length: 10 }, (_, i) => ({ x: i * 150 + rnd() * 60, h: 36 + rnd() * 34, p: rnd() * 6 }));

function drawCoral(ctx: CanvasRenderingContext2D, kind: Kind, x: number, gy: number, t: number, ph: number) {
  const h = CORAL_H[kind], cx = x + CORAL_W / 2, col = '#ff6f61', hi = '#ffc7b8';
  const sway = Math.sin(t * 2 + ph) * 1.2;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.fillStyle = hi; ctx.shadowColor = col; ctx.shadowBlur = 9;
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx, gy + 2); ctx.lineTo(cx, gy - h + 7); ctx.stroke();
  const br: [number, number][] = kind === 'tall' ? [[0.36, -1], [0.56, 1], [0.78, -1]] : [[0.42, -1], [0.66, 1]];
  ctx.lineWidth = 6;
  const tips: [number, number][] = [[cx, gy - h + 6]];
  for (const [f, d] of br) {
    const sx = cx, sy = gy - h * f, ex = cx + d * 11 + sway * d, ey = sy - 11;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); tips.push([ex, ey]);
  }
  ctx.shadowBlur = 0;
  for (const [tx, ty] of tips) { ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, ph: number, col: string) {
  const p = Math.sin(t * 6 + ph) * 1.6;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const g = ctx.createLinearGradient(0, y, 0, y + 18);
  g.addColorStop(0, col); g.addColorStop(1, col + '55');
  ctx.shadowColor = col; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(x + 2, y + 15);
  ctx.bezierCurveTo(x + 2, y - 4 - p * 0.4, x + 34, y - 4 - p * 0.4, x + 34, y + 15);
  ctx.quadraticCurveTo(x + 26, y + 19 + p, x + 18, y + 15);
  ctx.quadraticCurveTo(x + 10, y + 19 - p, x + 2, y + 15);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 18, y + 11, 11, Math.PI * 1.15, Math.PI * 1.4); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 6;
  for (let i = 0; i < 4; i++) {
    const bx = x + 8 + i * 7;
    ctx.beginPath(); ctx.moveTo(bx, y + 17);
    ctx.bezierCurveTo(bx + Math.sin(t * 5 + i + ph) * 3, y + 21, bx - Math.sin(t * 5 + i + ph) * 3, y + 24, bx + Math.sin(t * 4 + i) * 2, y + 27);
    ctx.stroke();
  }
  ctx.restore();
}

export default function CapyGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Overlay>('ready');
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const [overlay, setOverlayState] = useState<Overlay>('ready');
  const [hud, setHud] = useState({ score: 0, best: load<number>('capyHi', 0), blink: false });
  const [newBest, setNewBest] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores('capy'));
  const [showScores, setShowScores] = useState(false);
  const accent = findCapyColor(settings.capyColor).color;

  const g = useRef({
    speed: SPEED0, dist: 0, score: 0, best: load<number>('capyHi', 0), depth: 0, depthT: 0,
    py: 0, vy: 0, duck: false, duckKey: false, duckBtn: false, onGround: true, dead: false, deadT: 0, anim: 0,
    obs: [] as Obstacle[], gap: 0, blink: 0, shake: 0,
    clouds: Array.from({ length: 5 }, (_, i) => ({ x: i * 220 + rnd() * 80, y: 6 + rnd() * 22, w: 6 + Math.floor(rnd() * 3) })),
    bubbles: Array.from({ length: 24 }, () => ({ x: rnd() * 900, y: 60 + rnd() * 240, r: 1.5 + rnd() * 3.5, vy: 0.25 + rnd() * 0.5, ph: rnd() * 6 })) as Bubble[],
    pops: [] as Bubble[],
    ground: 0, t: 0, lastShown: -1, lastShownScore: -1, view: { W: 600, H: 240, scale: 1, dpr: 1 },
  });

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };
  const reset = () => {
    const s = g.current;
    Object.assign(s, { speed: SPEED0, dist: 0, score: 0, depthT: 0, py: 0, vy: 0, duck: false, onGround: true, dead: false, deadT: 0, anim: 0,
      obs: [], gap: 420, blink: 0, shake: 0, ground: 0, lastShown: -1, lastShownScore: -1, pops: [] });
    setNewBest(false);
    setHud((h) => ({ ...h, score: 0, blink: false }));
  };
  const begin = () => { sfx.unlock(); sfx.click(); setShowScores(false); reset(); setOverlay('play'); };
  const pause = () => { if (overlayRef.current === 'play') setOverlay('pause'); };
  const resume = () => { sfx.unlock(); setOverlay('play'); };

  const jump = () => {
    const s = g.current;
    if (overlayRef.current === 'ready') { begin(); return; }
    if (overlayRef.current !== 'play' || s.dead) return;
    if (s.onGround) { s.vy = JUMP_V; s.onGround = false; s.duck = false; fx('jump', 'bounce'); }
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
        o = makeJelly(r < 0.3 ? 'low' : r < 0.78 ? 'mid' : 'high');
      } else {
        const r = Math.random(), more = Math.min(0.25, s.score / 3000);
        o = makeCoral(r < 0.5 - more ? 1 : r < 0.82 - more / 2 ? 2 : 3);
      }
      o.x = x; s.obs.push(o);
      s.gap = s.speed * 36 * (1 + Math.random() * 0.7) + 150 + (o.kind === 'jelly' ? 80 : 0) + o.w * 0.4;
    };
    const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const respawnBubble = (b: Bubble, fromRight: boolean) => {
      const { W, H } = s.view;
      b.x = fromRight ? W + 10 + Math.random() * 80 : Math.random() * W; b.y = H - FLOOR - Math.random() * 30; b.r = 1.5 + Math.random() * 3.5; b.vy = 0.25 + Math.random() * 0.5;
    };

    const die = () => {
      if (s.dead) return;
      s.dead = true; s.deadT = 0; s.shake = 10; fx('hit', 'lose');
      const feet = s.view.H - FLOOR - s.py;
      for (let i = 0; i < 16; i++) s.pops.push({ x: OX + 0.13 * S + (Math.random() - 0.5) * 30, y: feet - 0.4 * S + (Math.random() - 0.5) * 24, r: 1.5 + Math.random() * 3, vy: 0.4 + Math.random() * 0.9, ph: Math.random() * 6, life: 0, max: 40 + Math.random() * 30 });
      const final = Math.floor(s.score);
      if (final > s.best) { s.best = final; save('capyHi', final); setNewBest(true); setHud((h) => ({ ...h, best: final })); }
      if (final > 0) setScores(addScore('capy', { score: final }));
    };

    const update = () => {
      s.t += 1 / 60;
      const playing = overlayRef.current === 'play';
      const { W, H } = s.view;
      const moving = playing && !s.dead;
      s.clouds.forEach((c) => { c.x -= 0.15 + (moving ? s.speed * 0.05 : 0); if (c.x < -80) { c.x = W + 40 + rnd() * 120; c.y = 6 + rnd() * 22; } });
      s.bubbles.forEach((b) => { b.y -= b.vy; b.x -= 0.1 + (moving ? s.speed * 0.3 : 0) + Math.sin(s.t * 2 + b.ph) * 0.15; if (b.y < H * 0.17 + 6 || b.x < -12) respawnBubble(b, b.x < -12); });
      s.pops = s.pops.filter((b) => { b.life = (b.life ?? 0) + 1; b.y -= b.vy; b.x += Math.sin(s.t * 6 + b.ph) * 0.3 - (moving ? s.speed * 0.5 : 0.1); return b.life < (b.max ?? 40); });
      s.depth += (s.depthT - s.depth) * 0.01;
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
      s.depthT = Math.floor(s.score / 700) % 2 === 1 ? 1 : 0;       // cada 700 puntos "bajas" a aguas más profundas
      const hundred = Math.floor(s.score / 100);
      if (hundred > 0 && hundred !== s.lastShown) { if (s.lastShown >= 0) { fx('power'); s.blink = 45; } s.lastShown = hundred; }
      if (s.blink > 0) s.blink--;
      if (s.anim % 14 === 0) s.pops.push({ x: OX + 0.45 * S, y: H - FLOOR - s.py - 0.55 * S, r: 1.5 + Math.random() * 2, vy: 0.5 + Math.random() * 0.4, ph: Math.random() * 6, life: 0, max: 50 });

      s.duck = (s.duckKey || s.duckBtn);
      if (!s.onGround) {
        s.vy -= GRAVITY * (s.duck ? FAST_FALL : 1);
        s.py += s.vy;
        if (s.py <= 0) { s.py = 0; s.vy = 0; s.onGround = true; fx('land'); }
      }

      spawn();
      for (const o of s.obs) o.x -= s.speed + o.vx;
      s.obs = s.obs.filter((o) => o.x + o.w > -20);

      const ducking = s.duck && s.onGround;
      const feet = H - FLOOR - s.py, k = ducking ? DUCK_K : 1;
      const me: Box = { x0: OX - 0.2 * S, x1: OX + 0.44 * S, y0: feet - 0.75 * S * k, y1: feet - 1 };
      for (const o of s.obs) {
        const oTop = H - FLOOR - o.lift - o.h;
        for (const b of o.boxes) {
          if (hits(me, { x0: o.x + b.x0, x1: o.x + b.x1, y0: oTop + b.y0, y1: oTop + b.y1 })) { die(); break; }
        }
        if (s.dead) break;
      }
      const shown = Math.floor(s.score);
      if (shown !== s.lastShownScore) { s.lastShownScore = shown; setHud((h) => ({ ...h, score: shown, blink: s.blink > 0 })); }
    };

    // ------------------------------------------------ dibujo
    const bubble = (b: Bubble, a = 1) => {
      ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(b.x - b.r * 0.45, b.y - b.r * 0.5, Math.max(1, b.r * 0.3), Math.max(1, b.r * 0.3));
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const { W, H, scale, dpr } = s.view;
      const accent = findCapyColor(settingsRef.current.capyColor).color;
      const GROUND = H - FLOOR, SURF = Math.round(H * 0.17), d = s.depth, t = s.t;
      const k = scale * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

      // --- cielo (fuera del agua)
      const sky = ctx.createLinearGradient(0, 0, 0, SURF + 4);
      sky.addColorStop(0, '#0b0830'); sky.addColorStop(1, mix(accent, '#0b0830', 0.55));
      ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, SURF + 14);
      ctx.fillStyle = '#f4f1ff';
      for (const st of STARS) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + st.p); ctx.fillRect(Math.round(st.x * W), Math.round(st.y * (SURF - 10)), 2, 2); }
      ctx.globalAlpha = 1;
      ctx.shadowColor = accent; ctx.shadowBlur = 14; ctx.fillStyle = '#f4f1ff';
      ctx.beginPath(); ctx.arc(W * 0.84, SURF * 0.42, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = mix(accent, '#0b0830', 0.78);
      for (const c of s.clouds) { const x = Math.round(c.x), y = Math.round(c.y), w = c.w * 3; ctx.fillRect(x, y, w, 3); ctx.fillRect(x + 3, y - 3, w - 9, 3); ctx.fillRect(x - 3, y + 3, w + 6, 3); }

      // --- agua
      const wave = (x: number) => SURF + Math.sin((x + t * 45) * 0.06) * 1.6 + Math.sin((x - t * 30) * 0.13) * 0.8;
      const wTop = mix(mix(accent, '#04111f', 0.78), '#000000', 0.45 * d), wBot = mix(mix(accent, '#020712', 0.92), '#000000', 0.5 * d);
      const water = ctx.createLinearGradient(0, SURF, 0, H);
      water.addColorStop(0, wTop); water.addColorStop(1, wBot);
      ctx.fillStyle = water;
      ctx.beginPath(); ctx.moveTo(-10, wave(-10));
      for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, wave(x));
      ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
      // rayos de luz que bajan de la superficie
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const x0 = (i + 0.5) * W / 4 + Math.sin(t * 0.5 + i * 1.7) * 26, wd = 22 + 8 * Math.sin(t + i);
        ctx.globalAlpha = (0.05 + 0.025 * Math.sin(t * 0.8 + i)) * (1 - 0.6 * d);
        ctx.beginPath(); ctx.moveTo(x0, SURF); ctx.lineTo(x0 + wd, SURF); ctx.lineTo(x0 + wd - 70, GROUND); ctx.lineTo(x0 - 70, GROUND); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // línea de la superficie
      ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1.5; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(-10, wave(-10)); for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, wave(x)); ctx.stroke(); ctx.shadowBlur = 0;

      // --- algas lejanas
      ctx.strokeStyle = mix(accent, '#000000', 0.62); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const w of WEEDS) {
        const x = (((w.x - s.ground * 0.3) % (W + 160)) + (W + 160)) % (W + 160) - 40;
        ctx.beginPath(); ctx.moveTo(x, GROUND);
        ctx.bezierCurveTo(x + Math.sin(t * 1.5 + w.p) * 6, GROUND - w.h * 0.4, x - Math.sin(t * 1.5 + w.p) * 6, GROUND - w.h * 0.7, x + Math.sin(t * 1.3 + w.p) * 5, GROUND - w.h); ctx.stroke();
      }

      // --- burbujas del fondo
      for (const b of s.bubbles) bubble(b, 0.8);

      // --- arena
      ctx.fillStyle = mix(mix(accent, '#0d1b2e', 0.86), '#000000', 0.4 * d); ctx.fillRect(-10, GROUND, W + 20, H - GROUND + 10);
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8; ctx.fillRect(-10, GROUND, W + 20, 2); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (const tu of TUFTS) {
        const x = ((tu.x - s.ground) % 2400 + 2400) % 2400 - 100;
        if (x > W + 20) continue;
        const py = GROUND + 8 + Math.round(tu.y / 3) * 3;
        if (py > H) continue;
        ctx.fillRect(Math.round(x / 3) * 3, py, tu.w, 2);
      }

      // --- obstáculos
      const jc = jellyColor(accent);
      for (const o of s.obs) {
        if (o.kind === 'coral') for (const p of o.parts) drawCoral(ctx, p.kind, o.x + p.dx, GROUND, t, o.ph);
        else drawJelly(ctx, o.x, GROUND - o.lift - o.h, t, o.ph, jc);
      }

      // --- capibara con casco
      const ducking = s.duck && s.onGround && !s.dead;
      const feet = GROUND - s.py;
      const pose = s.dead ? 'dead' : !s.onGround ? 'jump' : 'run';
      ctx.save();
      ctx.translate(OX, feet); ctx.scale(ducking ? 1.08 : 1, ducking ? DUCK_K : 1); ctx.translate(0, -0.35 * S);
      drawCapybara(ctx, S, { glow: accent, t, blink: (t % 3.4) > 3.28, pose, step: overlayRef.current === 'play' ? s.anim * 0.55 : 0 });
      ctx.restore();

      // --- burbujitas del casco / explosión
      for (const b of s.pops) bubble(b, 1 - (b.life ?? 0) / (b.max ?? 40));
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
    <div className="game cy" style={{ ['--cyan' as string]: accent }}>
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className={'stat' + (hud.blink ? ' blink' : '')}><span>Puntos</span><b>{hud.score}</b></div>
          <div className="stat"><span>Récord</span><b>{hud.best}</b></div>
        </div>
        <button className="ibtn" onClick={() => { sfx.click(); pause(); setShowScores(true); }} aria-label="Historial de partidas">🏆</button>
        <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />
        {overlay === 'ready' && (
          <div className="ov">
            <h2 className="ov-title cyan">Capy Run</h2>
            <p className="ov-text">Corre por el fondo del mar: salta los corales y agáchate ante las medusas. Cada vez va más rápido.</p>
            <ul className="legend how">
              <li><i>☝</i> Celular: toca la pantalla para saltar y mantén «Agacharse»</li>
              <li><i>⌨</i> PC: Espacio / ↑ salta · ↓ se agacha · P pausa</li>
            </ul>
            <button className="btn cyan" onClick={begin}>¡Nadar!</button>
          </div>
        )}
        {overlay === 'pause' && !showScores && (
          <div className="ov">
            <h2 className="ov-title amber">Pausa</h2>
            <button className="btn cyan" onClick={resume}>Continuar</button>
            <button className="btn ghost" onClick={begin}>Reiniciar</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'over' && !showScores && (
          <div className="ov">
            <h2 className="ov-title pink">¡Ouch!</h2>
            <p className="ov-text">Puntos: <b>{hud.score}</b> · Récord: <b>{hud.best}</b>{newBest && <span className="newbest"> · ¡nuevo récord!</span>}</p>
            <button className="btn cyan" onClick={begin}>Reintentar</button>
            <button className="btn ghost" onClick={() => { sfx.click(); setShowScores(true); }}>Historial</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {showScores && <Scoreboard game="capy" title="Historial Capy Run" list={scores} onChange={setScores} onClose={() => setShowScores(false)} />}
      </div>
      <footer className="cy-ctl">
        <button className="btn cyan" onPointerDown={(e) => { e.preventDefault(); jump(); }} aria-label="Saltar">▲ Saltar</button>
        <button className="btn ghost" onPointerDown={(e) => { e.preventDefault(); setDuck(true, 'btn'); }} onPointerUp={() => setDuck(false, 'btn')}
          onPointerLeave={() => setDuck(false, 'btn')} onPointerCancel={() => setDuck(false, 'btn')} onContextMenu={(e) => e.preventDefault()} aria-label="Agacharse">▼ Agacharse</button>
      </footer>
    </div>
  );
}
BRNEON_EOF
echo "> Escribiendo src/ui/Skins.tsx"
cat > "src/ui/Skins.tsx" <<'BRNEON_EOF'
import { useEffect, useRef, useState } from 'react';
import { BALL_SKINS, MALLET_SKINS, PUCK_SKINS, drawBall, drawMallet, drawPuck } from '../core/skins.ts';
import type { Skin } from '../core/skins.ts';
import { CAPY_COLORS, drawCapybara } from '../core/capybara.ts';
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

type Tab = 'ball' | 'mallet' | 'puck' | 'capy';
interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void }

function Preview({ skin, kind }: { skin: Skin; kind: Tab }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000, W = c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.translate(W / 2, W / 2);
      const r = W * 0.27;
      if (kind === 'ball') drawBall(ctx, skin, r, t * 4);
      else if (kind === 'mallet') drawMallet(ctx, skin, r * 1.15, t);
      else drawPuck(ctx, skin, r * 0.9, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin, kind]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

function CapyPreview({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000, W = c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.translate(W / 2 - 14, W / 2 + 6);
      drawCapybara(ctx, W * 0.74, { glow: color, t, blink: (t % 3.2) > 3.05, step: t * 8 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

export default function Skins({ settings, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('ball');
  const [who, setWho] = useState<1 | 2>(1);
  const list = tab === 'ball' ? BALL_SKINS : tab === 'mallet' ? MALLET_SKINS : PUCK_SKINS;
  const current = tab === 'ball' ? settings.ball : tab === 'puck' ? settings.puck : who === 1 ? settings.mallet1 : settings.mallet2;
  const pick = (id: string) => {
    sfx.unlock(); sfx.click();
    if (tab === 'ball') onChange({ ball: id });
    else if (tab === 'puck') onChange({ puck: id });
    else onChange(who === 1 ? { mallet1: id } : { mallet2: id });
  };
  return (
    <main className="page scroll">
      <header className="pbar">
        <button className="ibtn" onClick={onBack} aria-label="Volver">‹</button>
        <h2>Skins</h2>
        <span className="unlocked">todas desbloqueadas</span>
      </header>
      <div className="seg big">
        <button className={tab === 'ball' ? 'on' : ''} onClick={() => setTab('ball')}>Bolita (Pool)</button>
        <button className={tab === 'mallet' ? 'on' : ''} onClick={() => setTab('mallet')}>Paleta</button>
        <button className={tab === 'puck' ? 'on' : ''} onClick={() => setTab('puck')}>Disco</button>
        <button className={tab === 'capy' ? 'on' : ''} onClick={() => setTab('capy')}>Capibara</button>
      </div>
      {tab === 'mallet' && (
        <div className="seg">
          <button className={who === 1 ? 'on' : ''} onClick={() => setWho(1)}>Jugador 1 (izq / abajo)</button>
          <button className={who === 2 ? 'on' : ''} onClick={() => setWho(2)}>Jugador 2 (der / arriba)</button>
        </div>
      )}
      {tab === 'capy' && (
        <>
          <p className="small">Color neón del juego del capibara (por defecto, azul neón).</p>
          <div className="skin-grid">
            {CAPY_COLORS.map((c) => (
              <button key={c.id} className={'skin ' + (c.id === settings.capyColor ? 'sel' : '')} aria-pressed={c.id === settings.capyColor}
                onClick={() => { sfx.unlock(); sfx.click(); onChange({ capyColor: c.id }); }}>
                <CapyPreview color={c.color} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {tab !== 'capy' && <div className="skin-grid">
        {list.map((s) => (
          <button key={s.id} className={'skin ' + (s.id === current ? 'sel' : '')} onClick={() => pick(s.id)} aria-pressed={s.id === current}>
            <Preview skin={s} kind={tab} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>}
    </main>
  );
}
BRNEON_EOF
echo "> Escribiendo src/ui/Menu.tsx"
cat > "src/ui/Menu.tsx" <<'BRNEON_EOF'
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

export type MenuTarget = 'pool' | 'hockey-setup' | 'skins' | 'lucky' | 'game2048' | 'capy';
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

function CapyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="14" fill="#0b0830" /><rect x="0" y="14" width="120" height="66" fill="#06273a" />
      <path d="M0 14 Q15 11 30 14 T60 14 T90 14 T120 14" fill="none" stroke="#e1fdff" strokeWidth="1.5" />
      <rect x="0" y="66" width="120" height="14" fill="#0d2438" /><rect x="0" y="66" width="120" height="2" fill="#19f4ff" />
      <ellipse cx="44" cy="55" rx="13" ry="9" fill="#b9854f" stroke="#19f4ff" strokeWidth="1.5" />
      <rect x="35" y="59" width="6" height="8" rx="2.5" fill="#8a5c33" /><rect x="43" y="59" width="6" height="8" rx="2.5" fill="#8a5c33" />
      <ellipse cx="54" cy="42" rx="18" ry="15" fill="#b9854f" stroke="#19f4ff" strokeWidth="1.5" />
      <rect x="64" y="40" width="11" height="12" rx="5" fill="#b9854f" /><circle cx="60" cy="38" r="2.8" fill="#2a1608" /><circle cx="60.8" cy="37" r="1" fill="#fff" />
      <circle cx="54" cy="42" r="25" fill="#ffffff14" stroke="#19f4ff" strokeWidth="2" /><path d="M36 34 Q40 24 50 20" fill="none" stroke="#ffffffcc" strokeWidth="2" />
      <circle cx="96" cy="30" r="3" fill="none" stroke="#fff" strokeOpacity=".6" /><circle cx="104" cy="44" r="2" fill="none" stroke="#fff" strokeOpacity=".6" />
      <path d="M100 66 V50 M100 56 L94 50 M100 54 L106 48" stroke="#ff6f61" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function Menu({ settings, onChange, go }: Props) {
  const nav = (n: MenuTarget) => { sfx.unlock(); sfx.click(); go(n); };
  return (
    <main className="menu scroll">
      <header className="brand">
        <h1 className="tube" aria-label="BrNeon Games">
          <span className="br">Br</span><span className="neon">Neon</span>
        </h1>
        <p className="games">Games</p>
        <p className="tag">Arcade para jugar solo, de a dos o online con amigos.</p>
      </header>
      <nav className="cabs">
        <button className="cab c-cyan" onClick={() => nav('pool')}>
          <PoolArt />
          <span className="cab-t">Neon 2048 Pool</span>
          <span className="cab-s">Parte la ficha gigante a golpes de bola. 1 jugador.</span>
        </button>
        <button className="cab c-amber" onClick={() => nav('lucky')}>
          <LuckyArt />
          <span className="cab-t">Suerte 2048</span>
          <span className="cab-s">Voltea 3 fichas "?" y suma. Contra la máquina, varios o por internet.</span>
        </button>
        <button className="cab c-lime" onClick={() => nav('game2048')}>
          <Art2048 />
          <span className="cab-t">2048</span>
          <span className="cab-s">El clásico: desliza y fusiona hasta llegar al 2048.</span>
        </button>
        <button className="cab c-violet" onClick={() => nav('capy')}>
          <CapyArt />
          <span className="cab-t">Capy Run</span>
          <span className="cab-s">Corre bajo el agua: salta corales y esquiva medusas.</span>
        </button>
        <button className="cab c-pink" onClick={() => nav('hockey-setup')}>
          <HockeyArt />
          <span className="cab-t">Air Hockey</span>
          <span className="cab-s">Contra la CPU, de a dos o por internet.</span>
        </button>
      </nav>
      <div className="foot">
        <button className="btn ghost" onClick={() => nav('skins')}>Skins</button>
        <button className="btn ghost" onClick={() => { sfx.unlock(); onChange({ sound: !settings.sound }); }}>
          Sonido: {settings.sound ? 'sí' : 'no'}
        </button>
      </div>
    </main>
  );
}
BRNEON_EOF
echo "> Escribiendo src/App.tsx"
cat > "src/App.tsx" <<'BRNEON_EOF'
import { useEffect, useState } from 'react';
import Menu from './ui/Menu.tsx';
import Skins from './ui/Skins.tsx';
import HockeySetup from './ui/HockeySetup.tsx';
import PoolGame from './games/pool/PoolGame.tsx';
import HockeyGame from './games/hockey/HockeyGame.tsx';
import LuckyGame from './games/lucky/LuckyGame.tsx';
import Game2048 from './games/g2048/Game2048.tsx';
import CapyGame from './games/capy/CapyGame.tsx';
import Online from './ui/Online.tsx';
import type { OnlineGame } from './ui/Online.tsx';
import type { Link } from './net/link.ts';
import { loadSettings, saveSettings } from './core/storage.ts';
import type { Settings } from './core/storage.ts';
import { sfx } from './core/audio.ts';

type Screen = { name: 'online'; game?: OnlineGame; code?: string } | { name: 'online-game'; game: OnlineGame; link: Link } | { name: 'menu' } | { name: 'skins' } | { name: 'pool' } | { name: 'lucky' } | { name: 'game2048' } | { name: 'capy' } | { name: 'hockey-setup' } | { name: 'hockey'; players: 1 | 2 };

// Enlace de invitación: ?sala=ABCDE&juego=hockey|lucky
function inviteFromUrl(): Screen | null {
  try {
    const q = new URLSearchParams(location.search);
    const code = q.get('sala'), game = q.get('juego');
    if (code && (game === 'hockey' || game === 'lucky')) return { name: 'online', game, code };
  } catch { /* sin URL */ }
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => inviteFromUrl() ?? { name: 'menu' });
  useEffect(() => { if (location.search) history.replaceState(null, '', location.pathname); }, []);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => { sfx.enabled = settings.sound; saveSettings(settings); }, [settings]);
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  const home = () => setScreen({ name: 'menu' });

  switch (screen.name) {
    case 'online':
      return <Online initialGame={screen.game} initialCode={screen.code} onBack={() => setScreen(screen.game === 'hockey' ? { name: 'hockey-setup' } : { name: 'lucky' })} onStart={(game, link) => setScreen({ name: 'online-game', game, link })} />;
    case 'online-game': {
      const leave = () => { screen.link.close(); setScreen(screen.game === 'hockey' ? { name: 'hockey-setup' } : { name: 'lucky' }); };
      return screen.game === 'hockey'
        ? <HockeyGame settings={settings} config={{ players: 2, online: { link: screen.link } }} onExit={leave} />
        : <LuckyGame online={{ link: screen.link }} onExit={leave} />;
    }
    case 'skins': return <Skins settings={settings} onChange={patch} onBack={home} />;
    case 'pool': return <PoolGame settings={settings} onExit={home} />;
    case 'lucky': return <LuckyGame onExit={home} onOnline={() => setScreen({ name: 'online', game: 'lucky' })} />;
    case 'game2048': return <Game2048 onExit={home} />;
    case 'capy': return <CapyGame settings={settings} onExit={home} />;
    case 'hockey-setup':
      return <HockeySetup settings={settings} onChange={patch} onBack={home} onStart={(players) => setScreen({ name: 'hockey', players })} onOnline={() => setScreen({ name: 'online', game: 'hockey' })} />;
    case 'hockey': return <HockeyGame key={screen.players} settings={settings} config={{ players: screen.players }} onExit={() => setScreen({ name: 'hockey-setup' })} />;
    default:
      return <Menu settings={settings} onChange={patch} go={(n) => setScreen({ name: n } as Screen)} />;
  }
}
BRNEON_EOF

# el arte pixel-art anterior ya no se usa (queda en el respaldo)
rm -f src/games/capy/sprites.ts

echo ""
if command -v npm >/dev/null 2>&1 && [ -d node_modules ]; then
  if npm run build >/dev/null 2>&1; then echo "OK Compilación correcta."; else echo "AVISO: la compilación falló; ejecuta 'npm run build' para ver el error."; fi
fi
echo "OK Capy Run bajo el agua listo. Prueba con:  npm run dev"
echo "   Menú -> Capy Run. Color: Skins -> Capibara. Historial: botón del trofeo dentro del juego."
