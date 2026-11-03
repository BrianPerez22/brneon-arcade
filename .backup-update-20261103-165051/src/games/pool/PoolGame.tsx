import { useCallback, useEffect, useRef, useState } from 'react';
import { createPool, shoot, step, WALL, MAX_PULL, levelConfig } from './engine.ts';
import type { PoolState, PoolEvent, PowerType } from './engine.ts';
import { applyView, fitCanvas, toLogical } from '../../core/view.ts';
import type { View } from '../../core/view.ts';
import { drawBall, BALL_SKINS, findSkin } from '../../core/skins.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';

const TILE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  2048: { bg: '#ff0055', border: '#ff66aa', text: '#ffffff' },
  1024: { bg: '#9900ff', border: '#cc66ff', text: '#ffffff' },
  512: { bg: '#0044ff', border: '#6699ff', text: '#ffffff' },
  256: { bg: '#00e5ff', border: '#99f5ff', text: '#001020' },
  128: { bg: '#00ff66', border: '#80ffb3', text: '#002010' },
  64: { bg: '#ccff00', border: '#e6ff80', text: '#203000' },
  32: { bg: '#ffea00', border: '#fff580', text: '#302800' },
  16: { bg: '#ff8800', border: '#ffbb66', text: '#ffffff' },
  8: { bg: '#ff3300', border: '#ff8866', text: '#ffffff' },
  4: { bg: '#ff00aa', border: '#ff80d5', text: '#ffffff' },
  2: { bg: '#00ffcc', border: '#99ffe6', text: '#00332a' },
};
const POWER_STYLE: Record<PowerType, { color: string; label: string; text: string }> = {
  BOMB: { color: '#ff0055', label: 'B', text: '¡BOMBA!' },
  SHOTS: { color: '#00ffcc', label: '+3', text: '+3 TIROS' },
  LASER: { color: '#ffea00', label: 'L', text: 'LÁSER x3' },
  SUPER: { color: '#ff00aa', label: 'x4', text: 'SUPER SPLIT' },
};
const FONT = `'Press Start 2P', ui-monospace, monospace`;

interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; max: number }
interface FText { x: number; y: number; text: string; color: string; life: number }
type Overlay = 'intro' | 'play' | 'win' | 'lose';

function aimPath(s: PoolState, ang: number, bounces: number) {
  const r = s.cue.r;
  const pts = [{ x: s.cue.x, y: s.cue.y }];
  let x = s.cue.x, y = s.cue.y, dx = Math.cos(ang), dy = Math.sin(ang);
  let hit = false;
  for (let b = 0; b <= bounces; b++) {
    let twx = Infinity, twy = Infinity;
    if (dx > 0) twx = (s.w - WALL - r - x) / dx; else if (dx < 0) twx = (WALL + r - x) / dx;
    if (dy > 0) twy = (s.h - WALL - r - y) / dy; else if (dy < 0) twy = (WALL + r - y) / dy;
    const tw = Math.min(twx, twy);
    let tt = Infinity;
    for (const t of s.tiles) {
      const fx = x - t.x, fy = y - t.y, R = t.r + r;
      const bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - R * R, disc = bq * bq - cq;
      if (disc >= 0) { const th = -bq - Math.sqrt(disc); if (th >= 0 && th < tt) tt = th; }
    }
    if (tt < tw) { x += dx * tt; y += dy * tt; pts.push({ x, y }); hit = true; break; }
    x += dx * tw; y += dy * tw; pts.push({ x, y });
    if (twx < twy) dx = -dx; else dy = -dy;
  }
  return { pts, hit };
}

export default function PoolGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const stateRef = useRef<PoolState>(createPool(1, false));
  const overlayRef = useRef<Overlay>('intro');
  const particles = useRef<Particle[]>([]);
  const texts = useRef<FText[]>([]);
  const shake = useRef(0);
  const carry = useRef(0);
  const drag = useRef<{ id: number; sx: number; sy: number; cx: number; cy: number } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [overlay, setOverlayState] = useState<Overlay>('intro');
  const [maxLevel, setMaxLevel] = useState(() => load('poolMaxLevel', 1));
  const [selLevel, setSelLevel] = useState(() => load('poolMaxLevel', 1));
  const [hi, setHi] = useState(() => load('poolHi', 0));
  const [hud, setHud] = useState({ level: 1, score: 0, shots: 0, laser: 0, sup: false });
  const hiRef = useRef(hi);

  const setOverlay = useCallback((o: Overlay) => { overlayRef.current = o; setOverlayState(o); }, []);

  const startLevel = useCallback((lvl: number, keepScore: boolean) => {
    const s = createPool(lvl, false);
    if (keepScore) s.score = carry.current; else { carry.current = 0; }
    stateRef.current = s;
    particles.current = []; texts.current = []; drag.current = null;
    setOverlay('play');
  }, [setOverlay]);

  // -------- efectos visuales / sonido a partir de los eventos del motor
  const burst = (x: number, y: number, color: string, n = 18) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 5 + 1;
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, size: Math.floor(Math.random() * 3) + 3, life: 0, max: Math.random() * 20 + 15 });
    }
  };
  const ftext = (x: number, y: number, text: string, color: string) => texts.current.push({ x, y, text, color, life: 0 });

  const handleEvents = (s: PoolState, evs: PoolEvent[]) => {
    for (const e of evs) {
      switch (e.t) {
        case 'shoot': sfx.shoot(); break;
        case 'wall': sfx.bounce(); s.cue.sx = 0.7; s.cue.sy = 1.3; break;
        case 'hit': {
          sfx.split(e.value);
          burst(e.x, e.y, (TILE_COLORS[e.value] ?? TILE_COLORS[2]).bg, 16);
          ftext(e.x, e.y, `+${e.pts}`, e.chain ? '#ffffff' : (TILE_COLORS[e.value] ?? TILE_COLORS[2]).bg);
          if (e.value >= 64) shake.current = Math.max(shake.current, 4);
          break;
        }
        case 'pop': sfx.pop(); burst(e.x, e.y, '#ffffff', 22); ftext(e.x, e.y, `POP +${e.pts}`, '#00ffcc'); break;
        case 'power': sfx.power(); burst(e.x, e.y, POWER_STYLE[e.type].color, 20); ftext(e.x, e.y - 10, POWER_STYLE[e.type].text, POWER_STYLE[e.type].color); break;
        case 'bomb': sfx.bomb(); burst(e.x, e.y, '#ff0055', 40); burst(e.x, e.y, '#ffea00', 24); shake.current = 12; break;
        case 'combo': sfx.combo(); ftext(e.x, e.y - 30, `COMBO x${e.hits}  +1 TIRO`, '#ffea00'); break;
        case 'win': sfx.win(); break;
        case 'lose': sfx.lose(); break;
      }
    }
  };

  // -------- bucle principal
  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const refit = () => { viewRef.current = fitCanvas(canvas, box, 800, 450); };
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(box);
    window.addEventListener('orientationchange', refit);

    let raf = 0, last = performance.now(), acc = 0, t = 0;
    const STEP = 1000 / 60;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      const s = stateRef.current;
      while (acc >= STEP) {
        acc -= STEP; t += 1 / 60;
        if (overlayRef.current === 'play' || s.moving) {
          step(s);
          if (s.events.length) { const evs = s.events; s.events = []; handleEvents(s, evs); }
        }
        particles.current.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life++; });
        particles.current = particles.current.filter((p) => p.life < p.max);
        texts.current.forEach((f) => { f.y -= 0.6; f.life++; });
        texts.current = texts.current.filter((f) => f.life < 45);
        if (shake.current > 0) shake.current *= 0.85;
      }
      if (overlayRef.current === 'play') {
        if (s.status === 'WIN') {
          carry.current = s.score;
          const nl = Math.max(load('poolMaxLevel', 1), s.level + 1);
          save('poolMaxLevel', nl); setMaxLevel(nl);
          setTimeout(() => setOverlay('win'), 500); overlayRef.current = 'win';
        } else if (s.status === 'LOSE') {
          setTimeout(() => setOverlay('lose'), 500); overlayRef.current = 'lose';
        }
        if (s.status !== 'PLAYING' && s.score > hiRef.current) { hiRef.current = s.score; setHi(s.score); save('poolHi', s.score); }
      }
      setHud((h) => (h.level === s.level && h.score === s.score && h.shots === s.shots && h.laser === s.laserTurns && h.sup === s.superActive ? h : { level: s.level, score: s.score, shots: s.shots, laser: s.laserTurns, sup: s.superActive }));
      draw(ctx, s, viewRef.current!, t);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('orientationchange', refit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = (ctx: CanvasRenderingContext2D, s: PoolState, v: View, t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060710'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    applyView(ctx, v);
    if (shake.current > 0.5) ctx.translate((Math.random() - 0.5) * shake.current, (Math.random() - 0.5) * shake.current);
    const upright = (x: number, y: number, fn: () => void) => { ctx.save(); ctx.translate(x, y); if (v.portrait) ctx.rotate(Math.PI / 2); fn(); ctx.restore(); };

    ctx.fillStyle = '#060710'; ctx.fillRect(-20, -20, s.w + 40, s.h + 40);
    ctx.strokeStyle = '#101428'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= s.w; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, s.h); }
    for (let y = 0; y <= s.h; y += 25) { ctx.moveTo(0, y); ctx.lineTo(s.w, y); }
    ctx.stroke();
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 4;
    ctx.strokeRect(WALL / 2, WALL / 2, s.w - WALL, s.h - WALL);
    ctx.shadowBlur = 0;

    // power-ups
    for (const p of s.powers) {
      const st = POWER_STYLE[p.type], fy = Math.sin(p.pulse) * 4;
      ctx.save(); ctx.translate(p.x, p.y + fy);
      ctx.shadowColor = st.color; ctx.shadowBlur = 14;
      ctx.fillStyle = st.color; ctx.fillRect(-13, -13, 26, 26);
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-13, -13, 26, 26);
      ctx.restore();
      upright(p.x, p.y + fy + 1, () => { ctx.fillStyle = p.type === 'LASER' ? '#222' : '#fff'; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(st.label, 0, 0); });
    }
    // partículas
    for (const p of particles.current) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); }
    ctx.globalAlpha = 1;

    // estela
    const c = s.cue;
    c.trail.forEach((tp, i) => { const sz = Math.max(3, Math.floor(c.r * 1.3 * (1 - i / c.trail.length))); ctx.fillStyle = 'rgba(0,255,204,0.25)'; ctx.fillRect(Math.floor(tp.x - sz / 2), Math.floor(tp.y - sz / 2), sz, sz); });

    // guía de apuntado (con rebotes)
    const d = drag.current;
    if (d && overlayRef.current === 'play' && !s.moving && s.status === 'PLAYING') {
      const dx = d.sx - d.cx, dy = d.sy - d.cy, dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const ang = Math.atan2(dy, dx), pw = Math.min(1, dist / MAX_PULL);
        const laser = s.laserTurns > 0;
        const { pts, hit } = aimPath(s, ang, laser ? 3 : 1);
        ctx.strokeStyle = laser ? '#ffea00' : '#00ffcc'; ctx.lineWidth = laser ? 3 : 2; ctx.setLineDash([5, 6]);
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
        const e = pts[pts.length - 1];
        ctx.beginPath(); ctx.arc(e.x, e.y, c.r, 0, Math.PI * 2); ctx.strokeStyle = hit ? '#ff0055' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        // barra de potencia detrás de la bola
        const len = pw * 90;
        ctx.strokeStyle = `hsl(${120 - pw * 120}, 100%, 55%)`; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - Math.cos(ang) * len, c.y - Math.sin(ang) * len); ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
    // bola
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(c.sx, c.sy);
    drawBall(ctx, findSkin(BALL_SKINS, settingsRef.current.ball), c.r, c.pulse);
    ctx.restore();
    if (s.superActive) { ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 7 + Math.sin(t * 8) * 2, 0, Math.PI * 2); ctx.stroke(); }

    // fichas
    for (const tl of s.tiles) {
      const th = TILE_COLORS[tl.value] ?? TILE_COLORS[2];
      const sz = tl.r * 1.86 * tl.spawn, rx = tl.x - sz / 2, ry = tl.y - sz / 2;
      ctx.shadowColor = th.bg; ctx.shadowBlur = tl.mega ? 18 : 8;
      ctx.fillStyle = th.bg; ctx.fillRect(rx, ry, sz, sz);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = tl.mega ? '#ffffff' : th.border; ctx.lineWidth = tl.mega ? 4 : 3; ctx.strokeRect(rx, ry, sz, sz);
      if (tl.mega) { ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 2; ctx.strokeRect(rx - 3, ry - 3, sz + 6, sz + 6); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(rx + 2, ry + 2, 3, 3);
      const digits = String(tl.value).length;
      const fs = Math.max(8, Math.floor(tl.r * (digits <= 2 ? 0.72 : digits === 3 ? 0.56 : 0.44)));
      upright(tl.x, tl.y + 1, () => { ctx.fillStyle = th.text; ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(tl.value), 0, 0); });
    }
    // textos flotantes
    for (const f of texts.current) {
      ctx.globalAlpha = Math.max(0, 1 - f.life / 45);
      upright(f.x, f.y, () => { ctx.fillStyle = f.color; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.text, 0, 0); });
    }
    ctx.globalAlpha = 1;
  };

  // -------- entrada (puntero: mouse / táctil). Se arrastra desde cualquier punto hacia atrás, como una honda.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return toLogical(viewRef.current!, e.clientX - r.left, e.clientY - r.top);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (overlayRef.current !== 'play' || s.moving || s.status !== 'PLAYING' || drag.current) return;
      const p = pos(e);
      drag.current = { id: e.pointerId, sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
    };
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d || d.id !== e.pointerId) return;
      e.preventDefault();
      const p = pos(e); d.cx = p.x; d.cy = p.y;
    };
    const up = (e: PointerEvent) => {
      const d = drag.current; if (!d || d.id !== e.pointerId) return;
      e.preventDefault();
      drag.current = null;
      const s = stateRef.current;
      const dx = d.sx - d.cx, dy = d.sy - d.cy, dist = Math.hypot(dx, dy);
      if (e.type === 'pointerup' && dist > 14 && overlayRef.current === 'play') shoot(s, Math.atan2(dy, dx), Math.min(1, dist / MAX_PULL));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    };
  }, []);

  const cfg = levelConfig(selLevel);
  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className="stat"><span>Nivel</span><b>{hud.level}</b></div>
          <div className="stat"><span>Puntos</span><b>{hud.score}</b></div>
          <div className={'stat ' + (hud.shots <= 3 ? 'warn' : '')}><span>Tiros</span><b>{hud.shots}</b></div>
          <div className="stat hide-s"><span>Récord</span><b>{hi}</b></div>
          {hud.laser > 0 && <div className="chip amber">Láser {hud.laser}</div>}
          {hud.sup && <div className="chip pink">Split x4</div>}
        </div>
        <button className="ibtn" onClick={() => { sfx.click(); startLevel(hud.level, false); }} aria-label="Reiniciar">↻</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />
        <div className="scan" />
        {overlay === 'intro' && (
          <div className="ov">
            <h2 className="ov-title cyan">Neon 2048 Pool</h2>
            <p className="ov-text">Arrastra hacia atrás desde cualquier punto y suelta para lanzar la bola. Cada golpe parte una ficha en dos; las fichas que chocan fuerte entre sí se rompen en cadena. Junta 4 golpes en un tiro y ganas un tiro extra.</p>
            <ul className="legend">
              <li><i style={{ background: '#ff0055' }}>B</i> Bomba: rompe todo lo cercano</li>
              <li><i style={{ background: '#00ffcc', color: '#003' }}>+3</i> Tiros extra</li>
              <li><i style={{ background: '#ffea00', color: '#222' }}>L</i> Láser: guía con 3 rebotes</li>
              <li><i style={{ background: '#ff00aa' }}>x4</i> Super split: parte en 4</li>
            </ul>
            <div className="lvlpick">
              <button className="ibtn" disabled={selLevel <= 1} onClick={() => setSelLevel(selLevel - 1)}>‹</button>
              <div><span>Nivel {selLevel}</span><small>Ficha mayor {Math.max(...cfg.tiles)} · {cfg.shots} tiros</small></div>
              <button className="ibtn" disabled={selLevel >= maxLevel} onClick={() => setSelLevel(selLevel + 1)}>›</button>
            </div>
            <button className="btn cyan" onClick={() => { sfx.click(); startLevel(selLevel, false); }}>Jugar</button>
          </div>
        )}
        {overlay === 'win' && (
          <div className="ov">
            <h2 className="ov-title amber">¡Nivel {hud.level} completado!</h2>
            <p className="ov-text">Puntos: {hud.score}. Cada tiro que te sobró suma 100.</p>
            <button className="btn cyan" onClick={() => { sfx.click(); startLevel(hud.level + 1, true); }}>Siguiente nivel</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'lose' && (
          <div className="ov">
            <h2 className="ov-title pink">Sin tiros</h2>
            <p className="ov-text">Quedaron {stateRef.current.tiles.length} fichas. Apunta a las fichas grandes y busca rebotes para encadenar choques.</p>
            <button className="btn pink" onClick={() => { sfx.click(); startLevel(hud.level, true); }}>Reintentar nivel</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
      </div>
    </div>
  );
}
