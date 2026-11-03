import { useEffect, useRef, useState } from 'react';
import { BACKENDS, explainError } from '../net/backends.ts';
import { CODE_LEN, normalizeCode } from '../net/link.ts';
import type { Link } from '../net/link.ts';
import { sfx } from '../core/audio.ts';

export type OnlineGame = 'hockey' | 'lucky' | 'capy';
const GAME_NAME: Record<OnlineGame, string> = { hockey: 'Air Hockey', lucky: 'Suerte 2048', capy: 'Capy Run' };

interface Props {
  initialGame?: OnlineGame;
  initialCode?: string;           // viene de un enlace ?sala=XXXXX&juego=hockey
  onBack: () => void;
  onStart: (game: OnlineGame, link: Link) => void;
}

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* http en red local: no hay clipboard */ }
  try {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}

export default function Online({ initialGame, initialCode, onBack, onStart }: Props) {
  const [game, setGame] = useState<OnlineGame | null>(initialGame ?? null);
  const [view, setView] = useState<'choose' | 'host' | 'join'>(initialCode ? 'join' : 'choose');
  const [backendId, setBackendId] = useState<'peerjs' | 'local'>('peerjs');
  const [code, setCode] = useState('');           // código de la sala que creé
  const [input, setInput] = useState(initialCode ? normalizeCode(initialCode) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const linkRef = useRef<Link | null>(null);
  const handedOff = useRef(false);
  const autoJoined = useRef(false);

  // al salir del lobby sin haber empezado, se cierra la sala
  useEffect(() => () => { if (!handedOff.current) linkRef.current?.close(); }, []);

  const handOff = (link: Link) => { handedOff.current = true; sfx.beep(true); onStart(game!, link); };

  const create = async () => {
    sfx.unlock(); sfx.click();
    setError(''); setBusy(true); setView('host');
    try {
      const link = await BACKENDS[backendId].createRoom();
      linkRef.current = link; setCode(link.code);
      link.onConnect(() => handOff(link));
      link.onClose(() => setError('Se cerró la sala.'));
    } catch (e) { setError(explainError(e)); setView('choose'); }
    setBusy(false);
  };

  const join = async (c = input) => {
    sfx.unlock(); sfx.click();
    setError(''); setBusy(true);
    try {
      const link = await BACKENDS[backendId].joinRoom(c);
      linkRef.current = link;
      handOff(link);
    } catch (e) { setError(explainError(e)); }
    setBusy(false);
  };

  // enlace de invitación: entra solo
  useEffect(() => {
    if (initialCode && initialGame && !autoJoined.current && normalizeCode(initialCode).length === CODE_LEN) {
      autoJoined.current = true; void join(normalizeCode(initialCode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    sfx.click();
    if (view === 'host') cancelHost();
    else if (view === 'join') { setView('choose'); setError(''); if (!game) onBack(); }
    else if (game && !initialGame) setGame(null);
    else onBack();
  };
  const cancelHost = () => { linkRef.current?.close(); linkRef.current = null; setCode(''); setView('choose'); setError(''); };
  const inviteUrl = () => `${location.origin}${location.pathname}?sala=${code}&juego=${game}${backendId === 'local' ? '&modo=local' : ''}`;
  const doCopy = async (what: 'code' | 'link') => {
    sfx.click();
    const ok = await copyText(what === 'code' ? code : inviteUrl());
    setCopied(ok ? what : 'fail'); setTimeout(() => setCopied(''), 1800);
  };
  const share = async () => {
    sfx.click();
    const data = { title: 'BrNeon Arcade', text: `Juguemos ${game ? GAME_NAME[game] : ''} online. Código de sala: ${code}`, url: inviteUrl() };
    if (navigator.share) { try { await navigator.share(data); return; } catch { return; } }
    void doCopy('link');
  };

  return (
    <main className="page scroll online">
      <header className="pbar">
        <button className="ibtn" onClick={goBack} aria-label="Volver">‹</button>
        <h2>Online</h2>
      </header>

      {!game && (
        <section className="panel">
          <h3>¿A qué quieres jugar?</h3>
          <div className="gpick">
            <button className="cab c-pink" onClick={() => { sfx.click(); setGame('hockey'); }}><span className="cab-t">Air Hockey</span><span className="cab-s">1 contra 1, la física corre en el anfitrión.</span></button>
            <button className="cab c-cyan" onClick={() => { sfx.click(); setGame('capy'); }}><span className="cab-t">Capy Run</span><span className="cab-s">Carrera con fantasma en vivo del rival hasta el final.</span></button>
            <button className="cab c-amber" onClick={() => { sfx.click(); setGame('lucky'); }}><span className="cab-t">Suerte 2048</span><span className="cab-s">Por turnos: voltea 3 fichas y gana el que sume más.</span></button>
          </div>
        </section>
      )}

      {game && view === 'choose' && (
        <>
          <section className="panel">
            <h3>{GAME_NAME[game]} online</h3>
            <p>Crea una sala y comparte el <b>código de amistad</b>, o escribe el código de tu amigo. Para jugar en internet no hace falta cuenta.</p>
            <div className="row">
              <button className="btn cyan" disabled={busy} onClick={create}>Crear sala<small>tú eres el anfitrión</small></button>
              <button className="btn pink" onClick={() => { sfx.click(); setView('join'); setError(''); }}>Tengo un código<small>unirme a mi amigo</small></button>
            </div>
          </section>
          <label className="testmode">
            <input type="checkbox" checked={backendId === 'local'} onChange={(e) => setBackendId(e.target.checked ? 'local' : 'peerjs')} />
            <span>Modo prueba: dos pestañas del mismo navegador, sin internet</span>
          </label>
        </>
      )}

      {game && view === 'host' && (
        <section className="panel hostpanel">
          <h3>Código de amistad</h3>
          {code ? (
            <>
              <div className="codebox" aria-label={`Código ${code.split('').join(' ')}`}>
                {code.split('').map((ch, i) => <span key={i} style={{ animationDelay: `${i * 70}ms` }}>{ch}</span>)}
              </div>
              <div className="row">
                <button className="btn cyan" onClick={() => doCopy('code')}>{copied === 'code' ? '¡Copiado!' : 'Copiar código'}</button>
                <button className="btn pink" onClick={share}>{copied === 'link' ? '¡Enlace copiado!' : 'Compartir enlace'}</button>
              </div>
              {copied === 'fail' && <p className="err">No se pudo copiar solo. Dile el código en voz alta o por chat.</p>}
              <p className="waiting">Esperando a tu amigo<i>.</i><i>.</i><i>.</i></p>
              <p className="small">Tu amigo entra a la web, elige Online → Tengo un código, o abre el enlace compartido.</p>
            </>
          ) : <p className="waiting">Creando sala<i>.</i><i>.</i><i>.</i></p>}
        </section>
      )}

      {game && view === 'join' && (
        <section className="panel">
          <h3>Escribe el código de tu amigo</h3>
          <input className="codein" value={input} placeholder="• • • • •" maxLength={CODE_LEN}
            autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" aria-label="Código de sala"
            onChange={(e) => { setInput(normalizeCode(e.target.value)); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.length === CODE_LEN) void join(); }} />
          <button className="btn cyan big" disabled={busy || input.length !== CODE_LEN} onClick={() => join()}>{busy ? 'Conectando…' : 'Entrar a la sala'}</button>
        </section>
      )}

      {error && <p className="err" role="alert">{error}</p>}
    </main>
  );
}
