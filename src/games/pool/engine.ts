// Motor de física de Neon 2048 Pool. Sin DOM: se puede simular en Node (tools/sim-pool.ts).

export type PowerType = 'BOMB' | 'LASER' | 'SHOTS' | 'SUPER' | 'PIXEL' | 'LAUNCH';

export interface Tile {
  id: number; x: number; y: number; vx: number; vy: number;
  r: number; value: number; spawn: number; cool: number; mega: boolean;
  bounces?: number;
  breakPending?: boolean; breakBonus?: number;
  launched?: boolean;      // ficha lanzada por el jugador (🚀): funciona como bola y rompe todo lo que toca
}
export interface Cue {
  x: number; y: number; vx: number; vy: number; r: number;
  sx: number; sy: number; rot: number; pulse: number;
  trail: { x: number; y: number }[];
}
export interface Power { id: number; x: number; y: number; type: PowerType; pulse: number; ttl: number; }

export type PoolEvent =
  | { t: 'wall'; x: number; y: number }
  | { t: 'hit'; x: number; y: number; value: number; pts: number; chain: boolean }
  | { t: 'pop'; x: number; y: number; pts: number }
  | { t: 'power'; x: number; y: number; type: PowerType }
  | { t: 'bomb'; x: number; y: number }
  | { t: 'shoot' }
  | { t: 'combo'; x: number; y: number; hits: number }
  | { t: 'pixel'; x: number; y: number; pts: number; levels: number }
  | { t: 'smash'; x: number; y: number }
  | { t: 'win' } | { t: 'lose' };

export interface PoolState {
  w: number; h: number; portrait: boolean;
  level: number; score: number; shots: number;
  tiles: Tile[]; powers: Power[]; cue: Cue;
  moving: boolean; hitsThisShot: number; frames: number;
  superActive: boolean; laserTurns: number;
  pixelTurns: number;      // turnos restantes de bola pixelada (bonus: pulveriza fichas en cascada y suma puntos)
  launchTile: number | null; // id de la ficha que el jugador puede lanzar como bola
  status: 'PLAYING' | 'WIN' | 'LOSE';
  events: PoolEvent[]; nextId: number; seed: number;
}

export const WALL = 10;
export const CUE_R = 14;
const FRICTION_CUE = 0.981;
const FRICTION_TILE = 0.972;
const STOP = 0.12;
const WALL_BOUNCE_CUE = 0.92;
const WALL_BOUNCE_TILE = 0.85;
export const TUNING = {
  CHAIN_SPEED: 1.8,   // velocidad relativa mínima para reacción en cadena ficha-ficha
  MIN_HIT_SPEED: 1.2, // golpe mínimo de la bola para romper una ficha
  LAUNCH_HIT_SPEED: 0.6, // una ficha lanzada rompe lo que toca con mucho menos impulso
  PIXEL_MULT: 2,      // multiplicador de puntos de cada rotura del efecto PIXEL
  PIXEL_TURNS: 3,     // turnos que dura el efecto PIXEL
  SHOT_SCALE: 1.5,     // multiplicador de tiros por nivel (para pruebas de balance)
};
const SUBSTEPS = 4;
export const MAX_PULL = 150;
export const MAX_POWER = 21;

export function rng(s: PoolState): number {
  let t = (s.seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const tileRadius = (v: number) => 15 + 3.1 * Math.log2(v);
const tileMass = (r: number) => 0.8 + (r - 14) / 30;

export function levelConfig(level: number): { tiles: number[]; shots: number } {
  const table: { tiles: number[]; shots: number }[] = [
    { tiles: [16], shots: 8 },
    { tiles: [32], shots: 11 },
    { tiles: [32, 16], shots: 13 },
    { tiles: [64], shots: 15 },
    { tiles: [64, 32], shots: 17 },
    { tiles: [128], shots: 19 },
    { tiles: [128, 64], shots: 21 },
    { tiles: [256], shots: 23 },
    { tiles: [256, 128], shots: 25 },
    { tiles: [512], shots: 27 },
    { tiles: [512, 256], shots: 29 },
    { tiles: [1024], shots: 31 },
    { tiles: [2048], shots: 34 },
  ];
  const cfg = level <= table.length ? table[level - 1] : { tiles: [2048, 512], shots: 38 };
  // los niveles altos tienen árboles mucho más grandes: reciben un extra de tiros (ver tools/sim-pool.ts)
  const late = level >= 8 ? 1 + Math.min(0.5, (level - 7) * 0.09) : 1;
  return { tiles: cfg.tiles, shots: Math.round(cfg.shots * TUNING.SHOT_SCALE * late) };
}

function newCue(x: number, y: number): Cue {
  return { x, y, vx: 0, vy: 0, r: CUE_R, sx: 1, sy: 1, rot: 0, pulse: 0, trail: [] };
}

export function createPool(level: number, portrait: boolean, seed = (Math.random() * 1e9) | 0): PoolState {
  const w = portrait ? 450 : 800;
  const h = portrait ? 800 : 450;
  const cfg = levelConfig(level);
  const s: PoolState = {
    w, h, portrait, level, score: 0, shots: cfg.shots,
    tiles: [], powers: [], cue: newCue(portrait ? w / 2 : 110, portrait ? h - 130 : h / 2),
    moving: false, hitsThisShot: 0, frames: 0, superActive: false, laserTurns: 0,
    pixelTurns: 0, launchTile: null,
    status: 'PLAYING', events: [], nextId: 1, seed,
  };
  const n = cfg.tiles.length;
  cfg.tiles.forEach((v, i) => {
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * 150;
    const r = tileRadius(v) * (i === 0 ? 1.12 : 1);
    const x = portrait ? w / 2 + off : w * 0.7;
    const y = portrait ? h * 0.3 : h / 2 + off;
    s.tiles.push({ id: s.nextId++, x, y, vx: 0, vy: 0, r, value: v, spawn: 0.2, cool: 0, mega: i === 0 });
  });
  spawnPower(s); spawnPower(s);
  return s;
}

export function spawnPower(s: PoolState) {
  // Todos son bonus. PIXEL (pulveriza fichas en cascada y da puntos) y LAUNCH (lanza una ficha) aparecen bastante.
  const pool: PowerType[] = ['BOMB', 'LASER', 'SHOTS', 'SUPER', 'SHOTS', 'BOMB', 'LAUNCH', 'LAUNCH', 'PIXEL', 'PIXEL'];
  for (let tries = 0; tries < 30; tries++) {
    const x = WALL + 40 + rng(s) * (s.w - 2 * WALL - 80);
    const y = WALL + 40 + rng(s) * (s.h - 2 * WALL - 80);
    const ok = Math.hypot(x - s.cue.x, y - s.cue.y) > 120 &&
      s.tiles.every((t) => Math.hypot(x - t.x, y - t.y) > t.r + 30) &&
      s.powers.every((p) => Math.hypot(x - p.x, y - p.y) > 80);
    if (ok) {
      s.powers.push({ id: s.nextId++, x, y, type: pool[Math.floor(rng(s) * pool.length)], pulse: rng(s) * 6, ttl: 1 + Math.floor(rng(s) * 3) });
      return;
    }
  }
}

export function shootTile(s: PoolState, angle: number, power01: number): boolean {
  if (s.status !== 'PLAYING' || s.moving || s.launchTile === null) return false;
  const tile = s.tiles.find((t) => t.id === s.launchTile);
  if (!tile) { s.launchTile = null; return false; }
  const p = Math.max(0.25, Math.min(1, power01)) * MAX_POWER * 0.85;
  tile.vx = Math.cos(angle) * p;
  tile.vy = Math.sin(angle) * p;
  tile.cool = 0;
  tile.launched = true;
  s.launchTile = null;
  s.moving = true;
  s.shots--;
  s.hitsThisShot = 0;
  s.frames = 0;
  s.events.push({ t: 'shoot' });
  return true;
}

export function shoot(s: PoolState, angle: number, power01: number) {
  if (s.status !== 'PLAYING' || s.moving || s.shots <= 0) return false;
  const p = Math.max(0.25, Math.min(1, power01)) * MAX_POWER;
  s.cue.vx = Math.cos(angle) * p;
  s.cue.vy = Math.sin(angle) * p;
  s.moving = true;
  s.shots--;
  s.hitsThisShot = 0;
  s.frames = 0;
  s.events.push({ t: 'shoot' });
  return true;
}

export const potential = (s: PoolState) => s.tiles.reduce((a, t) => a + (t.value - 1), 0);

function clampTile(s: PoolState, t: Tile) {
  t.x = Math.max(WALL + t.r, Math.min(s.w - WALL - t.r, t.x));
  t.y = Math.max(WALL + t.r, Math.min(s.h - WALL - t.r, t.y));
}

/**
 * Efecto PIXEL (bonus): la ficha golpeada se pulveriza en cascada, 2-3 niveles de golpe.
 * Cada rotura da puntos x2, cuenta como un golpe del combo (4 golpes = +1 tiro) y suelta fichas más pequeñas.
 */
function pixelShatter(s: PoolState, t: Tile) {
  const depth = 2 + Math.floor(rng(s) * 2);
  let level: Tile[] = [t];
  let total = 0, levels = 0;
  for (let d = 0; d < depth && level.length; d++) {
    const next: Tile[] = [];
    for (const tg of level) {
      if (!s.tiles.includes(tg) || tg.value <= 2) continue;
      if (s.tiles.length > 36) break;            // tope de fichas en mesa
      s.tiles = s.tiles.filter((o) => o !== tg);
      s.hitsThisShot++;
      const mult = 1 + Math.floor((s.hitsThisShot - 1) / 3);
      const pts = tg.value * mult * TUNING.PIXEL_MULT;
      s.score += pts; total += pts;
      s.events.push({ t: 'hit', x: tg.x, y: tg.y, value: tg.value, pts, chain: true });
      const val = tg.value / 2;
      const r2 = tileRadius(val);
      const base = rng(s) * Math.PI;
      for (let k = 0; k < 2; k++) {
        const a = base + k * Math.PI;
        const child: Tile = {
          id: s.nextId++, x: tg.x + Math.cos(a) * (r2 + 2), y: tg.y + Math.sin(a) * (r2 + 2),
          vx: tg.vx + Math.cos(a) * 2.4, vy: tg.vy + Math.sin(a) * 2.4,
          r: r2, value: val, spawn: 0.3, cool: 18, mega: false,
        };
        clampTile(s, child);
        s.tiles.push(child);
        next.push(child);
      }
    }
    if (next.length) levels++;
    level = next;
  }
  if (total > 0) s.events.push({ t: 'pixel', x: t.x, y: t.y, pts: total, levels });
}

function hitTile(s: PoolState, t: Tile, nx: number, ny: number, chain: boolean) {
  if (s.pixelTurns > 0 && t.value > 2 && s.tiles.includes(t)) { pixelShatter(s, t); return; }
  if (t.value === 2 && t.breakPending) {
    s.tiles = s.tiles.filter((o) => o !== t);
    s.hitsThisShot++;
    const pts = t.breakBonus ?? 100;
    s.score += pts;
    s.events.push({ t: 'pop', x: t.x, y: t.y, pts });
    return;
  }
  if (t.value === 2 && !t.breakPending) {
    t.breakPending = true;
    t.cool = 16;
    s.hitsThisShot++;
    const mult = 1 + Math.floor((s.hitsThisShot - 1) / 3);
    const pts = t.value * mult;
    t.breakBonus = 100 * mult;
    s.score += pts;
    t.vx += nx * 4;
    t.vy += ny * 4;
    s.events.push({ t: 'hit', x: t.x, y: t.y, value: 2, pts, chain });
    return;
  }
  if (t.value <= 2) {
    t.bounces = (t.bounces ?? 0) + 1;
    if (t.bounces <= 1) {
      // Las fichas de valor 1 conservan el rebote inicial antes de romperse.
      t.cool = 16;
      s.hitsThisShot++;
      const mult = 1 + Math.floor((s.hitsThisShot - 1) / 3);
      const pts = t.value * mult;
      s.score += pts;
      t.vx += nx * 6;
      t.vy += ny * 6;
      s.events.push({ t: 'hit', x: t.x, y: t.y, value: 2, pts, chain });
      return;
    }
    // Tras el rebote inicial, el siguiente impacto rompe la ficha de valor 1.
    s.tiles = s.tiles.filter((o) => o !== t);
    s.hitsThisShot++;
    const mult = 1 + Math.floor((s.hitsThisShot - 1) / 3);
    const pts = t.value * mult + 100;
    s.score += pts;
    s.events.push({ t: 'pop', x: t.x, y: t.y, pts });
    return;
  }
  s.tiles = s.tiles.filter((o) => o !== t);
  s.hitsThisShot++;
  const mult = 1 + Math.floor((s.hitsThisShot - 1) / 3);
  const pts = t.value * mult;
  s.score += pts;
  s.events.push({ t: 'hit', x: t.x, y: t.y, value: t.value, pts, chain });
  const sup = s.superActive && t.value >= 8;
  const n = sup ? 4 : 2;
  const val = t.value / n;
  const base = Math.atan2(ny, nx) + (sup ? Math.PI / 4 : Math.PI / 2);
  const r = tileRadius(val);
  for (let k = 0; k < n; k++) {
    const a = base + (k * Math.PI * 2) / n;
    const c: Tile = {
      id: s.nextId++, x: t.x + Math.cos(a) * (r + 3), y: t.y + Math.sin(a) * (r + 3),
      vx: t.vx + Math.cos(a) * 2.8, vy: t.vy + Math.sin(a) * 2.8,
      r, value: val, spawn: 0.4, cool: 22, mega: false,
    };
    clampTile(s, c);
    s.tiles.push(c);
  }
}

function bomb(s: PoolState, x: number, y: number) {
  s.events.push({ t: 'bomb', x, y });
  const victims = s.tiles.filter((t) => !t.launched && Math.hypot(t.x - x, t.y - y) < 130 + t.r);
  for (const t of victims) {
    if (!s.tiles.includes(t)) continue;
    const d = Math.hypot(t.x - x, t.y - y) || 1;
    hitTile(s, t, (t.x - x) / d, (t.y - y) / d, true);
  }
}

function substep(s: PoolState, dt: number): boolean {
  const c = s.cue;
  let moving = false;

  // --- bola blanca
  const sp = Math.hypot(c.vx, c.vy);
  if (sp > STOP) {
    moving = true;
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x - c.r < WALL) { c.x = WALL + c.r; c.vx = Math.abs(c.vx) * WALL_BOUNCE_CUE; s.events.push({ t: 'wall', x: c.x, y: c.y }); }
    else if (c.x + c.r > s.w - WALL) { c.x = s.w - WALL - c.r; c.vx = -Math.abs(c.vx) * WALL_BOUNCE_CUE; s.events.push({ t: 'wall', x: c.x, y: c.y }); }
    if (c.y - c.r < WALL) { c.y = WALL + c.r; c.vy = Math.abs(c.vy) * WALL_BOUNCE_CUE; s.events.push({ t: 'wall', x: c.x, y: c.y }); }
    else if (c.y + c.r > s.h - WALL) { c.y = s.h - WALL - c.r; c.vy = -Math.abs(c.vy) * WALL_BOUNCE_CUE; s.events.push({ t: 'wall', x: c.x, y: c.y }); }
  }

  // --- power-ups
  const flying = s.tiles.find((t) => t.launched);
  s.powers = s.powers.filter((p) => {
    if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + 14 || (flying && Math.hypot(flying.x - p.x, flying.y - p.y) < flying.r + 14)) {
      s.events.push({ t: 'power', x: p.x, y: p.y, type: p.type });
      if (p.type === 'SHOTS') s.shots += 3;
      else if (p.type === 'LASER') s.laserTurns += 3;
      else if (p.type === 'SUPER') s.superActive = true;
      else if (p.type === 'BOMB') bomb(s, p.x, p.y);
      else if (p.type === 'PIXEL') s.pixelTurns += TUNING.PIXEL_TURNS;  // bonus: puntos extra en cascada
      else if (p.type === 'LAUNCH') {
        // Elegir la ficha más grande como candidata a lanzar
        if (s.tiles.length > 0) {
          const biggest = s.tiles.reduce((a, b) => a.r >= b.r ? a : b);
          s.launchTile = biggest.id;
        }
      }
      return false;
    }
    return true;
  });

  // --- fichas: movimiento
  for (const t of s.tiles) {
    if (t.spawn < 1) t.spawn = Math.min(1, t.spawn + 0.05);
    if (t.cool > 0) t.cool -= dt;
    if (Math.hypot(t.vx, t.vy) > STOP) {
      moving = true;
      t.x += t.vx * dt; t.y += t.vy * dt;
      const wb = t.launched ? WALL_BOUNCE_CUE : WALL_BOUNCE_TILE;
      if (t.x - t.r < WALL) { t.x = WALL + t.r; t.vx = Math.abs(t.vx) * wb; }
      else if (t.x + t.r > s.w - WALL) { t.x = s.w - WALL - t.r; t.vx = -Math.abs(t.vx) * wb; }
      if (t.y - t.r < WALL) { t.y = WALL + t.r; t.vy = Math.abs(t.vy) * wb; }
      else if (t.y + t.r > s.h - WALL) { t.y = s.h - WALL - t.r; t.vy = -Math.abs(t.vy) * wb; }
    } else { t.vx = 0; t.vy = 0; }
  }

  // --- bola vs fichas
  for (const t of s.tiles.slice()) {
    if (!s.tiles.includes(t) || t.launched) continue;   // la ficha lanzada es "la bola": no choca con la blanca
    const dx = t.x - c.x, dy = t.y - c.y;
    const d = Math.hypot(dx, dy);
    const min = c.r + t.r;
    if (d < min && d > 0.0001) {
      const nx = dx / d, ny = dy / d;
      const rel = (c.vx - t.vx) * nx + (c.vy - t.vy) * ny;
      const over = min - d;
      const mc = 1, mt = tileMass(t.r);
      c.x -= nx * over * (mt / (mc + mt)); c.y -= ny * over * (mt / (mc + mt));
      t.x += nx * over * (mc / (mc + mt)); t.y += ny * over * (mc / (mc + mt));
      if (rel > 0) {
        const e = 0.9;
        const j = ((1 + e) * rel) / (1 / mc + 1 / mt);
        c.vx -= (j / mc) * nx; c.vy -= (j / mc) * ny;
        t.vx += (j / mt) * nx; t.vy += (j / mt) * ny;
        c.sx = 0.65; c.sy = 1.35;
        if (!t.breakPending && t.cool <= 0 && rel >= TUNING.MIN_HIT_SPEED) hitTile(s, t, nx, ny, false);
      }
    }
  }

  // --- ficha vs ficha (rebote real + reacción en cadena)
  const a = s.tiles;
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const t1 = a[i], t2 = a[j];
      const dx = t2.x - t1.x, dy = t2.y - t1.y;
      const d = Math.hypot(dx, dy);
      const min = t1.r + t2.r;
      if (d < min && d > 0.0001) {
        const nx = dx / d, ny = dy / d;
        const m1 = tileMass(t1.r), m2 = tileMass(t2.r);
        const over = min - d;
        t1.x -= nx * over * (m2 / (m1 + m2)); t1.y -= ny * over * (m2 / (m1 + m2));
        t2.x += nx * over * (m1 / (m1 + m2)); t2.y += ny * over * (m1 / (m1 + m2));
        const rel = (t1.vx - t2.vx) * nx + (t1.vy - t2.vy) * ny;
        if (rel > 0) {
          const shooter = t1.launched ? t1 : t2.launched ? t2 : null;
          const pre = shooter ? { vx: shooter.vx, vy: shooter.vy } : null;
          const j2 = ((1 + 0.8) * rel) / (1 / m1 + 1 / m2);
          t1.vx -= (j2 / m1) * nx; t1.vy -= (j2 / m1) * ny;
          t2.vx += (j2 / m2) * nx; t2.vy += (j2 / m2) * ny;
          if (rel >= (shooter ? TUNING.LAUNCH_HIT_SPEED : TUNING.CHAIN_SPEED)) {
            let target: Tile | undefined;
            if (shooter) {
              // la ficha lanzada nunca se rompe: rompe SIEMPRE a la ficha que toca
              const other = shooter === t1 ? t2 : t1;
              if (other.breakPending || other.cool <= 0) target = other;
            } else {
              const pendingTwo = [t1, t2].find((t) => t.value === 2 && t.breakPending);
              const free: Tile[] = [];
              if (t1.cool <= 0 && !t1.breakPending) free.push(t1);
              if (t2.cool <= 0 && !t2.breakPending) free.push(t2);
              // se rompe una sola ficha por choque: la más pequeña de las que estén libres
              target = pendingTwo ?? (free.length === 2 ? (t1.r <= t2.r ? t1 : t2) : free[0]);
            }
            if (target) {
              const sign = target === t2 ? 1 : -1;
              if (shooter && pre) {
                // la ficha lanzada atraviesa casi sin frenarse: mantiene el 80 % de su impulso
                shooter.vx = pre.vx * 0.8 + shooter.vx * 0.2; shooter.vy = pre.vy * 0.8 + shooter.vy * 0.2;
                s.events.push({ t: 'smash', x: target.x, y: target.y });
              }
              hitTile(s, target, nx * sign, ny * sign, true);
              return true; // la lista cambió: se retoma en el siguiente subpaso
            }
          }
        }
      }
    }
  }
  return moving;
}

export function step(s: PoolState) {
  if (s.status !== 'PLAYING') return;
  const c = s.cue;
  c.sx += (1 - c.sx) * 0.18; c.sy += (1 - c.sy) * 0.18; c.pulse += 0.08;
  s.powers.forEach((p) => (p.pulse += 0.06));

  let any = false;
  for (let i = 0; i < SUBSTEPS; i++) {
    if (substep(s, 1 / SUBSTEPS)) any = true;
  }
  const cs = Math.hypot(c.vx, c.vy);
  if (cs > STOP) {
    c.vx *= FRICTION_CUE; c.vy *= FRICTION_CUE;
    const st = Math.min(0.45, cs * 0.035);
    c.sx = 1 + st; c.sy = Math.max(0.65, 1 - st * 0.7); c.rot = Math.atan2(c.vy, c.vx);
    c.trail.unshift({ x: c.x, y: c.y }); if (c.trail.length > 8) c.trail.pop();
  } else { c.vx = 0; c.vy = 0; c.trail = []; }
  for (const t of s.tiles) {
    const friction = t.breakPending ? 0.88 : t.launched ? FRICTION_CUE : FRICTION_TILE;
    t.vx *= friction; t.vy *= friction;
  }

  s.frames++;
  const anyMoving = any || cs > STOP || s.tiles.some((t) => Math.hypot(t.vx, t.vy) > STOP || t.spawn < 1);
  if (s.moving && (!anyMoving || s.frames > 1500)) endTurn(s);
}

function endTurn(s: PoolState) {
  s.moving = false;
  s.cue.vx = s.cue.vy = 0; s.cue.trail = [];
  s.tiles.forEach((t) => { t.vx = 0; t.vy = 0; t.cool = 0; t.launched = false; });
  const broken = s.tiles.filter((t) => t.breakPending);
  for (const t of broken) {
    const pts = t.breakBonus ?? 0;
    s.score += pts;
    s.events.push({ t: 'pop', x: t.x, y: t.y, pts });
  }
  if (broken.length) s.tiles = s.tiles.filter((t) => !t.breakPending);
  if (s.laserTurns > 0) s.laserTurns--;
  if (s.pixelTurns > 0) s.pixelTurns--;
  if (s.launchTile !== null && s.tiles.every((t) => t.id !== s.launchTile)) s.launchTile = null;
  if (s.superActive && s.hitsThisShot > 0) s.superActive = false;
  if (s.hitsThisShot >= 4) {
    s.shots++;
    s.events.push({ t: 'combo', x: s.cue.x, y: s.cue.y, hits: s.hitsThisShot });
  }
  if (s.tiles.length === 0) {
    s.score += s.shots * 100;
    s.status = 'WIN';
    s.events.push({ t: 'win' });
    return;
  }
  if (s.shots <= 0) {
    s.status = 'LOSE';
    s.events.push({ t: 'lose' });
    return;
  }
  let expired = 0;
  for (const p of s.powers) p.ttl--;
  s.powers = s.powers.filter((p) => {
    if (p.ttl > 0) return true;
    expired++;
    return false;
  });
  if (expired > 0) {
    for (let i = 0; i < expired && s.powers.length < 2; i++) {
      if (rng(s) < 0.75) spawnPower(s);
    }
  } else if (s.powers.length < 2 && rng(s) < 0.6) {
    spawnPower(s);
  }
}
