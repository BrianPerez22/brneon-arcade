#!/usr/bin/env bash
# BrNeon Games - actualización MULTI: botones Online dentro de cada juego (Air Hockey y Suerte 2048),
# 2048 con historial (scoreboard) y partida guardada en el dispositivo, y color neón + capibara tierno en Skins.
# Requisito: haber aplicado antes update.sh y update-online.sh.
# Uso: copia este archivo a la carpeta del proyecto (donde está package.json) y ejecuta:  bash update-multi.sh
set -e

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "x Ejecuta este script dentro de la carpeta del proyecto (donde están package.json y src/)."; exit 1
fi
if [ ! -f src/net/link.ts ] || [ ! -f src/ui/Online.tsx ]; then
  echo "x Falta la actualización online. Ejecuta primero:  bash update-online.sh   y luego este script."; exit 1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP=".backup-multi-$STAMP"
echo "> Respaldando archivos que se reemplazan en $BACKUP/ ..."
for f in src/online.css src/core/storage.ts src/ui/Skins.tsx src/ui/Menu.tsx src/App.tsx src/ui/HockeySetup.tsx src/games/lucky/LuckyGame.tsx src/games/g2048/Game2048.tsx ; do
  if [ -f "$f" ]; then mkdir -p "$BACKUP/$(dirname "$f")"; cp "$f" "$BACKUP/$f"; fi
done

mkdir -p src/core src/ui src/games/lucky src/games/g2048
echo "> Escribiendo src/core/scores.ts"
cat > "src/core/scores.ts" <<'BRNEON_EOF'
// Historial de partidas por juego, guardado en localStorage de cada dispositivo
// (dura hasta que se borren los datos del sitio / cookies).
import { load, save } from './storage.ts';

export interface ScoreEntry { score: number; extra?: string; date: number }
const MAX = 50;
const key = (game: string) => `scores:${game}`;

export const loadScores = (game: string): ScoreEntry[] => {
  const v = load<ScoreEntry[]>(key(game), []);
  return Array.isArray(v) ? v : [];
};
export function addScore(game: string, entry: Omit<ScoreEntry, 'date'>): ScoreEntry[] {
  const list = [{ ...entry, date: Date.now() }, ...loadScores(game)].slice(0, MAX);
  save(key(game), list);
  return list;
}
export const clearScores = (game: string) => save(key(game), [] as ScoreEntry[]);
export const topScores = (list: ScoreEntry[], n = 10) => [...list].sort((a, b) => b.score - a.score).slice(0, n);
export const fmtDate = (t: number) => new Date(t).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
BRNEON_EOF
echo "> Escribiendo src/ui/Scoreboard.tsx"
cat > "src/ui/Scoreboard.tsx" <<'BRNEON_EOF'
import { useState } from 'react';
import { clearScores, fmtDate, topScores } from '../core/scores.ts';
import type { ScoreEntry } from '../core/scores.ts';
import { sfx } from '../core/audio.ts';

interface Props { game: string; title: string; list: ScoreEntry[]; onChange: (l: ScoreEntry[]) => void; onClose: () => void; extraLabel?: string }

export default function Scoreboard({ game, title, list, onChange, onClose, extraLabel = '' }: Props) {
  const [tab, setTab] = useState<'top' | 'recent'>('top');
  const rows = tab === 'top' ? topScores(list) : list.slice(0, 20);
  return (
    <div className="ov sb">
      <h2 className="ov-title amber">{title}</h2>
      <div className="seg">
        <button className={tab === 'top' ? 'on' : ''} onClick={() => { sfx.click(); setTab('top'); }}>Mejores 10</button>
        <button className={tab === 'recent' ? 'on' : ''} onClick={() => { sfx.click(); setTab('recent'); }}>Recientes</button>
      </div>
      {rows.length === 0 ? <p className="ov-text">Todavía no hay partidas guardadas.</p> : (
        <ol className="sblist">
          {rows.map((r, i) => (
            <li key={r.date + '-' + i}>
              <span className="sbn">{tab === 'top' ? i + 1 : '·'}</span>
              <b>{r.score}</b>
              <span className="sbx">{r.extra ? `${extraLabel}${r.extra}` : ''}</span>
              <span className="sbd">{fmtDate(r.date)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="small">Se guarda en este dispositivo hasta que borres los datos del sitio.</p>
      <div className="row">
        {list.length > 0 && <button className="btn ghost" onClick={() => { if (confirm('¿Borrar todo el historial?')) { clearScores(game); onChange([]); } }}>Borrar</button>}
        <button className="btn cyan" onClick={() => { sfx.click(); onClose(); }}>Cerrar</button>
      </div>
    </div>
  );
}
BRNEON_EOF
echo "> Escribiendo src/core/capybara.ts"
cat > "src/core/capybara.ts" <<'BRNEON_EOF'
// Capibara tierno: cabezón, cuerpo chiquito y patas traseras pegadas a las delanteras.
// Se dibuja centrado en (0,0) mirando a la derecha; s = tamaño aproximado (ancho total).
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

export interface CapyOpts { glow: string; t?: number; blink?: boolean; step?: number }

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function drawCapybara(ctx: CanvasRenderingContext2D, s: number, o: CapyOpts) {
  const t = o.t ?? 0, bob = Math.sin(t * 5) * s * 0.012;
  const fur = '#b9854f', furDark = '#8a5c33', belly = '#d9aa72', ink = '#2a1608';
  ctx.save();
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.025);

  // brillo neón del color elegido
  ctx.shadowColor = o.glow; ctx.shadowBlur = s * 0.12;

  // patas (cortitas): las traseras casi tocan a las delanteras
  const leg = (x: number, y: number, w: number, h: number, shade: string) => {
    ctx.fillStyle = shade; ctx.strokeStyle = o.glow;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, w * 0.45); ctx.fill(); ctx.stroke();
  };
  const sw = (o.step ?? 0) * s * 0.012;
  leg(-s * 0.1 - sw, s * 0.2, s * 0.13, s * 0.15, furDark);   // trasera
  leg(s * 0.03 + sw, s * 0.2, s * 0.13, s * 0.15, furDark);   // delantera (muy cerca de la trasera)

  // cuerpo chiquito
  ctx.fillStyle = fur; ctx.strokeStyle = o.glow;
  ellipse(ctx, -s * 0.06, s * 0.14, s * 0.25, s * 0.17); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = belly; ellipse(ctx, -s * 0.04, s * 0.2, s * 0.16, s * 0.08); ctx.fill();
  // patas del frente (más claras, delante del cuerpo)
  ctx.shadowBlur = s * 0.12;
  leg(-s * 0.02 + sw, s * 0.2, s * 0.13, s * 0.15, fur);
  leg(s * 0.1 - sw, s * 0.2, s * 0.13, s * 0.15, fur);
  ctx.shadowBlur = 0;

  // cabezota (más grande que el cuerpo)
  ctx.shadowColor = o.glow; ctx.shadowBlur = s * 0.12;
  ctx.fillStyle = fur; ctx.strokeStyle = o.glow;
  ctx.beginPath(); ctx.ellipse(s * 0.12, -s * 0.12, s * 0.34, s * 0.29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hocico chato y redondeado
  ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.12, s * 0.2, s * 0.22, s * 0.09); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = fur; ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.12, s * 0.2, s * 0.22, s * 0.09); ctx.fill();
  ellipse(ctx, s * 0.12, -s * 0.12, s * 0.33, s * 0.28); ctx.fill();

  // orejitas
  ctx.fillStyle = furDark; ellipse(ctx, -s * 0.06, -s * 0.36, s * 0.06, s * 0.05); ctx.fill();
  ctx.fillStyle = belly; ellipse(ctx, -s * 0.06, -s * 0.36, s * 0.03, s * 0.025); ctx.fill();

  // ojo grande y brillante
  const ex = s * 0.2, ey = -s * 0.16;
  if (o.blink) { ctx.strokeStyle = ink; ctx.lineWidth = s * 0.02; ctx.beginPath(); ctx.arc(ex, ey, s * 0.04, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else {
    ctx.fillStyle = ink; ellipse(ctx, ex, ey, s * 0.045, s * 0.055); ctx.fill();
    ctx.fillStyle = '#fff'; ellipse(ctx, ex + s * 0.015, ey - s * 0.02, s * 0.016, s * 0.018); ctx.fill();
  }
  // naricitas y sonrisa
  ctx.fillStyle = ink; ellipse(ctx, s * 0.43, -s * 0.07, s * 0.018, s * 0.024); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.014; ctx.beginPath(); ctx.arc(s * 0.36, 0, s * 0.05, 0.25, Math.PI * 0.8); ctx.stroke();
  // cachete rosado
  ctx.fillStyle = '#ff8fa3aa'; ellipse(ctx, s * 0.14, s * 0.0, s * 0.045, s * 0.03); ctx.fill();
  ctx.restore();
}
BRNEON_EOF
echo "> Escribiendo src/online.css"
cat > "src/online.css" <<'BRNEON_EOF'
/* ===== Online: código de amistad ===== */
input, textarea { -webkit-user-select: text; user-select: text; font-size: 18px; /* >=16px: iOS no hace zoom al enfocar */ }
.online .gpick { display: grid; gap: 12px; }
.online .gpick .cab { grid-template-columns: 1fr; }
.online .gpick .cab-t, .online .gpick .cab-s { grid-column: 1; }
.codebox { display: flex; gap: 8px; justify-content: center; }
.codebox span { width: 52px; height: 66px; display: grid; place-items: center; font: 26px var(--px); color: var(--cyan); background: #0b0818; border: 2px solid var(--cyan); border-radius: 10px;
  text-shadow: 0 0 12px var(--cyan); box-shadow: 0 0 16px -4px var(--cyan); animation: codePop .45s cubic-bezier(.3, 1.6, .5, 1) backwards; }
@keyframes codePop { from { transform: scale(0) rotate(-12deg); opacity: 0 } to { transform: none; opacity: 1 } }
.codein { width: 100%; text-align: center; letter-spacing: .4em; text-indent: .4em; font: 26px var(--px); color: var(--cyan); background: #0b0818; border: 2px solid var(--line); border-radius: 12px; padding: 16px 8px; text-transform: uppercase; outline: none; }
.codein:focus { border-color: var(--cyan); box-shadow: 0 0 18px -4px var(--cyan); }
.waiting { margin: 0; text-align: center; color: var(--amber); font-weight: 700; }
.waiting i { font-style: normal; animation: blink 1.2s infinite; } .waiting i:nth-child(2) { animation-delay: .2s } .waiting i:nth-child(3) { animation-delay: .4s }
@keyframes blink { 0%, 80%, 100% { opacity: .15 } 40% { opacity: 1 } }
.err { margin: 0; color: #ff6b8f; text-align: center; font-weight: 700; line-height: 1.4; }
.small { margin: 0; font-size: 13px; color: var(--mute); text-align: center; }
.testmode { display: flex; gap: 10px; align-items: center; color: var(--mute); font-size: 13px; }
.testmode input { width: 20px; height: 20px; accent-color: var(--cyan); flex: none; }
.ov-text.waiting { color: var(--amber); }
@media (max-width: 360px) { .codebox span { width: 44px; height: 58px; font-size: 22px; } }

.c-violet { --c: #9b7bff; }

/* ===== Historial ===== */
.sb { align-content: start; padding-top: 24px; }
.sblist { list-style: none; margin: 0; padding: 0; width: min(100%, 420px); display: grid; gap: 6px; text-align: left; }
.sblist li { display: grid; grid-template-columns: 24px 1fr auto auto; gap: 10px; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; font-size: 13px; }
.sblist li:first-child { border-color: var(--amber); }
.sblist b { font-family: var(--px); font-size: 12px; color: var(--cyan); }
.sbn { color: var(--amber); font-family: var(--px); font-size: 10px; } .sbx, .sbd { color: var(--mute); font-size: 12px; }
.ov.sb .row { width: min(100%, 420px); }
.ocard { display: grid; gap: 6px; }
BRNEON_EOF
echo "> Escribiendo src/core/storage.ts"
cat > "src/core/storage.ts" <<'BRNEON_EOF'
// localStorage seguro (Safari en modo privado puede lanzar excepciones)
const P = 'brneon:';
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(P + key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch { return fallback; }
}
export function save<T>(key: string, value: T) {
  try { localStorage.setItem(P + key, JSON.stringify(value)); } catch { /* ignorar */ }
}

export interface Settings {
  sound: boolean;
  ball: string;      // skin de la bolita (Pool)
  mallet1: string;   // skin paleta jugador 1
  mallet2: string;   // skin paleta jugador 2
  puck: string;      // skin del disco
  aiLevel: 'easy' | 'normal' | 'hard';
  goalsToWin: number;
  capyColor: string; // color neón del juego del capibara
}
export const defaultSettings: Settings = {
  sound: true, ball: 'cian', mallet1: 'cian', mallet2: 'magenta', puck: 'clasico', aiLevel: 'normal', goalsToWin: 7, capyColor: 'azul',
};
export const loadSettings = (): Settings => ({ ...defaultSettings, ...load<Partial<Settings>>('settings', {}) });
export const saveSettings = (s: Settings) => save('settings', s);
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
      ctx.translate(W / 2 - 6, W / 2 + 4);
      drawCapybara(ctx, W * 0.78, { glow: color, t, blink: (t % 3.2) > 3.05 });
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

export type MenuTarget = 'pool' | 'hockey-setup' | 'skins' | 'lucky' | 'game2048';
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
import Online from './ui/Online.tsx';
import type { OnlineGame } from './ui/Online.tsx';
import type { Link } from './net/link.ts';
import { loadSettings, saveSettings } from './core/storage.ts';
import type { Settings } from './core/storage.ts';
import { sfx } from './core/audio.ts';

type Screen = { name: 'online'; game?: OnlineGame; code?: string } | { name: 'online-game'; game: OnlineGame; link: Link } | { name: 'menu' } | { name: 'skins' } | { name: 'pool' } | { name: 'lucky' } | { name: 'game2048' } | { name: 'hockey-setup' } | { name: 'hockey'; players: 1 | 2 };

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
    case 'hockey-setup':
      return <HockeySetup settings={settings} onChange={patch} onBack={home} onStart={(players) => setScreen({ name: 'hockey', players })} onOnline={() => setScreen({ name: 'online', game: 'hockey' })} />;
    case 'hockey': return <HockeyGame key={screen.players} settings={settings} config={{ players: screen.players }} onExit={() => setScreen({ name: 'hockey-setup' })} />;
    default:
      return <Menu settings={settings} onChange={patch} go={(n) => setScreen({ name: n } as Screen)} />;
  }
}
BRNEON_EOF
echo "> Escribiendo src/ui/HockeySetup.tsx"
cat > "src/ui/HockeySetup.tsx" <<'BRNEON_EOF'
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void; onStart: (players: 1 | 2) => void; onOnline: () => void }

export default function HockeySetup({ settings, onChange, onBack, onStart, onOnline }: Props) {
  const lv: { id: Settings['aiLevel']; label: string }[] = [{ id: 'easy', label: 'Fácil' }, { id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Difícil' }];
  return (
    <main className="page scroll">
      <header className="pbar">
        <button className="ibtn" onClick={onBack} aria-label="Volver">‹</button>
        <h2>Air Hockey</h2>
      </header>
      <section className="panel">
        <h3>¿Cuántos juegan?</h3>
        <div className="row">
          <button className="btn cyan" onClick={() => { sfx.unlock(); sfx.click(); onStart(1); }}>1 jugador<small>contra la CPU</small></button>
          <button className="btn pink" onClick={() => { sfx.unlock(); sfx.click(); onStart(2); }}>2 jugadores<small>misma pantalla</small></button>
        </div>
        <button className="btn amber" onClick={() => { sfx.unlock(); sfx.click(); onOnline(); }}>Online con un amigo<small>crea una sala o entra con un código</small></button>
      </section>
      <section className="panel">
        <h3>Dificultad de la CPU</h3>
        <div className="seg">
          {lv.map((l) => <button key={l.id} className={settings.aiLevel === l.id ? 'on' : ''} onClick={() => onChange({ aiLevel: l.id })}>{l.label}</button>)}
        </div>
        <h3>Goles para ganar</h3>
        <div className="seg">
          {[3, 5, 7, 10].map((n) => <button key={n} className={settings.goalsToWin === n ? 'on' : ''} onClick={() => onChange({ goalsToWin: n })}>{n}</button>)}
        </div>
      </section>
      <section className="panel help">
        <h3>Controles</h3>
        <p><b>Celular:</b> arrastra el dedo en tu mitad. En 2 jugadores cada uno usa su lado, a la vez, sin que la página haga zoom. Gira el teléfono como prefieras.</p>
        <p><b>PC, 1 jugador:</b> mouse, o WASD / flechas.</p>
        <p><b>PC, 2 jugadores:</b> Jugador 1 con W A S D, Jugador 2 con las flechas. Pausa con Esc.</p>
      </section>
    </main>
  );
}
BRNEON_EOF
echo "> Escribiendo src/games/lucky/LuckyGame.tsx"
cat > "src/games/lucky/LuckyGame.tsx" <<'BRNEON_EOF'
import { useEffect, useMemo, useRef, useState } from 'react';
import { tileTheme } from '../../core/tiles.ts';
import { sfx } from '../../core/audio.ts';
import type { Link } from '../../net/link.ts';

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

function Result({ sum, trio, color, last, onNext, canNext = true }: { sum: number; trio: boolean; color: string; last: boolean; onNext: () => void; canNext?: boolean }) {
  const shown = useCountUp(sum * (trio ? 2 : 1));
  return (
    <div className="lresult" style={{ borderColor: color }}>
      <div className="lsum">
        <span>Suma {sum}{trio && <em> · ¡trío! x2</em>}</span>
        <b style={{ color }}>{shown}</b>
      </div>
      {canNext ? <button className="btn cyan" onClick={onNext}>{last ? 'Ver resultado' : 'Siguiente turno'}</button> : <span className="waiting">Esperando a tu rival…</span>}
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

export default function LuckyGame({ onExit, online, onOnline }: { onExit: () => void; online?: { link: Link }; onOnline?: () => void }) {
  const link = online?.link;
  const me: 0 | 1 = link && link.role === 'guest' ? 1 : 0;
  const [lost, setLost] = useState(false);
  const [mode, setMode] = useState<'cpu' | 'multi'>(link ? 'multi' : 'cpu');
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
  const isRemote = !!link && cur !== me;
  const advanceRef = useRef<() => void>(() => {});
  const startRef = useRef<() => void>(() => {});
  const S = useRef({ cur: 0, round: 0, scores: [] as number[], names: [] as string[], rounds: 1 });
  const color = COLORS[cur % COLORS.length];

  const startGame = () => {
    sfx.unlock(); sfx.click();
    const n = link ? 2 : mode === 'cpu' ? 2 : count;
    setNames(mode === 'cpu' ? ['Jugador 1', 'Máquina'] : Array.from({ length: n }, (_, i) => `Jugador ${i + 1}`));
    setScores(Array(n).fill(0)); cfgRounds.current = rounds;
    setRound(0); setCur(0); const v = newDeal(); setPhase('turn');
    if (link) link.send({ t: 'start', rounds, values: v });
  };
  const newDeal = (vals?: number[]) => { const v = vals ?? deal(); setValues(v); setPicked([]); setDone(null); setDealKey((k) => k + 1); return v; };

  const pick = (i: number) => {
    if (done || isCpu || isRemote || picked.length >= PICKS || picked.includes(i)) return;
    sfx.power(); setPicked((p) => [...p, i]);
    link?.send({ t: 'pick', i });
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
  const advance = () => {
    const st = S.current;
    const isLast = st.round === st.rounds - 1 && st.cur === st.names.length - 1;
    if (isLast) { setPhase('final'); sfx.win(); link?.send({ t: 'final', scores: st.scores }); return; }
    const nc = st.cur + 1 < st.names.length ? st.cur + 1 : 0;
    const nr = nc === 0 ? st.round + 1 : st.round;
    setCur(nc); setRound(nr);
    const v = newDeal();
    link?.send({ t: 'deal', values: v, cur: nc, round: nr, scores: st.scores });
  };
  advanceRef.current = advance;
  startRef.current = startGame;
  S.current = { cur, round, scores, names, rounds: cfgRounds.current };
  const next = () => {
    sfx.click();
    if (link && me === 1) { link.send({ t: 'next' }); return; }   // el invitado le avisa al anfitrión
    advance();
  };

  // ---- red
  useEffect(() => {
    if (!link) return;
    link.onMessage((m) => {
      if (m.t === 'start' && me === 1) {
        setNames(['Jugador 1', 'Jugador 2']); setScores([0, 0]); cfgRounds.current = Number(m.rounds) || 1;
        setRound(0); setCur(0); newDeal(m.values as number[]); setPhase('turn'); sfx.click();
      } else if (m.t === 'pick') { const i = Number(m.i); setPicked((p) => (p.includes(i) ? p : [...p, i])); sfx.power(); }
      else if (m.t === 'next' && me === 0) advanceRef.current();
      else if (m.t === 'rematch' && me === 0) startRef.current();
      else if (m.t === 'deal' && me === 1) { setScores(m.scores as number[]); setCur(Number(m.cur)); setRound(Number(m.round)); newDeal(m.values as number[]); }
      else if (m.t === 'final' && me === 1) { setScores(m.scores as number[]); setPhase('final'); sfx.win(); }
    });
    link.onClose(() => setLost(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const top = scores.length ? Math.max(...scores) : 0;
  const winners = names.filter((_, i) => scores[i] === top);

  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats"><b className="ltitle">Suerte 2048</b></div>
        {phase !== 'setup' && !link && <button className="ibtn" onClick={() => { sfx.click(); setPhase('setup'); }} aria-label="Ajustes">⚙</button>}
      </header>

      {phase === 'setup' && (
        <main className="page scroll lsetup">
          <section className="panel">
            <h3>Voltea 3 fichas y suma</h3>
            <p>Todas las fichas están ocultas con un <b>?</b>. En tu turno tocas 3: se voltean y se suman. Si las 3 son iguales, el puntaje se duplica. Gana quien más puntos junte, solo por suerte.</p>
          </section>
          <section className="panel">
            <h3>Modo</h3>
            {!link && (
              <div className="seg">
                <button className={mode === 'cpu' ? 'on' : ''} onClick={() => setMode('cpu')}>Contra la máquina</button>
                <button className={mode === 'multi' ? 'on' : ''} onClick={() => setMode('multi')}>Varios jugadores</button>
              </div>
            )}
            {!link && mode === 'multi' && <Stepper label="Jugadores" value={count} min={2} max={10} onChange={setCount} />}
            {(!link || me === 0) && <Stepper label="Rondas" value={rounds} min={1} max={5} onChange={setRounds} />}
            {link && me === 1 && <p className="waiting">Esperando a que el anfitrión elija las rondas y empiece<i>.</i><i>.</i><i>.</i></p>}
          </section>
          {(!link || me === 0) && <button className="btn cyan big" onClick={startGame}>Empezar</button>}
          {!link && onOnline && <button className="btn amber big" onClick={() => { sfx.unlock(); sfx.click(); onOnline(); }}>Online con un amigo<small>crea una sala o entra con un código</small></button>}
        </main>
      )}

      {phase === 'turn' && (
        <div className="lplay">
          <div className="chips">
            {names.map((n, i) => (
              <div key={i} className={'pchip' + (i === cur ? ' on' : '')} style={{ ['--pc' as string]: COLORS[i % COLORS.length] }}>
                <span>{n}{link && i === me ? ' (tú)' : ''}</span><b>{scores[i]}</b>
              </div>
            ))}
          </div>
          <div className="lmain">
            <div className="lturn" style={{ color }} key={'t' + dealKey}>
              {isCpu ? 'La máquina está eligiendo…' : link ? (cur === me ? 'Es tu turno' : 'Turno de tu rival') : `Turno de ${names[cur]}`}
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
                    onClick={() => pick(i)} disabled={flipped || !!done || isCpu || isRemote} aria-label={flipped ? `Ficha ${v}` : 'Ficha oculta'}>
                    <span className="face front">?</span>
                    <span className={'face back d' + String(v).length} style={{ background: th.bg, borderColor: th.border, color: th.text, boxShadow: flipped ? `0 0 18px ${th.bg}` : 'none' }}>{v}</span>
                  </button>
                );
              })}
            </div>
            {done ? <Result key={'r' + dealKey} sum={done.sum} trio={done.trio} color={color} last={lastTurn} onNext={next} canNext={!link || cur === me} />
              : <p className="hint">{isCpu || isRemote ? 'Mira cómo elige…' : 'Toca 3 fichas'}</p>}
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
            <button className="btn cyan" onClick={link && me === 1 ? () => { sfx.click(); link.send({ t: 'rematch' }); } : startGame}>{link && me === 1 ? 'Pedir revancha' : 'Jugar otra vez'}</button>
            {!link && <button className="btn ghost" onClick={() => setPhase('setup')}>Cambiar ajustes</button>}
          </div>
          <button className="btn ghost" onClick={onExit}>Menú</button>
        </main>
      )}
      {lost && (
        <div className="ov">
          <h2 className="ov-title pink">Tu rival se desconectó</h2>
          <p className="ov-text">La conexión se cerró. Vuelve al menú y crea otra sala.</p>
          <button className="btn cyan" onClick={onExit}>Menú</button>
        </div>
      )}
    </div>
  );
}
BRNEON_EOF
echo "> Escribiendo src/games/g2048/Game2048.tsx"
cat > "src/games/g2048/Game2048.tsx" <<'BRNEON_EOF'
import { useEffect, useRef, useState } from 'react';
import { canMove, move, newGame, N } from './engine.ts';
import type { Board, Dir, T } from './engine.ts';
import { tileTheme } from '../../core/tiles.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import { addScore, loadScores } from '../../core/scores.ts';
import type { ScoreEntry } from '../../core/scores.ts';
import Scoreboard from '../../ui/Scoreboard.tsx';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
interface Snap { tiles: T[]; score: number; nextId: number }

// Partida guardada en este dispositivo (localStorage) hasta que se borren los datos del sitio
interface Saved { tiles: T[]; score: number; nextId: number; won: boolean; keep: boolean; over: boolean }
const SAVE_KEY = 'g2048State';
function readSaved(): Saved | null {
  const s = load<Saved | null>(SAVE_KEY, null);
  if (!s || !Array.isArray(s.tiles) || s.tiles.length === 0 || typeof s.score !== 'number' || typeof s.nextId !== 'number') return null;
  const ok = s.tiles.every((t) => t && Number.isInteger(t.v) && t.v > 0 && t.r >= 0 && t.r < N && t.c >= 0 && t.c < N);
  return ok ? s : null;
}
const maxTile = (tiles: T[]) => tiles.filter((t) => !t.ghost).reduce((m, t) => Math.max(m, t.v), 0);

export default function Game2048({ onExit }: { onExit: () => void }) {
  const [init] = useState(readSaved);
  const [board, setBoard] = useState<Board>(() => (init ? { tiles: init.tiles.map((t) => ({ id: t.id, v: t.v, r: t.r, c: t.c })), score: init.score, nextId: init.nextId } : newGame()));
  const boardRef = useRef(board);
  const prev = useRef<Snap | null>(null);
  const [best, setBest] = useState(() => load('g2048Best', 0));
  const [over, setOver] = useState(!!init?.over);
  const [won, setWon] = useState(!!init?.won);
  const [keepGoing, setKeepGoing] = useState(!!init?.keep);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores('g2048'));
  const [showScores, setShowScores] = useState(false);
  const recorded = useRef(!!init?.over);   // la partida guardada que ya terminó ya está en el historial
  const [floats, setFloats] = useState<{ id: number; v: number }[]>([]);
  const wonRef = useRef(!!init?.won), keepRef = useRef(!!init?.keep), overRef = useRef(!!init?.over);
  const playRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<(d: Dir) => void>(() => {});

  const commit = (b: Board) => { boardRef.current = b; setBoard(b); };

  // guarda la partida en cada cambio
  useEffect(() => {
    const live = board.tiles.filter((t) => !t.ghost).map((t) => ({ id: t.id, v: t.v, r: t.r, c: t.c }));
    save(SAVE_KEY, { tiles: live, score: board.score, nextId: board.nextId, won, keep: keepGoing, over } satisfies Saved);
  }, [board, won, keepGoing, over]);

  // anota la partida en el historial (una sola vez por partida)
  const record = (b: Board) => {
    if (recorded.current || b.score <= 0) return;
    recorded.current = true;
    setScores(addScore('g2048', { score: b.score, extra: String(maxTile(b.tiles)) }));
  };

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
    if (!canMove(res.board.tiles)) { overRef.current = true; record(res.board); setTimeout(() => { setOver(true); sfx.lose(); }, 450); }
    setTimeout(() => commit({ ...boardRef.current, tiles: boardRef.current.tiles.filter((t) => !t.ghost) }), 170);
  };
  applyRef.current = apply;

  const restart = () => {
    sfx.click(); prev.current = null;
    record(boardRef.current); recorded.current = false;   // si abandonas una partida con puntos, también queda en el historial
    wonRef.current = false; keepRef.current = false; overRef.current = false;
    setWon(false); setKeepGoing(false); setOver(false);
    commit(newGame());
  };
  const undo = () => {
    const p = prev.current; if (!p) return;
    sfx.click(); prev.current = null; overRef.current = false; setOver(false); recorded.current = false;
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
        <button className="ibtn" onClick={() => { sfx.click(); setShowScores(true); }} aria-label="Historial de partidas">🏆</button>
        <button className="ibtn" onClick={undo} disabled={!prev.current} aria-label="Deshacer">↶</button>
        <button className="ibtn" onClick={restart} aria-label="Nueva partida">↻</button>
      </header>
      {showScores && <Scoreboard game="g2048" title="Historial 2048" list={scores} extraLabel="ficha " onChange={setScores} onClose={() => setShowScores(false)} />}
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
BRNEON_EOF

echo ""
echo "OK Actualización multi lista."
echo "   - Air Hockey y Suerte 2048: botón 'Online con un amigo' dentro de cada juego."
echo "   - 2048: botón 🏆 con historial; la partida se guarda en el dispositivo (hasta borrar datos del sitio)."
echo "   - Skins -> Capibara: color neón elegible (por defecto azul neón) y capibara cabezón y tierno."
echo "   Prueba con:  npm run dev"
