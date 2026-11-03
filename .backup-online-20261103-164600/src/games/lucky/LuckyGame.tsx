import { useEffect, useMemo, useRef, useState } from 'react';
import { tileTheme } from '../../core/tiles.ts';
import { sfx } from '../../core/audio.ts';

const COLORS = ['#19f4ff', '#ff2bd6', '#ffb800', '#b6ff2e', '#9b7bff', '#ff6a3d', '#f1edff', '#38ff9c', '#ff5d8f', '#7fd8ff'];
const VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const WEIGHTS = [30, 24, 16, 11, 7, 5, 3.5, 2, 1.2, 0.7, 0.4];
const SIZE = 25, PICKS = 3;

function randValue() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < VALUES.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return VALUES[i]; }
  return 2;
}
const deal = () => Array.from({ length: SIZE }, randValue);

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const f = (n: number) => { const k = Math.min(1, (n - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div>
        <button className="ibtn" disabled={value <= min} onClick={() => { sfx.click(); onChange(value - 1); }} aria-label={`Menos ${label}`}>−</button>
        <b>{value}</b>
        <button className="ibtn" disabled={value >= max} onClick={() => { sfx.click(); onChange(value + 1); }} aria-label={`Más ${label}`}>+</button>
      </div>
    </div>
  );
}

function Result({ sum, trio, color, last, onNext }: { sum: number; trio: boolean; color: string; last: boolean; onNext: () => void }) {
  const shown = useCountUp(sum * (trio ? 2 : 1));
  return (
    <div className="lresult" style={{ borderColor: color }}>
      <div className="lsum">
        <span>Suma {sum}{trio && <em> · ¡trío! x2</em>}</span>
        <b style={{ color }}>{shown}</b>
      </div>
      <button className="btn cyan" onClick={onNext}>{last ? 'Ver resultado' : 'Siguiente turno'}</button>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 44 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 1.2, s: 0.8 + Math.random() * 1.4, c: COLORS[i % COLORS.length], r: Math.random() * 360 })), []);
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b) => <span key={b.i} style={{ left: b.x + '%', background: b.c, animationDelay: b.d + 's', animationDuration: 2.2 + b.s + 's', transform: `rotate(${b.r}deg)` }} />)}
    </div>
  );
}

export default function LuckyGame({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<'cpu' | 'multi'>('cpu');
  const [count, setCount] = useState(3);
  const [rounds, setRounds] = useState(1);

  const [phase, setPhase] = useState<'setup' | 'turn' | 'final'>('setup');
  const [names, setNames] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [cur, setCur] = useState(0);
  const [values, setValues] = useState<number[]>(deal);
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState<null | { sum: number; trio: boolean }>(null);
  const [dealKey, setDealKey] = useState(0);
  const cfgRounds = useRef(1);

  const isCpu = mode === 'cpu' && cur === 1;
  const color = COLORS[cur % COLORS.length];

  const startGame = () => {
    sfx.unlock(); sfx.click();
    const n = mode === 'cpu' ? 2 : count;
    setNames(mode === 'cpu' ? ['Jugador 1', 'Máquina'] : Array.from({ length: n }, (_, i) => `Jugador ${i + 1}`));
    setScores(Array(n).fill(0)); cfgRounds.current = rounds;
    setRound(0); setCur(0); newDeal(); setPhase('turn');
  };
  const newDeal = () => { setValues(deal()); setPicked([]); setDone(null); setDealKey((k) => k + 1); };

  const pick = (i: number) => {
    if (done || isCpu || picked.length >= PICKS || picked.includes(i)) return;
    sfx.power(); setPicked((p) => [...p, i]);
  };

  // la máquina elige sola
  useEffect(() => {
    if (phase !== 'turn' || !isCpu || done || picked.length >= PICKS) return;
    const t = setTimeout(() => {
      setPicked((p) => {
        const free = values.map((_, i) => i).filter((i) => !p.includes(i));
        sfx.power();
        return [...p, free[Math.floor(Math.random() * free.length)]];
      });
    }, picked.length === 0 ? 900 : 750);
    return () => clearTimeout(t);
  }, [phase, isCpu, done, picked.length, values, dealKey]);

  // al voltear la tercera: se suman
  useEffect(() => {
    if (phase !== 'turn' || picked.length !== PICKS || done) return;
    const t = setTimeout(() => {
      const vs = picked.map((i) => values[i]);
      const sum = vs.reduce((a, b) => a + b, 0);
      const trio = vs[0] === vs[1] && vs[1] === vs[2];
      setDone({ sum, trio });
      setScores((s) => s.map((x, i) => (i === cur ? x + sum * (trio ? 2 : 1) : x)));
      if (trio || sum >= 1000) sfx.combo(); else sfx.pop();
    }, 750);
    return () => clearTimeout(t);
  }, [phase, picked.length, done, picked, values, cur]);

  const lastTurn = round === cfgRounds.current - 1 && cur === names.length - 1;
  const next = () => {
    sfx.click();
    if (lastTurn) { setPhase('final'); sfx.win(); return; }
    if (cur + 1 < names.length) setCur(cur + 1); else { setRound(round + 1); setCur(0); }
    newDeal();
  };

  const top = scores.length ? Math.max(...scores) : 0;
  const winners = names.filter((_, i) => scores[i] === top);

  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats"><b className="ltitle">Suerte 2048</b></div>
        {phase !== 'setup' && <button className="ibtn" onClick={() => { sfx.click(); setPhase('setup'); }} aria-label="Ajustes">⚙</button>}
      </header>

      {phase === 'setup' && (
        <main className="page scroll lsetup">
          <section className="panel">
            <h3>Voltea 3 fichas y suma</h3>
            <p>Todas las fichas están ocultas con un <b>?</b>. En tu turno tocas 3: se voltean y se suman. Si las 3 son iguales, el puntaje se duplica. Gana quien más puntos junte, solo por suerte.</p>
          </section>
          <section className="panel">
            <h3>Modo</h3>
            <div className="seg">
              <button className={mode === 'cpu' ? 'on' : ''} onClick={() => setMode('cpu')}>Contra la máquina</button>
              <button className={mode === 'multi' ? 'on' : ''} onClick={() => setMode('multi')}>Varios jugadores</button>
            </div>
            {mode === 'multi' && <Stepper label="Jugadores" value={count} min={2} max={10} onChange={setCount} />}
            <Stepper label="Rondas" value={rounds} min={1} max={5} onChange={setRounds} />
          </section>
          <button className="btn cyan big" onClick={startGame}>Empezar</button>
        </main>
      )}

      {phase === 'turn' && (
        <div className="lplay">
          <div className="chips">
            {names.map((n, i) => (
              <div key={i} className={'pchip' + (i === cur ? ' on' : '')} style={{ ['--pc' as string]: COLORS[i % COLORS.length] }}>
                <span>{n}</span><b>{scores[i]}</b>
              </div>
            ))}
          </div>
          <div className="lmain">
            <div className="lturn" style={{ color }} key={'t' + dealKey}>
              {isCpu ? 'La máquina está eligiendo…' : `Turno de ${names[cur]}`}
              <small>Ronda {round + 1} de {cfgRounds.current} · fichas {picked.length}/{PICKS}</small>
            </div>
            <div className="lboard" key={dealKey}>
              {values.map((v, i) => {
                const idx = picked.indexOf(i);
                const flipped = idx >= 0;
                const th = tileTheme(v);
                const reveal = flipped || !!done;
                return (
                  <button key={i} className={'ltile' + (reveal ? ' flip' : '') + (reveal && !flipped ? ' dim' : '')}
                    style={{ ['--i' as string]: i, ['--rev' as string]: `${reveal && !flipped ? 0.04 * i : 0}s` }}
                    onClick={() => pick(i)} disabled={flipped || !!done || isCpu} aria-label={flipped ? `Ficha ${v}` : 'Ficha oculta'}>
                    <span className="face front">?</span>
                    <span className={'face back d' + String(v).length} style={{ background: th.bg, borderColor: th.border, color: th.text, boxShadow: flipped ? `0 0 18px ${th.bg}` : 'none' }}>{v}</span>
                  </button>
                );
              })}
            </div>
            {done ? <Result key={'r' + dealKey} sum={done.sum} trio={done.trio} color={color} last={lastTurn} onNext={next} />
              : <p className="hint">{isCpu ? 'Mira cómo elige…' : 'Toca 3 fichas'}</p>}
          </div>
        </div>
      )}

      {phase === 'final' && (
        <main className="page scroll lfinal">
          <Confetti />
          <h2 className="winner">
            {winners.length === 1 ? `${winners[0]} ha ganado con ${top} puntos` : `Empate entre ${winners.join(' y ')} con ${top} puntos`}
          </h2>
          <ol className="rank">
            {names.map((n, i) => ({ n, s: scores[i], i })).sort((a, b) => b.s - a.s).map((p, k) => (
              <li key={p.i} className={p.s === top ? 'top' : ''} style={{ ['--pc' as string]: COLORS[p.i % COLORS.length], ['--w' as string]: `${top ? (p.s / top) * 100 : 0}%`, animationDelay: `${k * 0.12}s` }}>
                <span className="rn">{p.n}</span><i className="bar" /><b>{p.s}</b>
              </li>
            ))}
          </ol>
          <div className="row">
            <button className="btn cyan" onClick={startGame}>Jugar otra vez</button>
            <button className="btn ghost" onClick={() => setPhase('setup')}>Cambiar ajustes</button>
          </div>
          <button className="btn ghost" onClick={onExit}>Menú</button>
        </main>
      )}
    </div>
  );
}
