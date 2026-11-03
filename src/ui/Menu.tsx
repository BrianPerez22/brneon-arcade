import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';
import { spritePath, DAY } from '../games/capy/sprites.ts';
import type { SpriteName } from '../games/capy/sprites.ts';

export type MenuTarget = 'pool' | 'hockey' | 'lucky' | 'game2048' | 'capy';
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
// Capy Run: mismos sprites retro del juego, dibujados como SVG
function Sprite({ name, x, y, scale }: { name: SpriteName; x: number; y: number; scale: number }) {
  return <path transform={`translate(${x} ${y}) scale(${scale})`} d={spritePath(name)} fill={DAY.ink} />;
}
function CapyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden shapeRendering="crispEdges">
      <rect width="120" height="80" fill={DAY.bg} />
      <rect x="70" y="14" width="22" height="3" fill={DAY.soft} /><rect x="14" y="22" width="18" height="3" fill={DAY.soft} />
      <rect x="0" y="62" width="120" height="3" fill={DAY.ink} />
      <Sprite name="capyA" x={10} y={39} scale={1.6} />
      <Sprite name="bambooTall" x={66} y={36} scale={1.6} />
      <Sprite name="crowUp" x={88} y={22} scale={1.6} />
    </svg>
  );
}

const GAMES: { id: MenuTarget; title: string; desc: string; color: string; art: JSX.Element; tags: string[] }[] = [
  { id: 'pool', title: 'Neon 2048 Pool', desc: 'Parte la ficha gigante a golpes de bola.', color: 'c-cyan', art: <PoolArt />, tags: ['1 jugador', 'Skins'] },
  { id: 'hockey', title: 'Air Hockey', desc: 'Contra la CPU o de a dos en la misma pantalla.', color: 'c-pink', art: <HockeyArt />, tags: ['1-2 jugadores', '3 dificultades', 'Skins'] },
  { id: 'lucky', title: 'Suerte 2048', desc: 'Voltea 3 fichas "?" y suma. Gana el que más junte.', color: 'c-amber', art: <LuckyArt />, tags: ['Vs máquina', 'Multijugador'] },
  { id: 'game2048', title: '2048', desc: 'El clásico: desliza y fusiona hasta llegar al 2048.', color: 'c-lime', art: <Art2048 />, tags: ['1 jugador', 'Récord'] },
  { id: 'capy', title: 'Capy Run', desc: 'Un capibara corre, salta bambú y esquiva cuervos.', color: 'c-green', art: <CapyArt />, tags: ['1 jugador', 'Récord', 'Pixel art'] },
];

export default function Menu({ settings, onChange, go }: Props) {
  const nav = (n: MenuTarget) => { sfx.unlock(); sfx.click(); go(n); };
  return (
    <main className="menu scroll">
      <button className="ibtn sound" onClick={() => { sfx.unlock(); onChange({ sound: !settings.sound }); }} aria-label={settings.sound ? 'Silenciar' : 'Activar sonido'} aria-pressed={settings.sound} title={settings.sound ? 'Sonido: sí' : 'Sonido: no'}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
          {settings.sound ? <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" /></> : <path d="M16 9l5 6M21 9l-5 6" />}
        </svg>
      </button>
      <header className="brand">
        <h1 className="tube" aria-label="brneon Arcade">
          <span className="br">br</span><span className="neon">neon</span>
        </h1>
        <p className="games">Arcade</p>
        <p className="tag">Juegos para el celular y el PC. Cada uno trae sus propios modos y botones.</p>
      </header>
      <section aria-label="Juegos">
        <h2 className="sec">Juegos <span>{GAMES.length}</span></h2>
        <nav className="cabs">
          {GAMES.map((g) => (
            <button key={g.id} className={'cab ' + g.color} onClick={() => nav(g.id)}>
              {g.art}
              <span className="cab-t">{g.title}</span>
              <span className="cab-s">{g.desc}</span>
              <span className="cab-tags">{g.tags.map((t) => <i key={t}>{t}</i>)}</span>
            </button>
          ))}
        </nav>
      </section>
      <footer className="foot"><span>brneon Arcade</span></footer>
    </main>
  );
}
