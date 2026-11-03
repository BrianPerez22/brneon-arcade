import { useEffect, useState } from 'react';
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
import type { OnlineGame } from './ui/Online.tsx';
import type { Link } from './net/link.ts';
import { loadSettings, saveSettings, sload, ssave } from './core/storage.ts';
import type { Settings } from './core/storage.ts';
import { sfx } from './core/audio.ts';

type Screen = { name: 'online'; game?: OnlineGame; code?: string } | { name: 'online-game'; game: OnlineGame; link: Link } | { name: 'menu' } | { name: 'skins' } | { name: 'pool' } | { name: 'lucky' } | { name: 'game2048' } | { name: 'capy' } | { name: 'roulette' } | { name: 'hockey-setup' } | { name: 'hockey'; players: 1 | 2 };

// Enlace de invitación: ?sala=ABCDE&juego=hockey|lucky|capy
function inviteFromUrl(): Screen | null {
  try {
    const q = new URLSearchParams(location.search);
    const code = q.get('sala'), game = q.get('juego');
    if (code && (game === 'hockey' || game === 'lucky' || game === 'capy')) return { name: 'online', game, code };
  } catch { /* sin URL */ }
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (inviteFromUrl()) return inviteFromUrl()!;
    const saved = sload<Screen>('screen', { name: 'menu' });
    // No restaurar pantallas online (requieren conexión activa)
    if (saved.name === 'online' || saved.name === 'online-game') return { name: 'menu' };
    return saved;
  });
  useEffect(() => { if (location.search) history.replaceState(null, '', location.pathname); }, []);
  useEffect(() => { ssave('screen', screen); }, [screen]);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => { sfx.enabled = settings.sound; saveSettings(settings); }, [settings]);
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  const home = () => setScreen({ name: 'menu' });

  switch (screen.name) {
    case 'online':
      return <Online initialGame={screen.game} initialCode={screen.code} onBack={() => setScreen(screen.game === 'hockey' ? { name: 'hockey-setup' } : screen.game === 'capy' ? { name: 'capy' } : { name: 'lucky' })} onStart={(game, link) => setScreen({ name: 'online-game', game, link })} />;
    case 'online-game': {
      const leave = () => { screen.link.close(); setScreen(screen.game === 'hockey' ? { name: 'hockey-setup' } : screen.game === 'capy' ? { name: 'capy' } : { name: 'lucky' }); };
      if (screen.game === 'hockey') return <HockeyGame settings={settings} onChange={patch} config={{ players: 2, online: { link: screen.link } }} onExit={leave} />;
      if (screen.game === 'capy') return <CapyGame settings={settings} onChange={patch} online={{ link: screen.link }} onExit={leave} />;
      return <LuckyGame online={{ link: screen.link }} onExit={leave} />;
    }
    case 'skins': return <Skins settings={settings} onChange={patch} onBack={home} />;
    case 'pool': return <PoolGame settings={settings} onChange={patch} onExit={home} />;
    case 'lucky': return <LuckyGame settings={settings} onChange={patch} onExit={home} onOnline={() => setScreen({ name: 'online', game: 'lucky' })} />;
    case 'game2048': return <Game2048 settings={settings} onChange={patch} onExit={home} />;
    case 'capy': return <CapyGame settings={settings} onChange={patch} onExit={home} onOnline={() => setScreen({ name: 'online', game: 'capy' })} />;
    case 'roulette': return <RouletteGame settings={settings} onChange={patch} onExit={home} />;
    case 'hockey-setup':
      return <HockeySetup settings={settings} onChange={patch} onBack={home} onStart={(players) => setScreen({ name: 'hockey', players })} onOnline={() => setScreen({ name: 'online', game: 'hockey' })} />;
    case 'hockey': return <HockeyGame key={screen.players} settings={settings} onChange={patch} config={{ players: screen.players }} onExit={() => setScreen({ name: 'hockey-setup' })} />;
    default:
      return <Menu settings={settings} onChange={patch} go={(n) => setScreen({ name: n } as Screen)} />;
  }
}
