import { useEffect, useRef, useState } from 'react';
import { canMove, move, newGame, N } from './engine.ts';
import type { Board, Dir, T } from './engine.ts';
import { tileTheme } from '../../core/tiles.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
interface Snap { tiles: T[]; score: number; nextId: number }

export default function Game2048({ onExit }: { onExit: () => void }) {
  const [board, setBoard] = useState<Board>(() => newGame());
  const boardRef = useRef(board);
  const prev = useRef<Snap | null>(null);
  const [best, setBest] = useState(() => load('g2048Best', 0));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const [floats, setFloats] = useState<{ id: number; v: number }[]>([]);
  const wonRef = useRef(false), keepRef = useRef(false), overRef = useRef(false);
  const playRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<(d: Dir) => void>(() => {});

  const commit = (b: Board) => { boardRef.current = b; setBoard(b); };

  const apply = (dir: Dir) => {
    if (overRef.current || (wonRef.current && !keepRef.current)) return;
    const cur = boardRef.current;
    const res = move(cur, dir);
    if (!res.moved) return;
    prev.current = { tiles: cur.tiles.filter((t) => !t.ghost).map((t) => ({ ...t })), score: cur.score, nextId: cur.nextId };
    commit(res.board);
    if (res.gained > 0) {
      sfx.split(res.maxMerged);
      const id = Date.now() + Math.random();
      setFloats((f) => [...f, { id, v: res.gained }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 800);
    } else sfx.bounce();
    if (res.board.score > best) { setBest(res.board.score); save('g2048Best', res.board.score); }
    if (res.maxMerged >= 2048 && !wonRef.current) { wonRef.current = true; setTimeout(() => { setWon(true); sfx.win(); }, 300); }
    if (!canMove(res.board.tiles)) { overRef.current = true; setTimeout(() => { setOver(true); sfx.lose(); }, 450); }
    setTimeout(() => commit({ ...boardRef.current, tiles: boardRef.current.tiles.filter((t) => !t.ghost) }), 170);
  };
  applyRef.current = apply;

  const restart = () => {
    sfx.click(); prev.current = null;
    wonRef.current = false; keepRef.current = false; overRef.current = false;
    setWon(false); setKeepGoing(false); setOver(false);
    commit(newGame());
  };
  const undo = () => {
    const p = prev.current; if (!p) return;
    sfx.click(); prev.current = null; overRef.current = false; setOver(false);
    commit({ tiles: p.tiles, score: p.score, nextId: p.nextId + 1000 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEYS[e.code];
      if (d) { e.preventDefault(); applyRef.current(d); }
      else if (e.code === 'KeyZ') undo();
    };
    window.addEventListener('keydown', onKey);
    // deslizar con el dedo / mouse
    const el = playRef.current!;
    let start: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { if (!start) start = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
    const up = (e: PointerEvent) => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      applyRef.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    const cancel = () => { start = null; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className="stat score-stat"><span>Puntos</span><b>{board.score}</b>
            {floats.map((f) => <i key={f.id} className="plus">+{f.v}</i>)}
          </div>
          <div className="stat"><span>Mejor</span><b>{best}</b></div>
        </div>
        <button className="ibtn" onClick={undo} disabled={!prev.current} aria-label="Deshacer">↶</button>
        <button className="ibtn" onClick={restart} aria-label="Nueva partida">↻</button>
      </header>
      <div className="play" ref={playRef}>
        <div className="b2048">
          <div className="cells">{Array.from({ length: N * N }, (_, i) => <div key={i} className="cell" />)}</div>
          {board.tiles.map((t) => {
            const th = tileTheme(t.v);
            const d = String(t.v).length;
            return (
              <div key={t.id} className="tpos" style={{ transform: `translate(${t.c * 100}%, ${t.r * 100}%)` }}>
                <div className={`tile d${d}${t.fresh ? ' fresh' : ''}${t.merged ? ' merged' : ''}${t.ghost ? ' ghost' : ''}`}
                  style={{ background: th.bg, borderColor: th.border, color: th.text, boxShadow: `0 0 ${t.v >= 128 ? 22 : 10}px ${th.bg}99` }}>
                  {t.v}
                </div>
              </div>
            );
          })}
          {won && !keepGoing && (
            <div className="ov inb">
              <h2 className="ov-title amber">¡Llegaste al 2048!</h2>
              <button className="btn cyan" onClick={() => { sfx.click(); keepRef.current = true; setKeepGoing(true); }}>Seguir jugando</button>
              <button className="btn ghost" onClick={restart}>Nueva partida</button>
            </div>
          )}
          {over && (
            <div className="ov inb">
              <h2 className="ov-title pink">Sin movimientos</h2>
              <p className="ov-text">Puntos: {board.score}</p>
              <button className="btn pink" onClick={restart}>Reintentar</button>
              <button className="btn ghost" onClick={onExit}>Menú</button>
            </div>
          )}
        </div>
        <p className="hint">Desliza el dedo · o usa flechas / WASD · Z deshace</p>
      </div>
    </div>
  );
}
