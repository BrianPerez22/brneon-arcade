// BrNeon Arcade: interfaz principal estilo consola retro arcade profesional y tierna.
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

export type MenuTarget = 'pool' | 'hockey-setup' | 'skins' | 'lucky' | 'game2048' | 'capy' | 'roulette' | 'online';
interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; go: (n: MenuTarget) => void }

function PoolArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="80" fill="#0b081c" />
      <rect x="4" y="4" width="112" height="72" fill="none" stroke="#251a4a" strokeWidth="2" strokeDasharray="3 3" />
      {/* Ficha 2048 gigante */}
      <rect x="64" y="12" width="44" height="44" fill="#ff0055" stroke="#ffffff" strokeWidth="2" />
      <text x="86" y="38" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="8" fill="#fff">2048</text>
      {/* Fichas menores rebotando */}
      <rect x="14" y="48" width="18" height="18" fill="#ffb800" stroke="#fff580" strokeWidth="2" />
      <text x="23" y="60" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="7" fill="#000">4</text>
      <rect x="38" y="52" width="14" height="14" fill="#00ffcc" stroke="#99ffe6" strokeWidth="2" />
      <text x="45" y="62" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="6" fill="#000">2</text>
      {/* Bola blanca con guía de tiro estirable */}
      <circle cx="28" cy="24" r="10" fill="#00ffcc" />
      <circle cx="28" cy="24" r="5" fill="#0099ff" />
      <line x1="38" y1="28" x2="62" y2="34" stroke="#ffea00" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

function HockeyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="80" fill="#090718" />
      <rect x="4" y="6" width="112" height="68" fill="none" stroke="#2a2152" strokeWidth="2" />
      <line x1="60" y1="6" x2="60" y2="74" stroke="#9a93c4" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="2" y="28" width="4" height="24" fill="#19f4ff" />
      <rect x="114" y="28" width="4" height="24" fill="#ff2bd6" />
      <circle cx="28" cy="40" r="11" fill="#19f4ff" />
      <circle cx="28" cy="40" r="6" fill="#0a5d73" />
      <circle cx="92" cy="40" r="11" fill="#ff2bd6" />
      <circle cx="92" cy="40" r="6" fill="#6b0f5c" />
      <circle cx="60" cy="40" r="5" fill="#f4f1ff" stroke="#ffb800" strokeWidth="2" />
    </svg>
  );
}

function LuckyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="80" fill="#0f0c24" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={12 + i * 35} y="16" width="28" height="28" fill={i === 1 ? '#ffb800' : '#1d1545'} stroke={i === 1 ? '#ffffff' : '#3a2d7a'} strokeWidth="2" />
          <text x={26 + i * 35} y="35" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="11" fill={i === 1 ? '#2b1900' : '#19f4ff'}>{i === 1 ? '64' : '?'}</text>
        </g>
      ))}
      <rect x="34" y="56" width="52" height="16" fill="#ffb80022" stroke="#ffb800" strokeWidth="1.5" />
      <text x="60" y="68" textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize="8" fill="#ffb800">3 DE SUERTE</text>
    </svg>
  );
}

function Art2048() {
  const cells: [number, number, string, string][] = [
    [0, 0, '2', '#00ffcc'], [1, 0, '4', '#ff00aa'], [2, 0, '8', '#ff3300'],
    [0, 1, '16', '#ff8800'], [1, 1, '128', '#00ff66'], [2, 1, '2048', '#ff0055'],
  ];
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="80" fill="#0d0a22" />
      {cells.map(([c, r, v, col], i) => (
        <g key={i}>
          <rect x={14 + c * 32} y={12 + r * 28} width="28" height="24" fill={col} stroke="#07060f" strokeWidth="1.5" />
          <text x={28 + c * 32} y={28 + r * 28} textAnchor="middle" fontFamily="'Press Start 2P',monospace" fontSize={v.length > 3 ? 5 : 7} fill="#ffffff">{v}</text>
        </g>
      ))}
    </svg>
  );
}

function CapyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      {/* Fondo acuático con cielo */}
      <rect x="0" y="0" width="120" height="16" fill="#0b0830" />
      <rect x="0" y="16" width="120" height="64" fill="#06273a" />
      <path d="M0 16 Q15 13 30 16 T60 16 T90 16 T120 16" fill="none" stroke="#e1fdff" strokeWidth="1.5" />
      <rect x="0" y="66" width="120" height="14" fill="#0d2438" />
      <rect x="0" y="66" width="120" height="2" fill="#19f4ff" />

      {/* Capibara tierno estilo chibi de la interfaz */}
      <rect x="22" y="30" width="38" height="24" fill="#b6804e" stroke="#2c1a11" strokeWidth="2" />
      <rect x="52" y="34" width="14" height="18" fill="#7e4e2a" stroke="#2c1a11" strokeWidth="2" />
      <rect x="62" y="40" width="3" height="3" fill="#1c0f08" />
      <rect x="47" y="36" width="5" height="5" fill="#150c07" />
      <rect x="47" y="36" width="2" height="2" fill="#ffffff" />
      <rect x="44" y="44" width="6" height="3" fill="#ff729f" /> {/* rubor rosa */}
      <rect x="34" y="25" width="5" height="5" fill="#2c1a11" />
      <rect x="42" y="25" width="5" height="5" fill="#2c1a11" />
      <rect x="26" y="54" width="6" height="12" fill="#6c3e1c" stroke="#2c1a11" strokeWidth="1.5" />
      <rect x="36" y="54" width="6" height="12" fill="#6c3e1c" stroke="#2c1a11" strokeWidth="1.5" />
      <rect x="48" y="54" width="6" height="12" fill="#b6804e" stroke="#2c1a11" strokeWidth="1.5" />

      {/* Casco burbuja y mandarina */}
      <rect x="34" y="22" width="38" height="38" fill="#ffffff18" stroke="#19f4ff" strokeWidth="2" />
      <rect x="47" y="16" width="8" height="6" fill="#ff7a00" />
      <rect x="52" y="14" width="3" height="3" fill="#44cc22" />

      {/* Coral pixel */}
      <rect x="96" y="42" width="8" height="24" fill="#ff5b79" stroke="#240a18" strokeWidth="2" />
      <rect x="88" y="48" width="10" height="6" fill="#ff5b79" stroke="#240a18" strokeWidth="1.5" />
      <rect x="102" y="52" width="10" height="6" fill="#ff5b79" stroke="#240a18" strokeWidth="1.5" />
    </svg>
  );
}

function RouletteArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden>
      <rect x="0" y="0" width="120" height="80" fill="#14061a" />
      <rect x="4" y="4" width="112" height="72" fill="none" stroke="#3d1445" strokeWidth="2" strokeDasharray="3 3" />
      {/* Cañón del revólver pixel art */}
      <rect x="20" y="32" width="44" height="12" fill="#757599" stroke="#1d1d33" strokeWidth="2" />
      <rect x="18" y="30" width="6" height="4" fill="#a0a0cc" />
      {/* Tambor giratorio con 6 recámaras */}
      <circle cx="68" cy="38" r="16" fill="#4d4d66" stroke="#1d1d33" strokeWidth="2" />
      <circle cx="68" cy="38" r="13" fill="#2d2d44" />
      {/* Una recámara con agua azul brillante */}
      <circle cx="68" cy="28" r="3.5" fill="#00e5ff" stroke="#fff" strokeWidth="1" />
      <circle cx="76" cy="34" r="3" fill="#181829" />
      <circle cx="76" cy="42" r="3" fill="#181829" />
      <circle cx="68" cy="48" r="3" fill="#181829" />
      <circle cx="60" cy="42" r="3" fill="#181829" />
      <circle cx="60" cy="34" r="3" fill="#181829" />
      {/* Mango del arma */}
      <path d="M 76 44 L 90 70 L 78 72 L 68 50 Z" fill="#b33939" stroke="#1d1d33" strokeWidth="2" />
      <rect x="74" y="52" width="8" height="12" fill="#802020" />
      {/* Gatillo */}
      <path d="M 64 48 Q 61 56 66 56" fill="none" stroke="#a0a0cc" strokeWidth="2" />
      {/* Chorro o gotas de agua */}
      <circle cx="12" cy="38" r="3" fill="#00e5ff" />
      <circle cx="6" cy="35" r="2" fill="#80f0ff" />
      <circle cx="8" cy="43" r="1.5" fill="#80f0ff" />
    </svg>
  );
}

export default function Menu({ settings, onChange, go }: Props) {
  const nav = (n: MenuTarget) => { sfx.unlock(); sfx.click(); go(n); };

  return (
    <main className="menu scroll arcade-menu">
      {/* Barra de estado de consola retro */}
      <div className="arcade-os-bar">
        <span className="arcade-pill glow-cyan">● ARCADE OS</span>
        <span className="arcade-pill-center">🐾 CHIBI EDITION</span>
        <span className="arcade-pill glow-amber">📶 100% 🔋</span>
      </div>

      <header className="brand">
        <h1 className="tube" aria-label="BrNeon Arcade">
          <span className="br">Br</span><span className="neon">Neon</span>
          <span className="arcade-tag">ARCADE</span>
        </h1>
        <p className="arcade-subtitle">★ CONSOLA RETRO PIXEL ART ★</p>
        <p className="tag">Juega en solitario, en la misma pantalla o en línea con amigos.</p>
      </header>

      {/* Sala online única: el anfitrión elige el juego dentro de la sala */}
      <button className="online-hero" onClick={() => nav('online')}>
        <span className="oh-ico" aria-hidden>🌐</span>
        <span className="oh-txt">
          <b>JUGAR ONLINE CON UN AMIGO</b>
          <small>Crea una sala o únete con un código. El anfitrión elige el juego: Air Hockey, Capy Run, Suerte 2048 o Ruleta.</small>
        </span>
        <span className="oh-go">ENTRAR ▶</span>
      </button>

      {/* Selector de cartuchos retro */}
      <nav className="cabs arcade-grid">
        {/* 1. Capy Run */}
        <button className="cab c-cyan arcade-cartridge" onClick={() => nav('capy')}>
          <div className="cart-badge">🐾 RECOMENDADO</div>
          <CapyArt />
          <div className="cab-body">
            <span className="cab-t">Capy Run 🫧</span>
            <span className="cab-s">Corre por el fondo del mar: salta corales, esquiva medusas y reta a tu amigo con fantasma en vivo.</span>
            <div className="cab-tags">
              <i>🐾 1P Solo</i>
              <i>🌐 Duelo Online VS</i>
              <i>🍊 Tierno</i>
            </div>
          </div>
          <div className="cart-action">INSERT COIN ▶</div>
        </button>

        {/* 2. Ruleta Colombiana */}
        <button className="cab c-pink arcade-cartridge" onClick={() => nav('roulette')}>
          <div className="cart-badge" style={{ background: '#ff0055' }}>💦 NUEVO MODO</div>
          <RouletteArt />
          <div className="cab-body">
            <span className="cab-t">Ruleta Colombiana 🔫</span>
            <span className="cab-s">Revólver de agua pixel art: 6 recámaras, 1 sola bala de agua aleatoria. Pasa el arma entre 2-8 amigos o juega 1 contra 1 online.</span>
            <div className="cab-tags">
              <i>👥 Fiesta 2-8P</i>
              <i>🌐 Online 1v1</i>
              <i>💥 Tensión</i>
            </div>
          </div>
          <div className="cart-action">GIRAR TAMBOR ▶</div>
        </button>

        {/* 2. Neon 2048 Pool */}
        <button className="cab c-pink arcade-cartridge" onClick={() => nav('pool')}>
          <div className="cart-badge">⚡ COMBOS</div>
          <PoolArt />
          <div className="cab-body">
            <span className="cab-t">Neon 2048 Pool 🎱</span>
            <span className="cab-s">Billar con física elástica: ¡haz rebotar las fichas para crear combos masivos, pulveriza con Pixel y lanza fichas como bola!</span>
            <div className="cab-tags">
              <i>1 Jugador</i>
              <i>⚡ Rebotes</i>
              <i>💣 Power-ups</i>
            </div>
          </div>
          <div className="cart-action">JUGAR ▶</div>
        </button>

        {/* 3. Air Hockey */}
        <button className="cab c-pink arcade-cartridge" onClick={() => nav('hockey-setup')}>
          <HockeyArt />
          <div className="cab-body">
            <span className="cab-t">Air Hockey 🏒</span>
            <span className="cab-s">Duelos ultrarrápidos de disco: enfréntate a la CPU, juega de a 2 en la misma pantalla o reta a un amigo online.</span>
            <div className="cab-tags">
              <i>VS CPU</i>
              <i>2 Jugadores</i>
              <i>🌐 Online 1v1</i>
            </div>
          </div>
          <div className="cart-action">JUGAR ▶</div>
        </button>

        {/* 4. Suerte 2048 */}
        <button className="cab c-amber arcade-cartridge" onClick={() => nav('lucky')}>
          <LuckyArt />
          <div className="cab-body">
            <span className="cab-t">Suerte 2048 🎲</span>
            <span className="cab-s">Minijuego por turnos: voltea 3 fichas sorpresa '?' e intenta sumar la mayor puntuación de la mesa.</span>
            <div className="cab-tags">
              <i>Por turnos</i>
              <i>Contra CPU</i>
              <i>🌐 Online 1v1</i>
            </div>
          </div>
          <div className="cart-action">JUGAR ▶</div>
        </button>

        {/* 5. 2048 Clásico */}
        <button className="cab c-lime arcade-cartridge" onClick={() => nav('game2048')}>
          <Art2048 />
          <div className="cab-body">
            <span className="cab-t">2048 Clásico 🧩</span>
            <span className="cab-s">El legendario puzzle arcade: desliza las fichas numéricas, fusiónalas y desbloquea el bloque 2048.</span>
            <div className="cab-tags">
              <i>Puzzle</i>
              <i>Estrategia</i>
              <i>🏆 Récord</i>
            </div>
          </div>
          <div className="cart-action">JUGAR ▶</div>
        </button>
      </nav>

      {/* Barra de opciones de la consola */}
      <footer className="arcade-footer">
        <button className="btn cyan" onClick={() => nav('skins')}>
          🎨 Skins & Capys
        </button>
        <button className="btn pink" onClick={() => nav('online')}>
          🌐 Jugar Online
        </button>
        <button className="btn ghost" onClick={() => { sfx.unlock(); onChange({ sound: !settings.sound }); }}>
          {settings.sound ? '🔊 Sonido: ON' : '🔇 Sonido: OFF'}
        </button>
      </footer>
    </main>
  );
}
