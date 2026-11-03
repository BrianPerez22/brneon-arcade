import { useEffect, useState } from 'react';
import Menu from './ui/Menu.tsx';
import type { MenuTarget } from './ui/Menu.tsx';
import PoolGame from './games/pool/PoolGame.tsx';
import HockeyGame from './games/hockey/HockeyGame.tsx';
import LuckyGame from './games/lucky/LuckyGame.tsx';
import Game2048 from './games/g2048/Game2048.tsx';
import CapyGame from './games/capy/CapyGame.tsx';
import { loadSettings, saveSettings } from './core/storage.ts';
import type { Settings } from './core/storage.ts';
import { sfx } from './core/audio.ts';

// Cada juego trae sus propios botones (modos, dificultad, skins...) dentro de su interfaz.
type Screen = 'menu' | MenuTarget;

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => { sfx.enabled = settings.sound; saveSettings(settings); }, [settings]);
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  const home = () => setScreen('menu');

  switch (screen) {
    case 'pool': return <PoolGame settings={settings} onChange={patch} onExit={home} />;
    case 'hockey': return <HockeyGame settings={settings} onChange={patch} onExit={home} />;
    case 'lucky': return <LuckyGame onExit={home} />;
    case 'game2048': return <Game2048 onExit={home} />;
    case 'capy': return <CapyGame onExit={home} />;
    default: return <Menu settings={settings} onChange={patch} go={setScreen} />;
  }
}
