// Bot de prueba de balance: node --experimental-strip-types tools/sim-pool.ts
import { createPool, shoot, step, potential, TUNING } from '../src/games/pool/engine.ts';
import type { PoolState } from '../src/games/pool/engine.ts';

const clone = (s: PoolState): PoolState => structuredClone({ ...s, events: [] });

function runShot(s: PoolState, angle: number, power: number) {
  shoot(s, angle, power);
  let n = 0;
  while (s.moving && n++ < 2000) { step(s); s.events.length = 0; }
}

function smartShot(s: PoolState, noiseDeg: number, cands: number) {
  let best = { a: 0, p: 1, v: -1e9 };
  const base = potential(s);
  for (let i = 0; i < cands; i++) {
    const a = (i / cands) * Math.PI * 2;
    for (const p of [1, 0.7]) {
      const c = clone(s);
      runShot(c, a, p);
      const v = base - potential(c) + (c.status === 'WIN' ? 1000 : 0) + c.shots * 2 - (c.cue.x < 0 ? 0 : 0);
      if (v > best.v) best = { a, p, v };
    }
  }
  const noise = ((Math.random() - 0.5) * 2 * noiseDeg * Math.PI) / 180;
  runShot(s, best.a + noise, best.p);
}

function casualShot(s: PoolState, noiseDeg: number) {
  // jugador casual: apunta a la ficha más grande/cercana con error de puntería
  const c = s.cue;
  const t = s.tiles.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
  const a = Math.atan2(t.y - c.y, t.x - c.x) + ((Math.random() - 0.5) * 2 * noiseDeg * Math.PI) / 180;
  runShot(s, a, 0.75 + Math.random() * 0.25);
}
function randomShot(s: PoolState) { runShot(s, Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.4); }

function playLevel(level: number, mode: 'smart' | 'random' | 'casual', noise: number) {
  const s = createPool(level, false, (Math.random() * 1e9) | 0);
  const start = s.shots;
  let guard = 0;
  while (s.status === 'PLAYING' && guard++ < 80) {
    if (mode === 'smart') smartShot(s, noise, 48); else if (mode === 'casual') casualShot(s, noise); else randomShot(s);
  }
  return { win: s.status === 'WIN', used: start + (guard - 1 - start) , shotsLeft: s.shots, turns: guard };
}

if (process.env.CHAIN) TUNING.CHAIN_SPEED = Number(process.env.CHAIN);
if (process.env.SCALE) TUNING.SHOT_SCALE = Number(process.env.SCALE);
if (process.env.MINHIT) TUNING.MIN_HIT_SPEED = Number(process.env.MINHIT);
const N = Number(process.argv[2] || 20);
const mode = (process.argv[3] || 'smart') as 'smart' | 'random' | 'casual';
const noise = Number(process.argv[4] || 2);
const maxLevel = Number(process.argv[5] || 13);
console.log(`mode=${mode} noise=${noise}° N=${N} CHAIN=${TUNING.CHAIN_SPEED} scale=${TUNING.SHOT_SCALE}`);
for (let lvl = 1; lvl <= maxLevel; lvl++) {
  let wins = 0, turns = 0, left = 0;
  for (let i = 0; i < N; i++) { const r = playLevel(lvl, mode, noise); if (r.win) { wins++; turns += r.turns; left += r.shotsLeft; } }
  const cfg = createPool(lvl, false).shots;
  console.log(`L${String(lvl).padStart(2)} shots=${String(cfg).padStart(2)} win=${String(Math.round((wins / N) * 100)).padStart(3)}%  avgTurnsToWin=${wins ? (turns / wins).toFixed(1) : '-'}  avgShotsLeft=${wins ? (left / wins).toFixed(1) : '-'}`);
}
