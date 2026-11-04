// Motor de Air Hockey. Campo apaisado 800x450. Jugador 0 = izquierda, jugador 1 = derecha.
export const HW = 800;
export const HH = 450;
export const GOAL = 170;           // ancho de la portería
export const MALLET_R = 36;
export const PUCK_R = 20;
const POST_R = 7;
const SUBSTEPS = 4;
const PUCK_FRICTION = 0.9935;
const WALL_E = 0.93;
const MAX_PUCK = 30;
const MAX_MALLET_SPEED = 28;
const KEY_SPEED = 12;

export type HEvent =
  | { t: 'hit'; x: number; y: number; v: number }
  | { t: 'wall'; x: number; y: number; v: number }
  | { t: 'goal'; scorer: 0 | 1 }
  | { t: 'count'; n: number }
  | { t: 'go' }
  | { t: 'over'; winner: 0 | 1 };

export interface Mallet {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;               // objetivo (táctil / mouse / IA)
  kx: number; ky: number;               // dirección de teclado -1..1
  mode: 'target' | 'keys';
  maxSpeed: number;
}
export interface Puck { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] }

export interface HockeyState {
  mallets: [Mallet, Mallet];
  puck: Puck;
  score: [number, number];
  goalsToWin: number;
  phase: 'COUNT' | 'PLAY' | 'GOAL' | 'OVER';
  timer: number;                       // frames restantes de la fase actual
  serve: 0 | 1;                        // de quién es el saque
  winner: 0 | 1 | null;
  events: HEvent[];
  lastTouch: 0 | 1 | null;
}

const newMallet = (x: number): Mallet => ({ x, y: HH / 2, vx: 0, vy: 0, tx: x, ty: HH / 2, kx: 0, ky: 0, mode: 'target', maxSpeed: MAX_MALLET_SPEED });

export function createHockey(goalsToWin = 7): HockeyState {
  const s: HockeyState = {
    mallets: [newMallet(110), newMallet(HW - 110)],
    puck: { x: HW / 2, y: HH / 2, vx: 0, vy: 0, trail: [] },
    score: [0, 0], goalsToWin, phase: 'COUNT', timer: 150, serve: Math.random() < 0.5 ? 0 : 1,
    winner: null, events: [], lastTouch: null,
  };
  placeServe(s);
  return s;
}

function placeServe(s: HockeyState) {
  s.puck.x = s.serve === 0 ? HW / 2 - 130 : HW / 2 + 130;
  s.puck.y = HH / 2; s.puck.vx = 0; s.puck.vy = 0; s.puck.trail = [];
}

/** Límites de movimiento de cada paleta (su mitad del campo) */
function bounds(i: 0 | 1) {
  return i === 0
    ? { x0: MALLET_R + 4, x1: HW / 2 - MALLET_R, y0: MALLET_R + 4, y1: HH - MALLET_R - 4 }
    : { x0: HW / 2 + MALLET_R, x1: HW - MALLET_R - 4, y0: MALLET_R + 4, y1: HH - MALLET_R - 4 };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function setTarget(s: HockeyState, i: 0 | 1, x: number, y: number) {
  const m = s.mallets[i]; m.tx = x; m.ty = y; m.mode = 'target';
}
export function setKeys(s: HockeyState, i: 0 | 1, kx: number, ky: number) {
  const m = s.mallets[i];
  if (kx !== 0 || ky !== 0) m.mode = 'keys';
  m.kx = kx; m.ky = ky;
  if (m.mode === 'keys' && kx === 0 && ky === 0) { m.tx = m.x; m.ty = m.y; }
}

function moveMallet(s: HockeyState, i: 0 | 1, dt: number) {
  const m = s.mallets[i];
  const b = bounds(i);
  const ox = m.x, oy = m.y;
  if (s.phase === 'OVER') { m.vx = m.vy = 0; return; }
  if (m.mode === 'keys') {
    const len = Math.hypot(m.kx, m.ky) || 1;
    const tvx = (m.kx / len) * KEY_SPEED * (m.kx || m.ky ? 1 : 0);
    const tvy = (m.ky / len) * KEY_SPEED * (m.kx || m.ky ? 1 : 0);
    m.vx += (tvx - m.vx) * 0.22; m.vy += (tvy - m.vy) * 0.22;
    m.x += m.vx * dt; m.y += m.vy * dt;
  } else {
    let dx = m.tx - m.x, dy = m.ty - m.y;
    dx = clamp(m.tx, b.x0, b.x1) - m.x; dy = clamp(m.ty, b.y0, b.y1) - m.y;
    const d = Math.hypot(dx, dy);
    const sp = Math.min(m.maxSpeed, d * 0.55);
    if (d > 0.01) { m.x += (dx / d) * sp * dt; m.y += (dy / d) * sp * dt; }
  }
  m.x = clamp(m.x, b.x0, b.x1); m.y = clamp(m.y, b.y0, b.y1);
  m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt;
}

function collideMallet(s: HockeyState, i: 0 | 1) {
  const m = s.mallets[i], p = s.puck;
  const dx = p.x - m.x, dy = p.y - m.y;
  const d = Math.hypot(dx, dy), min = MALLET_R + PUCK_R;
  if (d >= min) return;
  const nx = d > 0.0001 ? dx / d : (i === 0 ? 1 : -1), ny = d > 0.0001 ? dy / d : 0;
  p.x = m.x + nx * min; p.y = m.y + ny * min;
  const rvn = (p.vx - m.vx) * nx + (p.vy - m.vy) * ny;
  if (rvn < 0) {
    const e = 0.96;
    p.vx -= (1 + e) * rvn * nx; p.vy -= (1 + e) * rvn * ny;
    // un poco del movimiento de la paleta se transfiere siempre (golpe "con efecto")
    p.vx += m.vx * 0.12; p.vy += m.vy * 0.12;
    const v = Math.hypot(p.vx, p.vy);
    if (v > MAX_PUCK) { p.vx *= MAX_PUCK / v; p.vy *= MAX_PUCK / v; }
    s.lastTouch = i;
    s.events.push({ t: 'hit', x: p.x - nx * PUCK_R, y: p.y - ny * PUCK_R, v: Math.min(30, Math.abs(rvn)) });
  }
  // si el disco queda aplastado contra una pared, empuja un poco a la paleta hacia atrás
  const b = bounds(i);
  m.x = clamp(m.x, b.x0, b.x1); m.y = clamp(m.y, b.y0, b.y1);
}

function collidePost(s: HockeyState, px: number, py: number) {
  const p = s.puck;
  const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy), min = PUCK_R + POST_R;
  if (d < min && d > 0.0001) {
    const nx = dx / d, ny = dy / d;
    p.x = px + nx * min; p.y = py + ny * min;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) { p.vx -= 1.9 * vn * nx; p.vy -= 1.9 * vn * ny; s.events.push({ t: 'wall', x: px, y: py, v: Math.abs(vn) }); }
  }
}

function substep(s: HockeyState, dt: number) {
  moveMallet(s, 0, dt); moveMallet(s, 1, dt);
  if (s.phase !== 'PLAY') return;
  const p = s.puck;
  p.x += p.vx * dt; p.y += p.vy * dt;
  collideMallet(s, 0); collideMallet(s, 1);

  const g0 = HH / 2 - GOAL / 2, g1 = HH / 2 + GOAL / 2;
  // paredes superior / inferior
  if (p.y - PUCK_R < 0) { p.y = PUCK_R; if (p.vy < 0) { s.events.push({ t: 'wall', x: p.x, y: 0, v: -p.vy }); p.vy = -p.vy * WALL_E; } }
  else if (p.y + PUCK_R > HH) { p.y = HH - PUCK_R; if (p.vy > 0) { s.events.push({ t: 'wall', x: p.x, y: HH, v: p.vy }); p.vy = -p.vy * WALL_E; } }
  // postes
  for (const x of [0, HW]) for (const y of [g0, g1]) collidePost(s, x, y);
  // paredes laterales con hueco de portería
  const inGap = p.y > g0 + 2 && p.y < g1 - 2;
  if (p.x - PUCK_R < 0 && !inGap) { p.x = PUCK_R; if (p.vx < 0) { s.events.push({ t: 'wall', x: 0, y: p.y, v: -p.vx }); p.vx = -p.vx * WALL_E; } }
  if (p.x + PUCK_R > HW && !inGap) { p.x = HW - PUCK_R; if (p.vx > 0) { s.events.push({ t: 'wall', x: HW, y: p.y, v: p.vx }); p.vx = -p.vx * WALL_E; } }
  // gol: el disco cruza completamente la línea
  if (p.x + PUCK_R < -4) scored(s, 1);
  else if (p.x - PUCK_R > HW + 4) scored(s, 0);
}

function scored(s: HockeyState, who: 0 | 1) {
  s.score[who]++;
  s.events.push({ t: 'goal', scorer: who });
  s.serve = who === 0 ? 1 : 0; // saca quien recibió el gol
  s.puck.vx = 0; s.puck.vy = 0;
  if (s.score[who] >= s.goalsToWin) {
    s.phase = 'OVER'; s.winner = who; s.timer = 0;
    s.events.push({ t: 'over', winner: who });
  } else { s.phase = 'GOAL'; s.timer = 90; }
}

export function step(s: HockeyState) {
  s.puck.trail.unshift({ x: s.puck.x, y: s.puck.y });
  if (s.puck.trail.length > 10) s.puck.trail.pop();

  if (s.phase === 'COUNT' || s.phase === 'GOAL') {
    s.timer--;
    if (s.phase === 'COUNT') {
      if (s.timer > 0 && s.timer % 50 === 0) s.events.push({ t: 'count', n: s.timer / 50 });
      if (s.timer <= 0) { s.phase = 'PLAY'; s.events.push({ t: 'go' }); }
    } else if (s.timer <= 0) {
      s.phase = 'COUNT'; s.timer = 100; placeServe(s);
    }
  }
  for (let i = 0; i < SUBSTEPS; i++) substep(s, 1 / SUBSTEPS);
  if (s.phase === 'PLAY') {
    s.puck.vx *= PUCK_FRICTION; s.puck.vy *= PUCK_FRICTION;
    const v = Math.hypot(s.puck.vx, s.puck.vy);
    if (v > MAX_PUCK) { s.puck.vx *= MAX_PUCK / v; s.puck.vy *= MAX_PUCK / v; }
  }
}

export function restart(s: HockeyState) {
  s.score = [0, 0]; s.phase = 'COUNT'; s.timer = 150; s.winner = null; s.lastTouch = null;
  s.mallets[0].x = 110; s.mallets[0].y = HH / 2; s.mallets[1].x = HW - 110; s.mallets[1].y = HH / 2;
  s.mallets.forEach((m) => { m.tx = m.x; m.ty = m.y; m.vx = m.vy = 0; });
  placeServe(s);
}

// ---------------------------------------------------------------- Online (el anfitrión simula, el invitado dibuja)
/** Invitado: mueve SOLO su propia paleta con las mismas reglas que el anfitrión, para que responda sin retraso. */
export function stepOwnMallet(s: HockeyState, i: 0 | 1) {
  for (let k = 0; k < SUBSTEPS; k++) moveMallet(s, i, 1 / SUBSTEPS);
}

const PHASES = ['COUNT', 'PLAY', 'GOAL', 'OVER'] as const;
const r1 = (n: number) => Math.round(n * 10) / 10;
export interface HSnap {
  pu: [number, number, number, number];            // disco: x, y, vx, vy
  m: [[number, number, number, number], [number, number, number, number]]; // paletas: x, y, vx, vy
  sc: [number, number]; ph: number; sv: 0 | 1; w: -1 | 0 | 1;
  ev: HEvent[];                                     // eventos desde el último envío (sonidos, goles, cuenta atrás)
}
export function makeSnap(s: HockeyState, ev: HEvent[]): HSnap {
  const mm = (i: 0 | 1): [number, number, number, number] => { const m = s.mallets[i]; return [r1(m.x), r1(m.y), r1(m.vx), r1(m.vy)]; };
  return {
    pu: [r1(s.puck.x), r1(s.puck.y), r1(s.puck.vx), r1(s.puck.vy)], m: [mm(0), mm(1)],
    sc: [s.score[0], s.score[1]], ph: PHASES.indexOf(s.phase), sv: s.serve, w: s.winner === null ? -1 : s.winner, ev,
  };
}
/**
 * Aplica un snapshot. `k` = fotogramas transcurridos desde que llegó: el disco y la paleta rival se extrapolan
 * k pasos (máx. 4) para que el movimiento sea fluido entre paquetes. Con `own` la paleta propia no se toca.
 */
export function applySnap(s: HockeyState, n: HSnap, own: 0 | 1 | null, k = 0) {
  const kk = Math.min(4, k);
  s.puck.x = n.pu[0] + n.pu[2] * kk;
  s.puck.y = clamp(n.pu[1] + n.pu[3] * kk, PUCK_R, HH - PUCK_R);
  s.puck.vx = n.pu[2]; s.puck.vy = n.pu[3];
  for (const i of [0, 1] as const) {
    const m = s.mallets[i], v = n.m[i];
    if (i === own) {
      // si la paleta propia se desvió mucho de lo que ve el anfitrión (p. ej. tras un reinicio), se alinea
      if (Math.hypot(m.x - v[0], m.y - v[1]) > 150) { m.x = v[0]; m.y = v[1]; m.tx = v[0]; m.ty = v[1]; }
      continue;
    }
    const b = bounds(i);
    m.x = clamp(v[0] + v[2] * kk, b.x0, b.x1); m.y = clamp(v[1] + v[3] * kk, b.y0, b.y1); m.vx = v[2]; m.vy = v[3];
  }
  s.score[0] = n.sc[0]; s.score[1] = n.sc[1];
  s.phase = PHASES[n.ph] ?? 'PLAY'; s.serve = n.sv; s.winner = n.w === -1 ? null : n.w;
}

// ---------------------------------------------------------------- IA (jugador 1, derecha)
// Fácil = nueva (de verdad fácil). Difícil = la antigua "normal". Imposible = la antigua "difícil".
export const AI_LEVELS = {
  easy:       { speed: 5,  err: 70, react: 0.3, attack: 0.18 },
  hard:       { speed: 15, err: 18, react: 0.8, attack: 0.8 },
  impossible: { speed: 21, err: 6,  react: 1,   attack: 1 },
} as const;
export type AiLevel = keyof typeof AI_LEVELS;

let aiNoise = 0, aiNoiseT = 0;
let aiAimY = HH / 2, aiAimT = 0;
export function aiThink(s: HockeyState, level: keyof typeof AI_LEVELS, who: 0 | 1 = 1) {
  const cfg = AI_LEVELS[level];
  const m = s.mallets[who], p = s.puck;
  m.maxSpeed = cfg.speed;
  if (s.phase === 'OVER') return;
  if (--aiNoiseT <= 0) { aiNoise = (Math.random() - 0.5) * 2 * cfg.err; aiNoiseT = 25; }

  if (--aiAimT <= 0) {
    // variedad de tiro: esquinas de la portería y a veces rebote en pared
    const spread = GOAL / 2 - PUCK_R - 8;
    let y = HH / 2 + (Math.random() * 2 - 1) * spread;
    if (Math.random() < 0.35) y = Math.random() < 0.5 ? -y : 2 * HH - y;
    aiAimY = y; aiAimT = 45;
  }
  const dir = who === 1 ? -1 : 1;                         // hacia la portería rival
  const home = who === 1 ? HW - 70 : 70;
  const rivalGoalX = who === 1 ? 0 : HW;
  const onMySide = who === 1 ? p.x > HW / 2 : p.x < HW / 2;
  const towardsMe = who === 1 ? p.vx > 0.5 : p.vx < -0.5;

  // predicción: dónde cruzará el disco la línea de defensa (con rebotes en las paredes)
  const predictY = () => {
    if (!towardsMe) return p.y;
    const t = (home - p.x) / p.vx;
    let y = p.y + p.vy * Math.min(t, 60);
    const H = HH - 2 * PUCK_R;
    y = ((y - PUCK_R) % (2 * H) + 2 * H) % (2 * H);
    return (y > H ? 2 * H - y : y) + PUCK_R;
  };

  let tx = home, ty = HH / 2;
  const puckSlow = Math.hypot(p.vx, p.vy) < 6;
  const behindPuck = who === 1 ? m.x > p.x - 4 : m.x < p.x + 4;

  if (s.phase !== 'PLAY') { tx = home; ty = HH / 2; }
  else if (onMySide && (puckSlow || !towardsMe) && Math.random() < cfg.attack + 0.2) {
    // ATAQUE: ponerse detrás del disco y empujarlo hacia la portería rival
    const gx = rivalGoalX - p.x, gy = aiAimY - p.y; const gl = Math.hypot(gx, gy) || 1;
    if (behindPuck && Math.abs(m.y - p.y) < MALLET_R * 1.6) {
      tx = p.x + (gx / gl) * 60; ty = p.y + (gy / gl) * 60;         // golpe
    } else {
      tx = p.x - (gx / gl) * (MALLET_R + PUCK_R + 16);            // rodear
      ty = p.y - (gy / gl) * (MALLET_R + PUCK_R + 16);
      if (!behindPuck) ty += (m.y < p.y ? -1 : 1) * (MALLET_R + PUCK_R + 6); // esquivar por el costado
    }
  } else {
    // DEFENSA: seguir la altura prevista del disco
    tx = home + dir * (onMySide ? 40 : 0) * -1;
    ty = predictY();
  }
  const react = Math.random() < cfg.react;
  if (react) setTarget(s, who, tx, ty + aiNoise);
}
