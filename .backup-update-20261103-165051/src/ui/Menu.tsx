import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

export type MenuTarget = 'pool' | 'hockey-setup' | 'skins' | 'lucky' | 'game2048' | 'online';
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

function OnlineArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <circle cx="24" cy="40" r="12" fill="#19f4ff" /><circle cx="24" cy="40" r="6" fill="#0a5d73" />
      <circle cx="96" cy="40" r="12" fill="#ff2bd6" /><circle cx="96" cy="40" r="6" fill="#6b0f5c" />
      <path d="M38 40 H82" stroke="#ffb800" strokeWidth="3" strokeDasharray="5 5"><animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" /></path>
      <text x="60" y="66" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="9" fill="#ffb800">A7K2P</text>
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
        <p className="tag">Arcade para jugar solo o de a dos, en el celular o en el PC.</p>
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
          <span className="cab-s">Voltea 3 fichas "?" y suma. Contra la máquina o varios jugadores.</span>
        </button>
        <button className="cab c-lime" onClick={() => nav('game2048')}>
          <Art2048 />
          <span className="cab-t">2048</span>
          <span className="cab-s">El clásico: desliza y fusiona hasta llegar al 2048.</span>
        </button>
        <button className="cab c-violet" onClick={() => nav('online')}>
          <OnlineArt />
          <span className="cab-t">Online con amigos</span>
          <span className="cab-s">Crea una sala, comparte el código y juega a distancia.</span>
        </button>
        <button className="cab c-pink" onClick={() => nav('hockey-setup')}>
          <HockeyArt />
          <span className="cab-t">Air Hockey</span>
          <span className="cab-s">Contra la CPU o de a dos en la misma pantalla.</span>
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
