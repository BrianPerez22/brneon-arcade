import { useEffect, useRef, useState } from 'react';
import Menu from './ui/Menu.tsx';
import Skins from './ui/Skins.tsx';
import HockeySetup from './ui/HockeySetup.tsx';
import PoolGame from './games/pool/PoolGame.tsx';
import HockeyGame from './games/hockey/HockeyGame.tsx';
import LuckyGame from './games/lucky/LuckyGame.tsx';
import Game2048 from './games/g2048/Game2048.tsx';
import CapyGame from './games/capy/CapyGame.tsx';
import RouletteGame from './games/roulette/RouletteGame.tsx';
import Online from './ui/Online.tsx';
import OnlineHub from './ui/OnlineHub.tsx';
import { Session, newGid } from './net/session.ts';
import type { HubGame } from './net/session.ts';
import type { Link } from './net/link.ts';
import { loadSettings, saveSettings, sload, ssave } from './core/storage.ts';
import type { Settings } from './core/storage.ts';
import { sfx } from './core/audio.ts';

type OnlineScreen =
  | { name: 'online'; code?: string; local?: boolean }                       // lobby: crear sala / unirse con código
  | { name: 'hub'; session: Session }                                          // sala conectada: el anfitrión elige juego
  | { name: 'online-game'; session: Session; game: HubGame; link: Link };    // jugando dentro de la sala
type Screen = OnlineScreen | { name: 'menu' } | { name: 'skins' } | { name: 'pool' } | { name: 'lucky' } | { name: 'game2048' } | { name: 'capy' } | { name: 'roulette' } | { name: 'hockey-setup' } | { name: 'hockey'; players: 1 | 2 };

const isOnlineScreen = (s: Screen): s is OnlineScreen => s.name === 'online' || s.name === 'hub' || s.name === 'online-game';

// Enlace de invitación: ?sala=ABCDE  (el juego lo elige el anfitrión dentro de la sala)
function inviteFromUrl(): Screen | null {
  try {
    const q = new URLSearchParams(location.search);
    const code = q.get('sala');
    if (code) return { name: 'online', code, local: q.get('modo') === 'local' };
  } catch { /* sin URL */ }
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const invite = inviteFromUrl();
    if (invite) return invite;
    const saved = sload<Screen>('screen', { name: 'menu' });
    // No restaurar pantallas online (requieren conexión activa)
    if (isOnlineScreen(saved)) return { name: 'menu' };
    return saved;
  });
  const screenRef = useRef(screen); screenRef.current = screen;
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (t: string) => { setNotice(t); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 4000); };

  useEffect(() => { if (location.search) history.replaceState(null, '', location.pathname); }, []);
  useEffect(() => { if (!isOnlineScreen(screen)) ssave('screen', screen); }, [screen]);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => { sfx.enabled = settings.sound; saveSettings(settings); }, [settings]);
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  const home = () => setScreen({ name: 'menu' });

  // ---------------------------------------------------------------- sala online
  const inSession = (s: Session) => { const c = screenRef.current; return (c.name === 'hub' || c.name === 'online-game') && c.session === s; };
  const dropSession = (s: Session, msg: string) => {
    if (!inSession(s)) return;
    s.close(); setScreen({ name: 'menu' }); toast(msg);
  };
  /** La conexión quedó lista: se engancha la sala y se muestra el hub. */
  const attach = (session: Session) => {
    session.onHub((m) => {
      const cur = screenRef.current;
      if (m.t === 'hub:play' && !session.isHost) {
        if (cur.name === 'online-game') session.closeGame();
        const link = session.openGame(String(m.gid));
        setScreen({ name: 'online-game', session, game: m.game as HubGame, link });
      } else if (m.t === 'hub:back') {
        if (cur.name === 'online-game' && cur.session === session) { session.closeGame(); setScreen({ name: 'hub', session }); toast('Tu amigo salió del juego.'); }
      } else if (m.t === 'hub:bye') dropSession(session, 'Tu amigo salió de la sala.');
    });
    session.onClose(() => dropSession(session, 'Se perdió la conexión con tu amigo.'));
    setScreen({ name: 'hub', session });
  };
  const pickGame = (session: Session, game: HubGame) => {
    if (!session.isHost) return;
    const gid = newGid();
    const link = session.openGame(gid);
    session.sendHub('play', { game, gid });
    setScreen({ name: 'online-game', session, game, link });
  };
  const leaveGame = (s: { session: Session; link: Link }) => {
    s.session.closeGame(s.link);
    s.session.sendHub('back');
    setScreen({ name: 'hub', session: s.session });
  };

  switch (screen.name) {
    case 'online':
      return <Online initialCode={screen.code} initialLocal={screen.local} onBack={home} onConnected={attach} />;
    case 'hub':
      return (
        <>
          <OnlineHub session={screen.session} onPick={(g) => pickGame(screen.session, g)} onLeave={() => { screen.session.close(); home(); }} />
          {notice && <div className="toast" role="status">{notice}</div>}
        </>
      );
    case 'online-game': {
      const exit = () => leaveGame(screen);
      const link = screen.link;
      // key: cada partida nueva monta el juego desde cero
      if (screen.game === 'hockey') return <HockeyGame key={link.code + screen.game} settings={settings} onChange={patch} config={{ players: 2, online: { link } }} onExit={exit} />;
      if (screen.game === 'capy') return <CapyGame settings={settings} onChange={patch} online={{ link }} onExit={exit} />;
      if (screen.game === 'roulette') return <RouletteGame settings={settings} onChange={patch} online={{ link }} onExit={exit} />;
      return <LuckyGame settings={settings} onChange={patch} online={{ link }} onExit={exit} />;
    }
    case 'skins': return <Skins settings={settings} onChange={patch} onBack={home} />;
    case 'pool': return <PoolGame settings={settings} onChange={patch} onExit={home} />;
    case 'lucky': return <LuckyGame settings={settings} onChange={patch} onExit={home} />;
    case 'game2048': return <Game2048 settings={settings} onChange={patch} onExit={home} />;
    case 'capy': return <CapyGame settings={settings} onChange={patch} onExit={home} />;
    case 'roulette': return <RouletteGame settings={settings} onChange={patch} onExit={home} />;
    case 'hockey-setup':
      return <HockeySetup settings={settings} onChange={patch} onBack={home} onStart={(players) => setScreen({ name: 'hockey', players })} />;
    case 'hockey': return <HockeyGame key={screen.players} settings={settings} onChange={patch} config={{ players: screen.players }} onExit={() => setScreen({ name: 'hockey-setup' })} />;
    default:
      return (
        <>
          <Menu settings={settings} onChange={patch} go={(n) => setScreen({ name: n } as Screen)} />
          {notice && <div className="toast" role="status">{notice}</div>}
        </>
      );
  }
}
