// node --experimental-strip-types tools/sim-hockey.ts : prueba rápida de la IA (hard vs easy)
import { createHockey, step, aiThink } from '../src/games/hockey/engine.ts';
const lv = (process.argv[2] || 'hard') as 'easy' | 'normal' | 'hard';
const lv0 = (process.argv[3] || 'easy') as 'easy' | 'normal' | 'hard';
let w = [0, 0], frames = 0, goals = 0;
for (let g = 0; g < 20; g++) {
  const s = createHockey(7);
  let f = 0;
  while (s.phase !== 'OVER' && f++ < 60 * 60 * 8) {
    aiThink(s, lv0, 0); aiThink(s, lv, 1); step(s);
    s.events.length = 0;
  }
  if (s.winner !== null) w[s.winner]++;
  frames += f; goals += s.score[0] + s.score[1];
}
console.log(`IA izq=${lv0} vs IA der=${lv}`, w, `media ${(frames / 20 / 60).toFixed(0)}s por partido, goles ${goals / 20}`);
