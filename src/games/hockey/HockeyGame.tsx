import { useEffect, useRef, useState } from 'react';
import { createHockey, step, setTarget, setKeys, aiThink, restart, stepOwnMallet, makeSnap, applySnap, HW, HH, GOAL, MALLET_R, PUCK_R } from './engine.ts';
import type { HockeyState, HEvent, HSnap } from './engine.ts';
import type { Link } from '../../net/link.ts';
import { applyView, fitCanvas, toLogical } from '../../core/view.ts';
import type { View } from '../../core/view.ts';
import { drawMallet, drawPuck, MALLET_SKINS, PUCK_SKINS, findSkin } from '../../core/skins.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';
import SkinPicker from '../../ui/SkinPicker.tsx';
import Skull from '../../ui/Skull.tsx';

type Overlay = 'setup' | 'skins' | 'play' | 'pause' | 'over';
const LEVELS: { id: Settings['aiLevel']; label: string; hint: string }[] = [
  { id: 'easy', label: 'Fácil', hint: 'La CPU es lenta y casi no ataca.' },
  { id: 'hard', label: 'Difícil', hint: 'Defiende bien y ataca con ganas.' },
  { id: 'impossible', label: 'Imposible', hint: 'Rápida, precisa y sin piedad. Suerte.' },
];
interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; max: number }

const C0 = '#19f4ff', C1 = '#ff2bd6';
const FONT = `'Press Start 2P', ui-monospace, monospace`;

export default function HockeyGame({ settings, onChange = () => {}, onExit, config }: { settings: Settings; onChange?: (p: Partial<Settings>) => void; onExit: () => void; config?: { players?: 1 | 2; online?: { link: Link } } }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const stateRef = useRef<HockeyState>(createHockey(settings.goalsToWin));
  const overlayRef = useRef<Overlay>('setup');
  const skinsBack = useRef<Overlay>('setup');
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const particles = useRef<Particle[]>([]);
  const flash = useRef<{ color: string; a: number }>({ color: C0, a: 0 });
  const banner = useRef<{ text: string; life: number }>({ text: '', life: 0 });
  const keys = useRef(new Set<string>());
  const pointers = useRef(new Map<number, 0 | 1>());
  const [overlay, setOverlayState] = useState<Overlay>('setup');
  const [players, setPlayers] = useState<1 | 2>(() => config?.players ?? (load<number>('hockeyPlayers', 1) === 2 ? 2 : 1));
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  // ---- online: el anfitrión (izquierda) simula la física; el invitado (derecha) manda su paleta y dibuja lo que recibe
  const link = config?.online?.link;
  const online = !!link;
  const me: 0 | 1 = link && link.role === 'guest' ? 1 : 0;
  const isGuest = online && me === 1;
  const [lost, setLost] = useState(false);
  const [goals, setGoals] = useState(settings.goalsToWin);
  const [rematchSent, setRematchSent] = useState(false);
  const [rivalWants, setRivalWants] = useState(false);
  const wants = useRef({ me: false, rival: false });
  const evBuf = useRef<HEvent[]>([]);
  const snapRef = useRef<{ snap: HSnap | null; k: number }>({ snap: null, k: 0 });
  const rivalSkin = useRef('magenta');
  const lastSent = useRef({ x: -1, y: -1 });
  const one = online ? false : players === 1;
  const oneRef = useRef(one); oneRef.current = one;   // el bucle del juego se crea una sola vez: lee siempre el valor vigente

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };
  /** Empieza (o reinicia) el partido en ESTE dispositivo. Online solo lo ordena el anfitrión: `startFromHost`. */
  const startLocal = (g: number) => {
    stateRef.current.goalsToWin = g; restart(stateRef.current); setScore([0, 0]); setWinner(null); setGoals(g);
    wants.current = { me: false, rival: false }; setRematchSent(false); setRivalWants(false);
    evBuf.current = []; snapRef.current = { snap: null, k: 0 };
    setOverlay('play');
  };
  const begin = () => {
    sfx.unlock(); sfx.click();
    if (online) {
      if (isGuest) return;
      link!.send({ t: 'start', goals: settingsRef.current.goalsToWin });
    }
    startLocal(settingsRef.current.goalsToWin);
  };
  const requestRematch = () => {
    sfx.click();
    if (!link || wants.current.me) return;
    wants.current.me = true; setRematchSent(true);
    if (isGuest) link.send({ t: 'rematch' });
    else if (wants.current.rival) begin();
  };
  const resume = () => { sfx.unlock(); setOverlay('play'); };
  const pause = () => { if (!online && overlayRef.current === 'play') setOverlay('pause'); };
  const choosePlayers = (n: 1 | 2) => { sfx.unlock(); sfx.click(); setPlayers(n); save('hockeyPlayers', n); };
  const openSkins = () => {
    sfx.unlock(); sfx.click();
    const cur = overlayRef.current;
    skinsBack.current = cur === 'setup' ? 'setup' : 'pause';
    setOverlay('skins');
  };
  const closeSkins = () => setOverlay(skinsBack.current);
  const toSetup = () => { sfx.click(); setOverlay('setup'); };

  const burst = (x: number, y: number, color: string, n: number, speed = 6) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * speed + 1;
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, size: Math.random() * 3 + 2, life: 0, max: Math.random() * 18 + 12 });
    }
  };

  const handle = (s: HockeyState, evs: HEvent[]) => {
    for (const e of evs) {
      if (e.t === 'hit') { sfx.puckHit(e.v); burst(e.x, e.y, '#ffffff', Math.min(14, 3 + Math.floor(e.v / 2)), 4); }
      else if (e.t === 'wall') { sfx.puckWall(e.v); burst(e.x, e.y, '#9a93c4', 3, 2); }
      else if (e.t === 'goal') {
        sfx.goal(); flash.current = { color: e.scorer === 0 ? C0 : C1, a: 0.6 };
        burst(e.scorer === 0 ? HW : 0, HH / 2, e.scorer === 0 ? C0 : C1, 50, 9);
        banner.current = { text: '¡GOL!', life: 80 };
        setScore([s.score[0], s.score[1]]);
      } else if (e.t === 'count') { sfx.beep(); banner.current = { text: String(e.n), life: 40 }; }
      else if (e.t === 'go') { sfx.beep(true); banner.current = { text: '¡YA!', life: 40 }; }
      else if (e.t === 'over') { sfx.win(); setWinner(e.winner); setTimeout(() => setOverlay('over'), 900); }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const refit = () => { viewRef.current = fitCanvas(canvas, box, HW, HH); };
    refit();
    const ro = new ResizeObserver(refit); ro.observe(box);
    window.addEventListener('orientationchange', refit);

    let raf = 0, last = performance.now(), acc = 0, t = 0, sendTick = 0;
    const STEP = 1000 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      const s = stateRef.current;
      const playing = overlayRef.current === 'play' || (overlayRef.current === 'over' && s.phase !== 'OVER');
      while (acc >= STEP) {
        acc -= STEP; t += 1 / 60;
        if (playing) {
          // teclado
          const k = keys.current;
          const ax = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0), ay = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
          const bx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0), by = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
          const cl = (v: number) => Math.max(-1, Math.min(1, v));
          if (online) {
            // online: cada jugador mueve SU paleta (WASD o flechas)
            setKeys(s, me, cl(ax + bx), cl(ay + by));
            if (isGuest) {
              // invitado: no hay física aquí. Su paleta se mueve en local, el resto sale del último paquete.
              stepOwnMallet(s, 1);
              const sr = snapRef.current;
              if (sr.snap) { sr.k++; applySnap(s, sr.snap, 1, sr.k); }
              s.puck.trail.unshift({ x: s.puck.x, y: s.puck.y }); if (s.puck.trail.length > 10) s.puck.trail.pop();
              if (++sendTick % 2 === 0) {
                const m = s.mallets[1], x = Math.round(m.x * 10) / 10, y = Math.round(m.y * 10) / 10;
                if (x !== lastSent.current.x || y !== lastSent.current.y) { lastSent.current = { x, y }; link!.send({ t: 'in', x, y }); }
              }
            } else {
              step(s);
              if (s.events.length) { const ev = s.events; s.events = []; handle(s, ev); evBuf.current.push(...ev); }
              if (++sendTick % 2 === 0) { link!.send({ t: 'snap', ...makeSnap(s, evBuf.current) }); evBuf.current = []; }
            }
          } else {
            if (oneRef.current) setKeys(s, 0, cl(ax + bx), cl(ay + by));
            else { setKeys(s, 0, ax, ay); setKeys(s, 1, bx, by); }
            if (oneRef.current) aiThink(s, settingsRef.current.aiLevel, 1);
            step(s);
            if (s.events.length) { const ev = s.events; s.events = []; handle(s, ev); }
          }
        }
        particles.current.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life++; });
        particles.current = particles.current.filter((p) => p.life < p.max);
        if (flash.current.a > 0) flash.current.a -= 0.02;
        if (banner.current.life > 0) banner.current.life--;
      }
      draw(ctx, s, viewRef.current!, t);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (down) {
        keys.current.add(e.code);
        if ((e.code === 'Escape' || e.code === 'KeyP')) { overlayRef.current === 'play' ? pause() : overlayRef.current === 'pause' ? resume() : null; }
      } else keys.current.delete(e.code);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => { keys.current.clear(); pause(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', clear);
    const vis = () => { if (document.hidden) clear(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('orientationchange', refit);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- red (online)
  useEffect(() => {
    if (!link) return;
    link.onMessage((m) => {
      const s = stateRef.current;
      if (m.t === 'in' && !isGuest) setTarget(s, 1, Number(m.x), Number(m.y));
      else if (m.t === 'snap' && isGuest) {
        if (overlayRef.current !== 'play' && overlayRef.current !== 'over') return;
        const snap = m as unknown as HSnap;
        snapRef.current = { snap, k: 0 };
        applySnap(s, snap, 1, 0);
        if (snap.ev?.length) handle(s, snap.ev);
      } else if (m.t === 'start' && isGuest) startLocal(Number(m.goals) || 7);
      else if (m.t === 'rematch' && !isGuest) { wants.current.rival = true; setRivalWants(true); if (wants.current.me) begin(); }
      else if (m.t === 'skin') rivalSkin.current = String(m.m);
    });
    link.onClose(() => setLost(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { link?.send({ t: 'skin', m: settings.mallet1 }); }, [settings.mallet1, link]);

  // ---------- entrada táctil / mouse (varios dedos a la vez, uno por jugador)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pos = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return toLogical(viewRef.current!, e.clientX - r.left, e.clientY - r.top); };
    const aim = (e: PointerEvent, who: 0 | 1) => {
      const p = pos(e);
      const off = e.pointerType === 'touch' ? (who === 0 ? 34 : -34) : 0; // el dedo no tapa la paleta
      setTarget(stateRef.current, who, p.x + off, p.y);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      if (overlayRef.current !== 'play') return;
      const p = pos(e);
      const who: 0 | 1 = online ? me : one ? 0 : p.x < HW / 2 ? 0 : 1;
      for (const [, w] of pointers.current) if (w === who) return; // ese jugador ya tiene un dedo
      pointers.current.set(e.pointerId, who);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
      aim(e, who);
    };
    const move = (e: PointerEvent) => {
      if (overlayRef.current !== 'play') return;
      const who = pointers.current.get(e.pointerId);
      if (who !== undefined) { e.preventDefault(); aim(e, who); }
      else if ((one || online) && e.pointerType === 'mouse') aim(e, online ? me : 0); // PC: el mouse mueve tu paleta sin hacer clic
    };
    const up = (e: PointerEvent) => {
      const who = pointers.current.get(e.pointerId);
      if (who === undefined) return;
      e.preventDefault();
      pointers.current.delete(e.pointerId);
      const m = stateRef.current.mallets[who]; m.tx = m.x; m.ty = m.y;
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up);
    };
  }, [one, online, me]);

  const draw = (ctx: CanvasRenderingContext2D, s: HockeyState, v: View, t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    applyView(ctx, v);
    const upright = (x: number, y: number, extra: number, fn: () => void) => { ctx.save(); ctx.translate(x, y); ctx.rotate((v.portrait ? Math.PI / 2 : 0) + extra); fn(); ctx.restore(); };

    // superficie con agujeritos de aire
    const g = ctx.createLinearGradient(0, 0, HW, 0);
    g.addColorStop(0, '#0b1a2a'); g.addColorStop(0.5, '#0a0a1c'); g.addColorStop(1, '#240b26');
    ctx.fillStyle = g; ctx.fillRect(0, 0, HW, HH);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 12; x < HW; x += 24) for (let y = 12; y < HH; y += 24) ctx.fillRect(x, y, 2, 2);

    // marcador grande de fondo
    ctx.globalAlpha = 0.12;
    upright(HW * 0.25, HH / 2, 0, () => { ctx.fillStyle = C0; ctx.font = `120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(s.score[0]), 0, 0); });
    upright(HW * 0.75, HH / 2, v.portrait ? Math.PI : 0, () => { ctx.fillStyle = C1; ctx.font = `120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(s.score[1]), 0, 0); });
    ctx.globalAlpha = 1;

    // línea central y círculo
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(HW / 2, 0); ctx.lineTo(HW / 2, HH); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(HW / 2, HH / 2, 62, 0, Math.PI * 2); ctx.stroke();

    // bordes neón con hueco de portería
    const g0 = HH / 2 - GOAL / 2, g1 = HH / 2 + GOAL / 2;
    const rim = (color: string, x0: number, x1: number) => {
      ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.moveTo(x0, HH); ctx.lineTo(x1, HH); ctx.stroke();
      ctx.shadowBlur = 0;
    };
    rim(C0, 0, HW / 2); rim(C1, HW / 2, HW);
    ctx.lineWidth = 6; ctx.shadowBlur = 14;
    ctx.strokeStyle = C0; ctx.shadowColor = C0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, g0); ctx.moveTo(0, g1); ctx.lineTo(0, HH); ctx.stroke();
    ctx.strokeStyle = C1; ctx.shadowColor = C1; ctx.beginPath(); ctx.moveTo(HW, 0); ctx.lineTo(HW, g0); ctx.moveTo(HW, g1); ctx.lineTo(HW, HH); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
    // porterías
    ctx.fillStyle = C0 + '33'; ctx.fillRect(0, g0, 14, GOAL); ctx.fillStyle = C1 + '33'; ctx.fillRect(HW - 14, g0, 14, GOAL);
    ctx.fillStyle = C0; ctx.fillRect(0, g0 - 4, 14, 8); ctx.fillRect(0, g1 - 4, 14, 8);
    ctx.fillStyle = C1; ctx.fillRect(HW - 14, g0 - 4, 14, 8); ctx.fillRect(HW - 14, g1 - 4, 14, 8);
    ctx.strokeStyle = 'rgba(25,244,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, HH / 2, GOAL / 2 + 20, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,43,214,0.35)'; ctx.beginPath(); ctx.arc(HW, HH / 2, GOAL / 2 + 20, Math.PI / 2, (3 * Math.PI) / 2); ctx.stroke();

    // estela del disco
    const pk = s.puck;
    const sp = Math.hypot(pk.vx, pk.vy);
    if (sp > 3) pk.trail.forEach((tp, i) => { ctx.globalAlpha = (1 - i / pk.trail.length) * 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tp.x, tp.y, PUCK_R * (1 - i / 14), 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // paletas y disco
    const st = settingsRef.current;
    s.mallets.forEach((m, i) => {
      const id = online ? (i === me ? st.mallet1 : rivalSkin.current) : i === 0 ? st.mallet1 : st.mallet2;
      ctx.save(); ctx.translate(m.x, m.y); drawMallet(ctx, findSkin(MALLET_SKINS, id), MALLET_R, t); ctx.restore();
    });
    ctx.save(); ctx.translate(pk.x, pk.y); ctx.rotate(t * Math.min(6, sp * 0.3) * 0.4 + pk.x * 0.02); drawPuck(ctx, findSkin(PUCK_SKINS, st.puck), PUCK_R, t); ctx.restore();

    for (const p of particles.current) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    if (flash.current.a > 0) { ctx.globalAlpha = flash.current.a * 0.5; ctx.fillStyle = flash.current.color; ctx.fillRect(0, 0, HW, HH); ctx.globalAlpha = 1; }

    if (banner.current.life > 0 && overlayRef.current === 'play') {
      const k = banner.current.life;
      const tx = banner.current.text;
      const parts: [number, number][] = v.portrait ? [[0, 0], [Math.PI, 0]] : [[0, 0]];
      // en vertical se muestra para ambos jugadores (uno boca abajo)
      parts.forEach(([extra], idx) => {
        upright(HW / 2 + (v.portrait ? (idx === 0 ? 0 : 0) : 0), HH / 2 + (v.portrait ? (idx === 0 ? 70 : -70) : 0), extra, () => {
          ctx.globalAlpha = Math.min(1, k / 20);
          ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffb800'; ctx.shadowBlur = 16;
          ctx.font = `${tx.length > 2 ? 40 : 64}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tx, 0, 0);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        });
      });
    }
  };

  const names: [string, string] = online ? [me === 0 ? 'Tú (izquierda)' : 'Rival (izquierda)', me === 1 ? 'Tú (derecha)' : 'Rival (derecha)']
    : one ? ['Tú (izquierda)', 'CPU (derecha)'] : ['Jugador 1 (izquierda)', 'Jugador 2 (derecha)'];
  const lab0 = online ? (me === 0 ? 'Tú' : 'Rival') : one ? 'Tú' : 'J1';
  const lab1 = online ? (me === 1 ? 'Tú' : 'Rival') : one ? 'CPU' : 'J2';
  const level = LEVELS.find((l) => l.id === settings.aiLevel) ?? LEVELS[0];

  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats hockey-score">
          <b className="c0">{lab0} {score[0]}</b>
          <span className="to">a {online ? goals : settings.goalsToWin}</span>
          <b className="c1">{score[1]} {one ? (settings.aiLevel === 'impossible' ? <Skull size={14} /> : 'CPU') : lab1}</b>
        </div>
        <button className="ibtn" onClick={openSkins} aria-label="Skins" title="Skins">🎨</button>
        {!online && <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>}
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />
        {overlay === 'setup' && online && (
          <div className="ov sheet">
            <div className="sheet-in">
              <h2 className="ov-title cyan">Air Hockey Online</h2>
              <p className="ov-text">Tú juegas a la <b>{me === 0 ? 'izquierda (cian)' : 'derecha (magenta)'}</b>. Mueve la paleta con el dedo, el mouse, WASD o flechas.</p>
              {!isGuest ? (
                <section className="opt">
                  <h3>Goles para ganar</h3>
                  <div className="seg">
                    {[3, 5, 7, 10].map((n) => <button key={n} className={settings.goalsToWin === n ? 'on' : ''} onClick={() => { sfx.click(); onChange({ goalsToWin: n }); }}>{n}</button>)}
                  </div>
                </section>
              ) : <p className="waiting">Esperando a que el anfitrión empiece<i>.</i><i>.</i><i>.</i></p>}
              <div className="sheet-actions">
                <button className="btn ghost" onClick={openSkins}>Skins</button>
                {!isGuest && <button className="btn cyan" onClick={begin}>¡Jugar!</button>}
              </div>
            </div>
          </div>
        )}
        {overlay === 'setup' && !online && (
          <div className="ov sheet">
            <div className="sheet-in">
              <h2 className="ov-title cyan">Air Hockey</h2>
              <section className="opt">
                <h3>Modo de juego</h3>
                <div className="seg two">
                  <button className={one ? 'on' : ''} onClick={() => choosePlayers(1)}>1 jugador<small>contra la CPU</small></button>
                  <button className={!one ? 'on pink' : ''} onClick={() => choosePlayers(2)}>2 jugadores<small>misma pantalla</small></button>
                </div>
              </section>
              {one && (
                <section className="opt">
                  <h3>Dificultad de la CPU</h3>
                  <div className="seg">
                    {LEVELS.map((l) => (
                      <button key={l.id} className={(settings.aiLevel === l.id ? 'on ' : '') + (l.id === 'impossible' ? 'skullbtn' : '')} onClick={() => { sfx.click(); onChange({ aiLevel: l.id }); }}>
                        {l.id === 'impossible' && <Skull size={16} />}{l.label}
                      </button>
                    ))}
                  </div>
                  <p className="opt-hint">{level.hint}</p>
                </section>
              )}
              <section className="opt">
                <h3>Goles para ganar</h3>
                <div className="seg">
                  {[3, 5, 7, 10].map((n) => <button key={n} className={settings.goalsToWin === n ? 'on' : ''} onClick={() => { sfx.click(); onChange({ goalsToWin: n }); }}>{n}</button>)}
                </div>
              </section>
              <ul className="legend how">
                {one ? (
                  <>
                    <li><i>☝</i> Celular: arrastra el dedo</li>
                    <li><i>⌨</i> PC: mouse, WASD o flechas</li>
                  </>
                ) : (
                  <>
                    <li><i>☝☝</i> Celular: cada uno arrastra en su mitad, a la vez</li>
                    <li><i>⌨</i> PC: J1 = W A S D · J2 = flechas</li>
                  </>
                )}
              </ul>
              <div className="sheet-actions">
                <button className="btn ghost" onClick={openSkins}>Skins</button>
                <button className="btn cyan" onClick={begin}>¡Jugar!</button>
              </div>
            </div>
          </div>
        )}
        {overlay === 'skins' && <SkinPicker kinds={['mallet', 'puck']} settings={settings} onChange={onChange} onClose={closeSkins} players={names} />}
        {overlay === 'pause' && (
          <div className="ov">
            <h2 className="ov-title amber">Pausa</h2>
            <button className="btn cyan" onClick={resume}>Continuar</button>
            <button className="btn ghost" onClick={begin}>Reiniciar partido</button>
            <button className="btn ghost" onClick={openSkins}>Skins</button>
            <button className="btn ghost" onClick={toSetup}>Cambiar modo / dificultad</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'over' && (
          <div className="ov">
            <h2 className={'ov-title ' + (winner === 0 ? 'cyan' : 'pink')}>
              {online ? (winner === me ? '¡Ganaste!' : 'Gana tu rival') : one ? (winner === 0 ? '¡Ganaste!' : 'Gana la CPU') : winner === 0 ? 'Gana el Jugador 1' : 'Gana el Jugador 2'}
            </h2>
            <p className="ov-text">{score[0]} – {score[1]}</p>
            {online ? (
              rematchSent
                ? <p className="waiting">{isGuest ? 'Esperando al anfitrión' : 'Esperando que tu rival acepte'}<i>.</i><i>.</i><i>.</i></p>
                : <button className="btn cyan" onClick={requestRematch}>Revancha{rivalWants ? ' ⭐ ¡tu rival quiere!' : ''}</button>
            ) : (
              <>
                <button className="btn cyan" onClick={begin}>Revancha</button>
                <button className="btn ghost" onClick={toSetup}>Cambiar modo / dificultad</button>
              </>
            )}
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {lost && (
          <div className="ov" style={{ zIndex: 9 }}>
            <h2 className="ov-title pink">Tu rival se desconectó</h2>
            <p className="ov-text">La conexión se cerró.</p>
            <button className="btn cyan" onClick={onExit}>Salir</button>
          </div>
        )}
      </div>
    </div>
  );
}
