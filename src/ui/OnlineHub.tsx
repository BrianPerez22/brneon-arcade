// Sala online ya conectada (2 a 4 jugadores). El anfitrión elige el juego; los demás esperan y entran automáticamente.
// Aquí también vive el ranking de la sala: victorias de cada jugador mientras la sala siga abierta.
import { useEffect, useState } from 'react';
import { MAX_PLAYERS, SLOT_COLORS, supportsPlayers } from '../net/session.ts';
import type { Session, HubGame } from '../net/session.ts';
import { copyText, shareInvite } from '../net/invite.ts';
import { sfx } from '../core/audio.ts';

interface GameInfo { id: HubGame; title: string; desc: string; tags: string[]; cls: string }
export const HUB_GAMES: GameInfo[] = [
  { id: 'hockey', title: 'Air Hockey 🏒', desc: 'Duelo 1 contra 1. La física corre en el anfitrión.', tags: ['1v1', 'Goles'], cls: 'c-pink' },
  { id: 'capy', title: 'Capy Run 🫧', desc: 'Carrera con el fantasma de tu rival en vivo.', tags: ['1v1', 'Fantasma'], cls: 'c-cyan' },
  { id: 'lucky', title: 'Suerte 2048 🎲', desc: 'Por turnos: voltea 3 fichas y suma más que los demás.', tags: ['2-4 jugadores', 'Por turnos'], cls: 'c-amber' },
  { id: 'roulette', title: 'Ruleta Colombiana 🔫', desc: 'Revólver de agua: se turnan el gatillo hasta que a alguien le toque el chorro.', tags: ['2-4 jugadores', 'Tensión'], cls: 'c-pink' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props { session: Session; onPick: (g: HubGame) => void; onLeave: () => void }

export default function OnlineHub({ session, onPick, onLeave }: Props) {
  const host = session.isHost;
  const [rtt, setRtt] = useState(session.rtt);
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState('');
  useEffect(() => { const id = setInterval(() => setRtt(session.rtt), 1000); return () => clearInterval(id); }, [session]);
  // la sala avisa cuando entra/sale alguien o cambia el ranking
  useEffect(() => session.onChange(() => setTick((t) => t + 1)), [session]);

  const roster = session.roster;
  const count = roster.length;
  const alone = count < 2;
  const visible = HUB_GAMES.filter((g) => alone || supportsPlayers(g.id, count));
  const hidden = HUB_GAMES.length - visible.length;

  // ranking: más victorias primero; a igualdad, por orden de entrada
  const board = [...roster].sort((a, b) => b.wins - a.wins || a.slot - b.slot);
  const anyWin = board.some((m) => m.wins > 0);
  const top = board[0]?.wins ?? 0;

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(''), 1800); };
  const doCopy = async () => { sfx.click(); flash((await copyText(session.code)) ? 'code' : 'fail'); };
  const doShare = async () => {
    sfx.click();
    const r = await shareInvite(session.code, session.backendId === 'local');
    if (r === 'copied') flash('link'); else if (r === 'fail') flash('fail');
  };

  return (
    <main className="page scroll online hub">
      <header className="pbar">
        <button className="ibtn" onClick={() => { sfx.click(); onLeave(); }} aria-label="Salir de la sala">‹</button>
        <h2>Sala {session.code}</h2>
        <span className="hub-ping" title="Latencia">{rtt ? `${rtt} ms` : '…'}</span>
      </header>

      <section className="panel hub-status">
        <div className="hub-dots" aria-hidden>
          {Array.from({ length: MAX_PLAYERS }, (_, i) => <i key={i} className={i < count ? 'on' : ''} style={i < count ? { background: SLOT_COLORS[roster[i].slot], boxShadow: `0 0 12px ${SLOT_COLORS[roster[i].slot]}` } : undefined} />)}
        </div>
        <h3>{count} de {MAX_PLAYERS} jugadores</h3>
        {host
          ? alone
            ? <p className="waiting">Esperando a tus amigos<i>.</i><i>.</i><i>.</i></p>
            : <p>Elige el juego: se abrirá en todos los dispositivos al mismo tiempo.</p>
          : <p className="waiting">Esperando a que el anfitrión elija un juego<i>.</i><i>.</i><i>.</i></p>}
        {count < MAX_PLAYERS && (
          <div className="row hub-invite">
            <button className="btn cyan" onClick={doCopy}>{copied === 'code' ? '¡Copiado!' : `Código ${session.code}`}</button>
            <button className="btn pink" onClick={doShare}>{copied === 'link' ? '¡Enlace copiado!' : 'Invitar'}</button>
          </div>
        )}
        {copied === 'fail' && <p className="err">No se pudo copiar solo. Dile el código en voz alta o por chat.</p>}
      </section>

      <section className="panel board">
        <h3>🏆 Ranking de la sala</h3>
        <ol className="board-list">
          {board.map((m, k) => (
            <li key={m.slot} className={anyWin && m.wins === top && m.wins > 0 ? 'lead' : ''} style={{ ['--pc' as string]: SLOT_COLORS[m.slot % SLOT_COLORS.length] }}>
              <span className="board-pos">{anyWin && m.wins > 0 && k < 3 ? MEDALS[k] : k + 1}</span>
              <span className="board-dot" />
              <span className="board-name">{m.name}{m.slot === session.slot ? ' (tú)' : ''}</span>
              <b className="board-wins">{m.wins}<small>{m.wins === 1 ? 'victoria' : 'victorias'}</small></b>
            </li>
          ))}
        </ol>
        <p className="small">{anyWin ? 'Las victorias se cuentan hasta que la sala se cierre.' : 'Todavía nadie ha ganado: ¡a jugar! Las victorias se cuentan hasta que la sala se cierre.'}</p>
      </section>

      <nav className={'hub-games' + (host && !alone ? '' : ' locked')}>
        {visible.map((g) => (
          <button key={g.id} className={'cab arcade-cartridge ' + g.cls + ' hub-card'} disabled={!host || alone} onClick={() => { sfx.unlock(); sfx.click(); onPick(g.id); }}>
            <div className="cab-body">
              <span className="cab-t">{g.title}</span>
              <span className="cab-s">{g.desc}</span>
              <div className="cab-tags">{g.tags.map((t) => <i key={t}>{t}</i>)}</div>
            </div>
            {host && !alone && <div className="cart-action">JUGAR ▶</div>}
          </button>
        ))}
      </nav>
      {hidden > 0 && <p className="small">Air Hockey y Capy Run son 1 contra 1: solo aparecen cuando la sala tiene 2 jugadores.</p>}

      <button className="btn ghost" onClick={() => { sfx.click(); onLeave(); }}>Salir de la sala</button>
    </main>
  );
}
