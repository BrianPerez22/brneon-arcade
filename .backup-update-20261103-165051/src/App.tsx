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
      return <Online initialGame={screen.game} initialCode={screen.code} onBack={home} onStart={(game, link) => setScreen({ name: 'online-game', game, link })} />;
    case 'online-game': {
      const leave = () => { screen.link.close(); setScreen({ name: 'menu' }); };
      return screen.game === 'hockey'
        ? <HockeyGame settings={settings} config={{ players: 2, online: { link: screen.link } }} onExit={leave} />
        : <LuckyGame online={{ link: screen.link }} onExit={leave} />;
    }
    case 'skins': return <Skins settings={settings} onChange={patch} onBack={home} />;
    case 'pool': return <PoolGame settings={settings} onExit={home} />;
    case 'lucky': return <LuckyGame onExit={home} />;
    case 'game2048': return <Game2048 onExit={home} />;
    case 'hockey-setup':
      return <HockeySetup settings={settings} onChange={patch} onBack={home} onStart={(players) => setScreen({ name: 'hockey', players })} />;
    case 'hockey': return <HockeyGame key={screen.players} settings={settings} config={{ players: screen.players }} onExit={() => setScreen({ name: 'hockey-setup' })} />;
    default:
      return <Menu settings={settings} onChange={patch} go={(n) => setScreen({ name: n } as Screen)} />;
  }
}
