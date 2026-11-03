// Capy Run: carrera pixel art bajo el agua para 1 jugador o multijugador online con fantasma del rival.
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';
import { drawCapybara, findCapyColor } from '../../core/capybara.ts';
import { addScore, loadScores } from '../../core/scores.ts';
import type { ScoreEntry } from '../../core/scores.ts';
import type { Link } from '../../net/link.ts';
import Scoreboard from '../../ui/Scoreboard.tsx';
import SkinPicker from '../../ui/SkinPicker.tsx';
import './capy.css';

type Overlay = 'ready' | 'play' | 'pause' | 'over' | 'waiting_rival';
type Lane = 'low' | 'mid' | 'high';
type Kind = 'tall' | 'short';

const fx = (...names: string[]) => {
  const a = sfx as unknown as Record<string, unknown>;
  for (const n of names) { const f = a[n]; if (typeof f === 'function') { try { (f as () => void).call(sfx); } catch { /* sin audio */ } return; } }
};

// ---------- física
const GRAVITY = 0.7, JUMP_V = 12, FAST_FALL = 3;
const SPEED0 = 6, SPEED_MAX = 13, ACCEL = 0.0024;
const JELLY_EXTRA = 1.4;
const LANE_LIFT: Record<Lane, number> = { low: 0, mid: 28, high: 62 };
const FLOOR = 36;
const S = 52;
const OX = 40 + 0.34 * S;
const DUCK_K = 0.6;

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Part { kind: Kind; dx: number }
interface Obstacle { kind: 'coral' | 'jelly'; x: number; lift: number; w: number; h: number; parts: Part[]; boxes: Box[]; vx: number; lane?: Lane; ph: number }
interface Bubble { x: number; y: number; r: number; vy: number; ph: number; life?: number; max?: number }

const CORAL_W = 33, CORAL_H: Record<Kind, number> = { tall: 48, short: 33 };
const JELLY_W = 36, JELLY_H = 27;
const STALK = { x0: 10, x1: 23 };
const JELLY_BOX: Box = { x0: 4, y0: 2, x1: 32, y1: 22 };

// Semilla pseudoaleatoria sincronizada para carreras multijugador idénticas
let seedVal = 7;
export const setCapySeed = (s: number) => { seedVal = (Math.abs(s) % 2147483646) + 1; };
const rnd = () => ((seedVal = (seedVal * 16807) % 2147483647) / 2147483647);

function makeCoral(count: number): Obstacle {
  const order: Kind[] = count === 1 ? [rnd() < 0.5 ? 'tall' : 'short'] : count === 2 ? ['short', 'tall'] : ['short', 'tall', 'short'];
  const parts: Part[] = [], boxes: Box[] = [];
  let dx = 0, h = 0;
  for (const kind of order) {
    const sh = CORAL_H[kind];
    parts.push({ kind, dx });
    boxes.push({ x0: dx + STALK.x0, x1: dx + STALK.x1, y0: 6, y1: sh });
    h = Math.max(h, sh); dx += 27;
  }
  return { kind: 'coral', x: 0, lift: 0, w: dx - 27 + CORAL_W, h, parts, boxes, vx: 0, ph: rnd() * 6 };
}
function makeJelly(lane: Lane): Obstacle {
  return { kind: 'jelly', x: 0, lift: LANE_LIFT[lane], w: JELLY_W, h: JELLY_H, parts: [], boxes: [JELLY_BOX], vx: JELLY_EXTRA, lane, ph: rnd() * 6 };
}

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b), h = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return `#${h(0)}${h(1)}${h(2)}`;
};
const jellyColor = (accent: string) => (accent === '#ff2bd6' || accent === '#9b7bff' || accent === '#ff3b6b' ? '#ffb800' : '#ff6ad5');

const TUFTS = Array.from({ length: 60 }, (_, i) => ({ x: (i * 41) % 2400, y: 4 + (i * 7) % 24, w: i % 2 === 0 ? 2 : 4 }));
const STARS = Array.from({ length: 26 }, (_, i) => ({ x: ((i * 37) % 100) / 100, y: ((i * 53) % 100) / 100, p: i }));
const WEEDS = Array.from({ length: 10 }, (_, i) => ({ x: i * 160 + 30, h: 36 + (i * 9) % 34, p: i }));

function drawCoral(ctx: CanvasRenderingContext2D, kind: Kind, x: number, gy: number, t: number, ph: number) {
  const h = CORAL_H[kind], cx = Math.round(x + CORAL_W / 2);
  const sway = Math.round(Math.sin(t * 2 + ph) * 2);
  const col = '#ff5b79', hi = '#ffa6b7', border = '#240a18';
  ctx.save();
  const tw = 8, bx = cx - tw / 2;
  ctx.fillStyle = border; ctx.fillRect(bx - 2, gy - h, tw + 4, h + 2);
  ctx.fillStyle = col; ctx.fillRect(bx, gy - h + 2, tw, h);
  ctx.fillStyle = hi; ctx.fillRect(bx + 1, gy - h + 3, 2, h - 4);

  const branches = kind === 'tall'
    ? [{ f: 0.38, d: -1, len: 12 }, { f: 0.62, d: 1, len: 10 }, { f: 0.82, d: -1, len: 8 }]
    : [{ f: 0.45, d: -1, len: 10 }, { f: 0.72, d: 1, len: 9 }];

  for (const b of branches) {
    const by = Math.round(gy - h * b.f);
    const ex = bx + (b.d > 0 ? tw : -b.len) + sway * b.d;
    ctx.fillStyle = border;
    ctx.fillRect(Math.min(bx, ex) - 1, by - 6, b.len + 2, 8);
    ctx.fillRect(ex + (b.d > 0 ? b.len - 3 : 0) - 1, by - 8, 8, 8);
    ctx.fillStyle = col;
    ctx.fillRect(Math.min(bx, ex), by - 5, b.len, 6);
    ctx.fillRect(ex + (b.d > 0 ? b.len - 2 : 1), by - 7, 6, 6);
    ctx.fillStyle = hi;
    ctx.fillRect(ex + (b.d > 0 ? b.len : 3), by - 6, 2, 2);
  }
  ctx.fillStyle = border; ctx.fillRect(bx - 2, gy - h - 4, tw + 4, 6);
  ctx.fillStyle = hi; ctx.fillRect(bx, gy - h - 3, tw, 4);
  ctx.restore();
}

function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, ph: number, col: string) {
  const jx = Math.round(x);
  const jy = Math.round(y + Math.sin(t * 5 + ph) * 3);
  ctx.save();
  ctx.fillStyle = '#100520';
  ctx.fillRect(jx + 6, jy, 20, 2);
  ctx.fillRect(jx + 2, jy + 2, 28, 2);
  ctx.fillRect(jx, jy + 4, 32, 11);
  ctx.fillRect(jx + 2, jy + 15, 28, 2);
  ctx.fillStyle = col;
  ctx.fillRect(jx + 6, jy + 2, 20, 2);
  ctx.fillRect(jx + 2, jy + 4, 28, 9);
  ctx.fillRect(jx + 4, jy + 13, 24, 2);
  ctx.fillStyle = '#ffffffdd';
  ctx.fillRect(jx + 6, jy + 3, 6, 2);
  ctx.fillRect(jx + 4, jy + 5, 4, 2);
  ctx.fillStyle = '#110520';
  ctx.fillRect(jx + 9, jy + 7, 3, 3); ctx.fillRect(jx + 20, jy + 7, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(jx + 9, jy + 7, 1, 1); ctx.fillRect(jx + 20, jy + 7, 1, 1);
  ctx.fillStyle = '#ff70a6';
  ctx.fillRect(jx + 6, jy + 10, 3, 2); ctx.fillRect(jx + 23, jy + 10, 3, 2);
  ctx.fillStyle = '#110520'; ctx.fillRect(jx + 15, jy + 10, 2, 1);
  const tentX = [jx + 4, jx + 11, jx + 18, jx + 25];
  for (let i = 0; i < 4; i++) {
    const tx = tentX[i], sw = Math.round(Math.sin(t * 6 + i * 1.5 + ph) * 2);
    ctx.fillStyle = col;
    ctx.fillRect(tx + sw, jy + 16, 3, 3);
    ctx.fillRect(tx + sw * 1.5, jy + 19, 3, 3);
    ctx.fillRect(tx + sw * 2, jy + 22, 2, 3);
  }
  ctx.restore();
}

interface Props {
  settings: Settings;
  onChange?: (p: Partial<Settings>) => void;
  onExit: () => void;
  online?: { link: Link };
  onOnline?: () => void;
}

export default function CapyGame({ settings, onChange, onExit, online, onOnline }: Props) {
  const isOnline = !!online?.link;
  const link = online?.link;

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Overlay>(isOnline ? 'ready' : 'ready');
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const [overlay, setOverlayState] = useState<Overlay>(isOnline ? 'ready' : 'ready');
  const [hud, setHud] = useState({ score: 0, best: load<number>('capyHi', 0), blink: false });
  const [newBest, setNewBest] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores('capy'));
  const [showScores, setShowScores] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const accent = findCapyColor(settings.capyColor).color;

  // Estado multijugador
  const [rivalScore, setRivalScore] = useState(0);
  const [rivalDead, setRivalDead] = useState(false);
  const [bothDead, setBothDead] = useState(false);
  const [rivalAlert, setRivalAlert] = useState<string | null>(null);
  const [rematchSent, setRematchSent] = useState(false);
  const [rivalWantsRematch, setRivalWantsRematch] = useState(false);

  const rivalRef = useRef({
    py: 0,
    duck: false,
    score: 0,
    dead: false,
    color: '#ff2bd6',
    connected: isOnline,
    rematch: false,
  });

  const g = useRef({
    speed: SPEED0, dist: 0, score: 0, best: load<number>('capyHi', 0), depth: 0, depthT: 0,
    py: 0, vy: 0, duck: false, duckKey: false, duckBtn: false, onGround: true, dead: false, deadT: 0, anim: 0,
    obs: [] as Obstacle[], gap: 0, blink: 0, shake: 0,
    clouds: Array.from({ length: 5 }, (_, i) => ({ x: i * 220 + 40, y: 6 + (i * 7) % 22, w: 6 + (i % 3) })),
    bubbles: Array.from({ length: 24 }, (_, i) => ({ x: (i * 38) % 900, y: 60 + (i * 12) % 240, r: 1.5 + (i % 4), vy: 0.25 + ((i % 3) * 0.1), ph: i })) as Bubble[],
    pops: [] as Bubble[],
    ground: 0, t: 0, lastShown: -1, lastShownScore: -1, view: { W: 600, H: 240, scale: 1, dpr: 1 },
    curSeed: 7,
  });

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };

  const reset = (seed = Math.floor(Math.random() * 1000000) + 1) => {
    const s = g.current;
    s.curSeed = seed;
    setCapySeed(seed);
    Object.assign(s, {
      speed: SPEED0, dist: 0, score: 0, depthT: 0, py: 0, vy: 0, duck: false, onGround: true, dead: false, deadT: 0, anim: 0,
      obs: [], gap: 420, blink: 0, shake: 0, ground: 0, lastShown: -1, lastShownScore: -1, pops: [],
    });
    setNewBest(false);
    setBothDead(false);
    setRematchSent(false);
    setRivalWantsRematch(false);
    setRivalDead(false);
    setRivalScore(0);
    setRivalAlert(null);
    rivalRef.current.dead = false;
    rivalRef.current.score = 0;
    rivalRef.current.rematch = false;
    setHud((h) => ({ ...h, score: 0, blink: false }));
  };

  const begin = (seed?: number) => {
    sfx.unlock(); sfx.click(); setShowScores(false);
    const chosenSeed = seed ?? (Math.floor(Math.random() * 1000000) + 1);
    reset(chosenSeed);

    if (isOnline && link) {
      if (link.role === 'host') {
        link.send({ t: 'start', seed: chosenSeed, color: accent });
      }
    }
    setOverlay('play');
  };

  const requestRematch = () => {
    sfx.click();
    setRematchSent(true);
    if (!link) return;
    link.send({ t: 'rematch' });
    if (rivalRef.current.rematch || link.role === 'host') {
      const nextSeed = Math.floor(Math.random() * 1000000) + 1;
      if (link.role === 'host') {
        link.send({ t: 'rematch_go', seed: nextSeed });
        begin(nextSeed);
      }
    }
  };

  // Red multijugador
  useEffect(() => {
    if (!link) return;

    link.onConnect(() => {
      rivalRef.current.connected = true;
      if (link.role === 'host') {
        const seed = Math.floor(Math.random() * 1000000) + 1;
        link.send({ t: 'hello', seed, color: accent });
      } else {
        link.send({ t: 'hello_guest', color: accent });
      }
    });

    link.onMessage((m) => {
      if (m.t === 'hello') {
        rivalRef.current.color = (m.color as string) || '#ff2bd6';
        link.send({ t: 'hello_ack', color: accent });
      } else if (m.t === 'hello_guest' || m.t === 'hello_ack') {
        rivalRef.current.color = (m.color as string) || '#ff2bd6';
      } else if (m.t === 'start') {
        rivalRef.current.color = (m.color as string) || '#ff2bd6';
        begin(m.seed as number);
      } else if (m.t === 'pos') {
        rivalRef.current.py = m.py as number;
        rivalRef.current.duck = !!m.duck;
        rivalRef.current.score = m.score as number;
        setRivalScore(m.score as number);
      } else if (m.t === 'dead') {
        rivalRef.current.dead = true;
        rivalRef.current.score = m.score as number;
        setRivalDead(true);
        setRivalScore(m.score as number);
        setRivalAlert(`¡Rival cayó en ${m.score} pts!`);
        fx('power');
        // Si yo ya había muerto, ahora los dos murieron
        if (g.current.dead) {
          setBothDead(true);
          setOverlay('over');
        }
      } else if (m.t === 'rematch') {
        rivalRef.current.rematch = true;
        setRivalWantsRematch(true);
        if (link.role === 'host') {
          const nextSeed = Math.floor(Math.random() * 1000000) + 1;
          link.send({ t: 'rematch_go', seed: nextSeed });
          begin(nextSeed);
        }
      } else if (m.t === 'rematch_go') {
        begin(m.seed as number);
      }
    });

    link.onClose(() => {
      rivalRef.current.connected = false;
      setRivalAlert('El rival se ha desconectado.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const pause = () => { if (!isOnline && overlayRef.current === 'play') setOverlay('pause'); };
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

    const spawn = () => {
      const { W } = s.view;
      const last = s.obs[s.obs.length - 1];
      const lastRight = last ? last.x + last.w : -Infinity;
      const x = W + 30;
      if (x - lastRight < s.gap) return;
      let o: Obstacle;
      if (s.score >= 110 && rnd() < Math.min(0.42, 0.18 + s.score / 4000)) {
        const r = rnd();
        o = makeJelly(r < 0.3 ? 'low' : r < 0.78 ? 'mid' : 'high');
      } else {
        const r = rnd(), more = Math.min(0.25, s.score / 3000);
        o = makeCoral(r < 0.5 - more ? 1 : r < 0.82 - more / 2 ? 2 : 3);
      }
      o.x = x; s.obs.push(o);
      s.gap = s.speed * 36 * (1 + rnd() * 0.7) + 150 + (o.kind === 'jelly' ? 80 : 0) + o.w * 0.4;
    };
    const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const respawnBubble = (b: Bubble, fromRight: boolean) => {
      const { W, H } = s.view;
      b.x = fromRight ? W + 10 + rnd() * 80 : rnd() * W; b.y = H - FLOOR - rnd() * 30; b.r = 1.5 + rnd() * 3.5; b.vy = 0.25 + rnd() * 0.5;
    };

    const die = () => {
      if (s.dead) return;
      s.dead = true; s.deadT = 0; s.shake = 10; fx('hit', 'lose');
      const feet = s.view.H - FLOOR - s.py;
      for (let i = 0; i < 16; i++) s.pops.push({ x: OX + 0.13 * S + (rnd() - 0.5) * 30, y: feet - 0.4 * S + (rnd() - 0.5) * 24, r: 1.5 + rnd() * 3, vy: 0.4 + rnd() * 0.9, ph: rnd() * 6, life: 0, max: 40 + rnd() * 30 });
      const final = Math.floor(s.score);
      if (final > s.best) { s.best = final; save('capyHi', final); setNewBest(true); setHud((h) => ({ ...h, best: final })); }
      if (final > 0) setScores(addScore('capy', { score: final }));

      if (isOnline && link) {
        link.send({ t: 'dead', score: final });
        if (rivalRef.current.dead) {
          // Ambos han muerto
          setBothDead(true);
          setOverlay('over');
        } else {
          // El rival sigue vivo: esperamos y observamos su fantasma
          setOverlay('waiting_rival');
        }
      }
    };

    const update = () => {
      s.t += 1 / 60;
      const playing = overlayRef.current === 'play' || overlayRef.current === 'waiting_rival';
      const { W, H } = s.view;
      const moving = (overlayRef.current === 'play') && !s.dead;
      s.clouds.forEach((c) => { c.x -= 0.15 + (moving ? s.speed * 0.05 : 0); if (c.x < -80) { c.x = W + 40 + rnd() * 120; c.y = 6 + rnd() * 22; } });
      s.bubbles.forEach((b) => { b.y -= b.vy; b.x -= 0.1 + (moving ? s.speed * 0.3 : 0) + Math.sin(s.t * 2 + b.ph) * 0.15; if (b.y < H * 0.17 + 6 || b.x < -12) respawnBubble(b, b.x < -12); });
      s.pops = s.pops.filter((b) => { b.life = (b.life ?? 0) + 1; b.y -= b.vy; b.x += Math.sin(s.t * 6 + b.ph) * 0.3 - (moving ? s.speed * 0.5 : 0.1); return b.life < (b.max ?? 40); });
      s.depth += (s.depthT - s.depth) * 0.01;

      // Envío de posición multijugador online a 20 Hz
      if (isOnline && link && s.anim % 3 === 0 && !s.dead) {
        link.send({ t: 'pos', py: Math.round(s.py), duck: s.duck, score: Math.floor(s.score), dead: s.dead });
      }

      if (s.dead) {
        s.deadT++; s.vy -= GRAVITY; s.py = Math.max(0, s.py + s.vy);
        if (s.py === 0) s.vy = 0;
        if (s.shake > 0) s.shake--;
        if (!isOnline && s.deadT === 36 && overlayRef.current === 'play') setOverlay('over');
        return;
      }
      if (!playing) return;

      s.speed = Math.min(SPEED_MAX, s.speed + ACCEL);
      s.dist += s.speed; s.score += s.speed * 0.05;
      s.ground = (s.ground + s.speed) % 2400;
      s.anim++;
      s.depthT = Math.floor(s.score / 700) % 2 === 1 ? 1 : 0;
      const hundred = Math.floor(s.score / 100);
      if (hundred > 0 && hundred !== s.lastShown) { if (s.lastShown >= 0) { fx('power'); s.blink = 45; } s.lastShown = hundred; }
      if (s.blink > 0) s.blink--;
      if (s.anim % 14 === 0) s.pops.push({ x: OX + 0.45 * S, y: H - FLOOR - s.py - 0.55 * S, r: 1.5 + rnd() * 2, vy: 0.5 + rnd() * 0.4, ph: rnd() * 6, life: 0, max: 50 });

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
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const bx = Math.round(b.x / 2) * 2, by = Math.round(b.y / 2) * 2;
      const sz = b.r > 3.2 ? 6 : 4;
      ctx.fillStyle = 'rgba(25, 244, 255, 0.75)';
      ctx.fillRect(bx - sz / 2 + 1, by - sz / 2, sz - 2, sz);
      ctx.fillRect(bx - sz / 2, by - sz / 2 + 1, sz, sz - 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - sz / 2 + 1, by - sz / 2 + 1, 1, 1);
      ctx.restore();
    };

    const draw = () => {
      const { W, H, scale, dpr } = s.view;
      const myAccent = findCapyColor(settingsRef.current.capyColor).color;
      const GROUND = H - FLOOR, SURF = Math.round(H * 0.17), d = s.depth, t = s.t;
      const k = scale * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

      // --- cielo
      const sky = ctx.createLinearGradient(0, 0, 0, SURF + 4);
      sky.addColorStop(0, '#0b0830'); sky.addColorStop(1, mix(myAccent, '#0b0830', 0.55));
      ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, SURF + 14);
      ctx.fillStyle = '#f4f1ff';
      for (const st of STARS) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + st.p); ctx.fillRect(Math.round(st.x * W / 2) * 2, Math.round(st.y * (SURF - 10) / 2) * 2, 2, 2); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4f1ff';
      const mx = Math.round(W * 0.84), my = Math.round(SURF * 0.42);
      ctx.fillRect(mx - 4, my - 6, 8, 12); ctx.fillRect(mx - 6, my - 4, 12, 8);
      ctx.fillStyle = mix(myAccent, '#0b0830', 0.78);
      for (const c of s.clouds) { const x = Math.round(c.x / 2) * 2, y = Math.round(c.y / 2) * 2, w = c.w * 3; ctx.fillRect(x, y, w, 4); ctx.fillRect(x + 4, y - 4, w - 8, 4); ctx.fillRect(x - 2, y + 4, w + 4, 4); }

      // --- agua pixelada
      const wave = (x: number) => SURF + Math.floor(Math.sin((Math.floor(x / 8) * 8 + t * 45) * 0.06) * 1.6) * 2;
      const wTop = mix(mix(myAccent, '#04111f', 0.78), '#000000', 0.45 * d), wBot = mix(mix(myAccent, '#020712', 0.92), '#000000', 0.5 * d);
      const water = ctx.createLinearGradient(0, SURF, 0, H);
      water.addColorStop(0, wTop); water.addColorStop(1, wBot);
      ctx.fillStyle = water;
      ctx.beginPath(); ctx.moveTo(-10, wave(-10));
      for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, wave(x));
      ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();

      // rayos de luz
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const x0 = Math.round(((i + 0.5) * W / 4 + Math.sin(t * 0.5 + i * 1.7) * 26) / 4) * 4, wd = 20;
        ctx.globalAlpha = (0.04 + 0.02 * Math.sin(t * 0.8 + i)) * (1 - 0.6 * d);
        ctx.fillRect(x0, SURF, wd, GROUND - SURF);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffffcc';
      for (let x = -10; x <= W + 10; x += 8) ctx.fillRect(x, wave(x), 8, 2);

      // --- algas lejanas
      ctx.fillStyle = mix(myAccent, '#021a14', 0.65);
      for (const w of WEEDS) {
        const x = Math.round(((((w.x - s.ground * 0.3) % (W + 160)) + (W + 160)) % (W + 160) - 40) / 2) * 2;
        const sw = Math.round(Math.sin(t * 1.5 + w.p) * 3);
        for (let y = 0; y < w.h; y += 6) {
          const segSway = Math.round((y / w.h) * sw);
          ctx.fillRect(x + segSway, GROUND - y - 6, 4, 6);
          if (y % 12 === 0) ctx.fillRect(x + segSway + (y % 24 === 0 ? 4 : -3), GROUND - y - 4, 3, 3);
        }
      }

      for (const b of s.bubbles) bubble(b, 0.8);

      // --- arena pixel art
      ctx.fillStyle = mix(mix(myAccent, '#0d1b2e', 0.86), '#000000', 0.4 * d); ctx.fillRect(-10, GROUND, W + 20, H - GROUND + 10);
      ctx.fillStyle = myAccent; ctx.fillRect(-10, GROUND, W + 20, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (const tu of TUFTS) {
        const x = ((tu.x - s.ground) % 2400 + 2400) % 2400 - 100;
        if (x > W + 20) continue;
        const py = GROUND + 6 + Math.round(tu.y / 4) * 4;
        if (py > H) continue;
        ctx.fillRect(Math.round(x / 4) * 4, py, tu.w * 2, 2);
      }

      // --- obstáculos
      const jc = jellyColor(myAccent);
      for (const o of s.obs) {
        if (o.kind === 'coral') for (const p of o.parts) drawCoral(ctx, p.kind, o.x + p.dx, GROUND, t, o.ph);
        else drawJelly(ctx, o.x, GROUND - o.lift - o.h, t, o.ph, jc);
      }

      // --- FANTASMA DEL RIVAL ONLINE (se dibuja detrás de nuestro capibara)
      if (isOnline && rivalRef.current.connected && !rivalRef.current.dead) {
        const rivalFeet = GROUND - rivalRef.current.py;
        const rivalDuck = rivalRef.current.duck;
        const rivalPose = rivalRef.current.py > 0 ? 'jump' : 'run';
        ctx.save();
        ctx.translate(OX - 28, rivalFeet);
        ctx.scale(rivalDuck ? 1.08 : 1, rivalDuck ? DUCK_K : 1);
        ctx.translate(0, -0.35 * S);
        drawCapybara(ctx, S, {
          glow: rivalRef.current.color,
          t,
          pose: rivalPose,
          step: s.anim * 0.55,
          ghost: true,
        });
        ctx.fillStyle = rivalRef.current.color;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RIVAL`, 0, -S * 0.65);
        ctx.restore();
      }

      // --- capibara principal del jugador
      const ducking = s.duck && s.onGround && !s.dead;
      const feet = GROUND - s.py;
      const pose = s.dead ? 'dead' : !s.onGround ? 'jump' : 'run';
      ctx.save();
      ctx.translate(OX, feet); ctx.scale(ducking ? 1.08 : 1, ducking ? DUCK_K : 1); ctx.translate(0, -0.35 * S);
      drawCapybara(ctx, S, { glow: myAccent, t, blink: (t % 3.4) > 3.28, pose, step: overlayRef.current === 'play' ? s.anim * 0.55 : 0 });
      ctx.restore();

      for (const b of s.pops) bubble(b, 1 - (b.life ?? 0) / (b.max ?? 40));
    };

    let raf = 0, last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { acc -= STEP; update(); }
      draw();
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const jumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
      const duckKey = e.code === 'ArrowDown' || e.code === 'KeyS';
      if (jumpKey || duckKey) e.preventDefault();
      if (down) {
        if (jumpKey && !e.repeat) {
          if (!isOnline && overlayRef.current === 'over' && g.current.deadT > 45) begin();
          else if (overlayRef.current === 'pause') resume();
          else jump();
        }
        if (duckKey) setDuck(true, 'key');
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (!isOnline && overlayRef.current === 'play') pause(); else if (overlayRef.current === 'pause') resume(); }
      } else if (duckKey) setDuck(false, 'key');
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => { g.current.duckKey = false; g.current.duckBtn = false; if (!isOnline) pause(); };
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
  }, [isOnline]);

  return (
    <div className="game cy" style={{ ['--cyan' as string]: accent }}>
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className={'stat' + (hud.blink ? ' blink' : '')}><span>Puntos</span><b>{hud.score}</b></div>
          {isOnline ? (
            <div className={'stat' + (rivalDead ? ' warn' : '')}>
              <span>Rival</span>
              <b>{rivalScore} {rivalDead ? '💀' : '👻'}</b>
            </div>
          ) : (
            <div className="stat"><span>Récord</span><b>{hud.best}</b></div>
          )}
        </div>
        <button className="ibtn" onClick={() => { sfx.click(); pause(); setShowSkins(true); }} aria-label="Cambiar Skin" title="Skins">🎨</button>
        {!isOnline && onOnline && (
          <button className="ibtn" onClick={() => { sfx.click(); onOnline(); }} aria-label="Jugar Online" title="Jugar Online">🌐</button>
        )}
        {!isOnline && (
          <button className="ibtn" onClick={() => { sfx.click(); pause(); setShowScores(true); }} aria-label="Historial de partidas">🏆</button>
        )}
        {!isOnline && (
          <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>
        )}
      </header>

      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />

        {rivalAlert && (
          <div className="cy-alert">{rivalAlert}</div>
        )}

        {overlay === 'ready' && !isOnline && (
          <div className="ov">
            <div className="cy-card">
              <span className="cy-badge">🐾 RETRO PIXEL RUN 🫧</span>
              <h2 className="ov-title cyan">Capy Run</h2>
              <p className="ov-text">¡Ayuda al capibara buzo! Salta los corales y sumérgete ante las medusas.</p>
              <ul className="legend cy-legend">
                <li><i>☝</i> Móvil: toca para saltar · mantén agachar</li>
                <li><i>⌨</i> Teclado: [Espacio]/[↑] salta · [↓] agacha</li>
              </ul>
              <button className="btn cyan cy-btn-main" onClick={() => begin()}>¡A nadar! 🍊</button>
              {onOnline && (
                <button className="btn pink" onClick={() => { sfx.click(); onOnline(); }}>🌐 Jugar con un amigo</button>
              )}
            </div>
          </div>
        )}

        {overlay === 'ready' && isOnline && (
          <div className="ov">
            <div className="cy-card">
              <span className="cy-badge">🌐 MULTIJUGADOR ONLINE 🫧</span>
              <h2 className="ov-title cyan">¡Duelo Capy!</h2>
              <p className="ov-text">Verás a tu rival como un <b>fantasma 👻</b> detrás de ti en vivo. ¡Gana el último en pie!</p>
              <button className="btn cyan cy-btn-main" onClick={() => begin()}>¡Empezar carrera! 🐾</button>
              <button className="btn ghost" onClick={onExit}>✕ Salir</button>
            </div>
          </div>
        )}

        {overlay === 'waiting_rival' && isOnline && (
          <div className="ov">
            <div className="cy-card">
              <span className="cy-badge">🫧 HAS CAÍDO 🥺</span>
              <h2 className="ov-title pink">Tu récord: {hud.score} pts</h2>
              <p className="ov-text">Esperando que tu rival termine la carrera...</p>
              <div className="cy-vs-board">
                <div className="cy-vs-p you"><span>TÚ</span><b>{hud.score} 💀</b></div>
                <div className="cy-vs-div">VS</div>
                <div className="cy-vs-p rival"><span>RIVAL</span><b>{rivalScore} 🏃</b></div>
              </div>
              <p className="cy-waiting">Mirando la carrera del rival en vivo...</p>
              <button className="btn ghost" onClick={onExit}>✕ Salir al menú</button>
            </div>
          </div>
        )}

        {overlay === 'pause' && !showScores && !isOnline && (
          <div className="ov">
            <div className="cy-card">
              <span className="cy-badge">☕ PAUSA 💤</span>
              <h2 className="ov-title amber">Siesta Capy</h2>
              <p className="ov-text">Descanso burbujeante... ¿listo para seguir?</p>
              <button className="btn cyan cy-btn-main" onClick={resume}>▶ Continuar</button>
              <button className="btn ghost" onClick={() => begin()}>↻ Reiniciar</button>
              <button className="btn ghost" onClick={onExit}>✕ Salir</button>
            </div>
          </div>
        )}

        {overlay === 'over' && !showScores && (
          <div className="ov">
            {isOnline ? (
              <div className="cy-card">
                <span className="cy-badge">🏁 CARRERA TERMINADA 🫧</span>
                <h2 className={`ov-title ${hud.score > rivalScore ? 'cyan' : hud.score < rivalScore ? 'pink' : 'amber'}`}>
                  {hud.score > rivalScore ? '🏆 ¡GANASTE! 🏆' : hud.score < rivalScore ? '💀 ¡RIVAL GANÓ! 💀' : '🤝 ¡EMPATE! 🤝'}
                </h2>
                <div className="cy-vs-board">
                  <div className="cy-vs-p you"><span>TÚ</span><b>{hud.score}</b></div>
                  <div className="cy-vs-div">VS</div>
                  <div className="cy-vs-p rival"><span>RIVAL</span><b>{rivalScore}</b></div>
                </div>
                <p className="ov-text">
                  {hud.score > rivalScore
                    ? '¡Nadaste más lejos que tu rival por el fondo del mar!'
                    : hud.score < rivalScore
                    ? '¡Tu rival llegó más lejos! ¿Listos para la revancha?'
                    : '¡Llegaron a la misma distancia exacta!'}
                </p>
                {rematchSent ? (
                  <p className="cy-waiting">Esperando que el rival acepte revancha...</p>
                ) : (
                  <button className="btn cyan cy-btn-main" onClick={requestRematch}>
                    ↻ Revancha {rivalWantsRematch && '⭐ ¡Rival listo!'} 🐾
                  </button>
                )}
                <button className="btn ghost" onClick={onExit}>✕ Salir al menú</button>
              </div>
            ) : (
              <div className="cy-card">
                <span className="cy-badge">🥺 ¡CHOQUE! 🫧</span>
                <h2 className="ov-title pink">¡Ouch!</h2>
                <p className="ov-text">Puntos: <b>{hud.score}</b> · Récord: <b>{hud.best}</b>{newBest && <span className="newbest"> · ¡Nuevo récord! 🎉</span>}</p>
                <button className="btn cyan cy-btn-main" onClick={() => begin()}>¡Otra vez! 🐾</button>
                <button className="btn ghost" onClick={() => { sfx.click(); setShowScores(true); }}>🏆 Récords</button>
                <button className="btn ghost" onClick={onExit}>✕ Salir</button>
              </div>
            )}
          </div>
        )}

        {showScores && <Scoreboard game="capy" title="Historial Capy Run" list={scores} onChange={setScores} onClose={() => setShowScores(false)} />}
        {showSkins && <SkinPicker kinds={['capy']} settings={settings} onChange={onChange ?? (() => {})} onClose={() => setShowSkins(false)} />}
      </div>

      <footer className="cy-ctl">
        <button className="btn cyan cy-pad-btn" onPointerDown={(e) => { e.preventDefault(); jump(); }} aria-label="Saltar">▲ SALTAR</button>
        <button className="btn ghost cy-pad-btn duck" onPointerDown={(e) => { e.preventDefault(); setDuck(true, 'btn'); }} onPointerUp={() => setDuck(false, 'btn')}
          onPointerLeave={() => setDuck(false, 'btn')} onPointerCancel={() => setDuck(false, 'btn')} onContextMenu={(e) => e.preventDefault()} aria-label="Agacharse">▼ AGACHAR</button>
      </footer>
    </div>
  );
}
