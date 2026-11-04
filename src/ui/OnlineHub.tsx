// Sala online ya conectada. El anfitrión elige el juego; el invitado espera y entra automáticamente.
import { useEffect, useState } from 'react';
import type { Session, HubGame } from '../net/session.ts';
import { sfx } from '../core/audio.ts';

interface GameInfo { id: HubGame; title: string; desc: string; tags: string[]; cls: string }
export const HUB_GAMES: GameInfo[] = [
  { id: 'hockey', title: 'Air Hockey 🏒', desc: 'Duelo 1 contra 1. La física corre en el anfitrión.', tags: ['1v1', 'Goles'], cls: 'c-pink' },
  { id: 'capy', title: 'Capy Run 🫧', desc: 'Carrera con el fantasma de tu rival en vivo.', tags: ['Carrera', 'Fantasma'], cls: 'c-cyan' },
  { id: 'lucky', title: 'Suerte 2048 🎲', desc: 'Por turnos: voltea 3 fichas y suma más que tu rival.', tags: ['Por turnos', 'Suerte'], cls: 'c-amber' },
  { id: 'roulette', title: 'Ruleta Colombiana 🔫', desc: 'Revólver de agua: uno de los dos recibe el chorro.', tags: ['1v1', 'Tensión'], cls: 'c-pink' },
];

interface Props { session: Session; onPick: (g: HubGame) => void; onLeave: () => void }

export default function OnlineHub({ session, onPick, onLeave }: Props) {
  const host = session.isHost;
  const [rtt, setRtt] = useState(session.rtt);
  useEffect(() => { const id = setInterval(() => setRtt(session.rtt), 1000); return () => clearInterval(id); }, [session]);

  return (
    <main className="page scroll online hub">
      <header className="pbar">
        <button className="ibtn" onClick={() => { sfx.click(); onLeave(); }} aria-label="Salir de la sala">‹</button>
        <h2>Sala {session.code}</h2>
        <span className="hub-ping" title="Latencia">{rtt ? `${rtt} ms` : '…'}</span>
      </header>

      <section className="panel hub-status">
        <div className="hub-dots" aria-hidden><i className="on" /><i className="on" /></div>
        <h3>{host ? '¡Tu amigo ya está dentro!' : 'Conectado con el anfitrión'}</h3>
        {host
          ? <p>Elige el juego: se abrirá en los dos dispositivos al mismo tiempo.</p>
          : <p className="waiting">Esperando a que el anfitrión elija un juego<i>.</i><i>.</i><i>.</i></p>}
      </section>

      <nav className={'hub-games' + (host ? '' : ' locked')}>
        {HUB_GAMES.map((g) => (
          <button key={g.id} className={'cab ' + g.cls + ' hub-card'} disabled={!host} onClick={() => { sfx.unlock(); sfx.click(); onPick(g.id); }}>
            <div className="cab-body">
              <span className="cab-t">{g.title}</span>
              <span className="cab-s">{g.desc}</span>
              <div className="cab-tags">{g.tags.map((t) => <i key={t}>{t}</i>)}</div>
            </div>
            {host && <div className="cart-action">JUGAR ▶</div>}
          </button>
        ))}
      </nav>

      <button className="btn ghost" onClick={() => { sfx.click(); onLeave(); }}>Salir de la sala</button>
    </main>
  );
}
