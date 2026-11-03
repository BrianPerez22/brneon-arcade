#!/usr/bin/env bash
# update.sh  ·  brneon Arcade
# Ejecútalo con:  bash update.sh      (desde la carpeta del proyecto, o desde la carpeta que la contiene)
#
# Qué hace:
#   1. Renombra todo a "brneon Arcade".
#   2. Menú reorganizado: solo juegos. Skins y modos de juego viven DENTRO de cada juego.
#   3. Air Hockey: Fácil (nueva, de verdad fácil) / Difícil (la antigua Normal) / Imposible (la antigua Difícil, con calavera SVG).
#   4. Juego nuevo: Capy Run (capibara pixel-art estilo dinosaurio de Google, bambú y cuervos).
# Antes de tocar nada guarda una copia de los archivos que cambia en  .backup-update-<fecha>/
set -euo pipefail

# ---------- localizar el proyecto
if [ -f package.json ] && [ -d src ]; then ROOT="."
else
  ROOT=""
  for d in */; do [ -f "$d/package.json" ] && [ -d "$d/src" ] && ROOT="${d%/}" && break; done
  [ -n "$ROOT" ] || { echo "No encuentro el proyecto. Ejecuta este script dentro de la carpeta brneon-arcade (donde está package.json)."; exit 1; }
fi
cd "$ROOT"
echo "Proyecto: $(pwd)"

STAMP="$(date +%Y%m%d-%H%M%S)"
BK=".backup-update-$STAMP"
mkdir -p "$BK"

backup() { # copia el archivo actual (si existe) antes de reemplazarlo
  if [ -f "$1" ]; then mkdir -p "$BK/$(dirname "$1")"; cp "$1" "$BK/$1"; fi
}
write_start() { backup "$1"; mkdir -p "$(dirname "$1")"; }

echo "  escribiendo README.md"
write_start 'README.md'
cat > 'README.md' <<'BRNEON_EOF_0'
# brneon Arcade

Arcade 100 % front-end (React + Vite + TypeScript, sin servidor) con cinco juegos. Cada juego trae sus propios botones dentro de su interfaz (modo de juego, dificultad, skins...):

* **Neon 2048 Pool** – lanza la bola contra fichas numeradas que se parten en dos. Skins de bolita dentro del juego.
* **Air Hockey** – 1 o 2 jugadores, dificultad Fácil / Difícil / Imposible (calavera), skins de paleta y disco; todo en la pantalla previa y en la pausa.
* **Suerte 2048** – voltea fichas y suma, contra la máquina o varios jugadores.
* **2048** – el clásico.
* **Capy Run** – estilo dinosaurio de Chrome: un capibara pixel-art salta bambú y se agacha ante los cuervos.

## Cómo correrlo

```bash
npm install
npm run dev
```

La terminal muestra algo así:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.25:5173/
```

Abre la dirección **Network** en el celular (misma red WiFi). Si no abre, permite Node.js en el firewall del PC.

Otros comandos: `npm run build` (producción en `dist/`), `npm run preview` (sirve `dist/` también con IP de red),
`npm run sim:pool` (bot que juega el Pool para comprobar el balance).

## Controles

| | Pool | Air Hockey 1 jugador | Air Hockey 2 jugadores |
|---|---|---|---|
| Celular | arrastra hacia atrás y suelta | arrastra el dedo | cada jugador arrastra en su mitad, a la vez |
| PC | mouse (arrastrar y soltar) | mouse, WASD o flechas | J1: W A S D · J2: flechas |

Pausa en hockey: `Esc` o `P`.

## Sobre el zoom de Safari en iPhone

Safari iOS ignora `user-scalable=no`, así que se bloquea por tres vías (ver `src/core/noZoom.ts` y `src/styles.css`):
eventos `gesturestart/change/end`, `touchmove`/`touchstart` con más de un dedo, y doble toque; además el canvas usa `touch-action: none`
y la página es `position: fixed` sin scroll. Cada dedo se sigue con su propio `pointerId`, por eso dos jugadores pueden tocar a la vez.

## Estructura

```
src/core/      audio, skins, almacenamiento, ajuste del canvas, bloqueo de zoom
src/games/pool/    engine.ts (física, sin DOM) + PoolGame.tsx
src/games/hockey/  engine.ts (física + IA)     + HockeyGame.tsx
src/games/capy/    sprites.ts (pixel art) + CapyGame.tsx
src/ui/        menú, selector de skins (se usa dentro de cada juego), calavera SVG
tools/         simulaciones de balance (Node 22+)
```

**Capy Run:** Espacio / flecha arriba salta, flecha abajo se agacha, P pausa. En el celular toca la pantalla (o «Saltar») y mantén «Agacharse».
BRNEON_EOF_0

echo "  escribiendo src/App.tsx"
write_start 'src/App.tsx'
cat > 'src/App.tsx' <<'BRNEON_EOF_1'
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
BRNEON_EOF_1

echo "  escribiendo src/core/audio.ts"
write_start 'src/core/audio.ts'
cat > 'src/core/audio.ts' <<'BRNEON_EOF_2'
// Sintetizador 8-bit con Web Audio. iOS exige crear/reanudar el contexto dentro de un gesto del usuario.
class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    } catch { /* sin audio */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, endFreq?: number, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  shoot() { this.tone(320, 0.15, 'square', 0.2, 80); }
  bounce() { this.tone(180, 0.08, 'triangle', 0.12, 90); }
  split(v: number) { const p = 200 + Math.log2(v || 2) * 40; this.tone(p, 0.05, 'square', 0.16); this.tone(p * 1.3, 0.07, 'square', 0.16, undefined, 0.04); }
  pop() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.08, 'square', 0.12, undefined, i * 0.04)); }
  bomb() { this.tone(150, 0.4, 'sawtooth', 0.3, 30); }
  power() { [440, 660, 880].forEach((f, i) => this.tone(f, 0.09, 'square', 0.14, undefined, i * 0.05)); }
  win() { [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.18, undefined, i * 0.07)); }
  lose() { [220, 180, 140, 90].forEach((f, i) => this.tone(f, 0.18, 'sawtooth', 0.2, undefined, i * 0.12)); }
  combo() { [600, 800, 1000, 1300].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.16, undefined, i * 0.05)); }
  // hockey
  puckHit(strength: number) { this.tone(260 + strength * 14, 0.07, 'square', 0.1 + Math.min(0.12, strength * 0.006), 120); }
  puckWall(strength: number) { this.tone(150 + strength * 6, 0.06, 'triangle', 0.08 + Math.min(0.08, strength * 0.004), 80); }
  goal() { [392, 523.25, 659.25, 784, 1046.5].forEach((f, i) => this.tone(f, 0.16, 'square', 0.16, undefined, i * 0.07)); }
  beep(high = false) { this.tone(high ? 880 : 520, 0.12, 'square', 0.14); }
  click() { this.tone(700, 0.04, 'square', 0.07); }
  // capy run
  jump() { this.tone(260, 0.16, 'square', 0.13, 640); }
  land() { this.tone(110, 0.05, 'triangle', 0.08, 70); }
  caw() { this.tone(520, 0.09, 'sawtooth', 0.05, 300); this.tone(470, 0.1, 'sawtooth', 0.05, 260, 0.11); }
  hit() { this.tone(220, 0.3, 'sawtooth', 0.22, 40); this.tone(110, 0.25, 'square', 0.14, 50, 0.05); }
}
export const sfx = new Sfx();

export function installAudioUnlock() {
  const unlock = () => sfx.unlock();
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((n) => window.addEventListener(n, unlock, { passive: true }));
}
BRNEON_EOF_2

echo "  escribiendo src/core/storage.ts"
write_start 'src/core/storage.ts'
cat > 'src/core/storage.ts' <<'BRNEON_EOF_3'
// localStorage seguro (Safari en modo privado puede lanzar excepciones)
const P = 'brneon:';
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(P + key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch { return fallback; }
}
export function save<T>(key: string, value: T) {
  try { localStorage.setItem(P + key, JSON.stringify(value)); } catch { /* ignorar */ }
}

export interface Settings {
  sound: boolean;
  ball: string;      // skin de la bolita (Pool)
  mallet1: string;   // skin paleta jugador 1
  mallet2: string;   // skin paleta jugador 2
  puck: string;      // skin del disco
  aiLevel: 'easy' | 'hard' | 'impossible';
  goalsToWin: number;
}
export const defaultSettings: Settings = {
  sound: true, ball: 'cian', mallet1: 'cian', mallet2: 'magenta', puck: 'clasico', aiLevel: 'easy', goalsToWin: 7,
};
export const loadSettings = (): Settings => {
  const s = { ...defaultSettings, ...load<Partial<Settings>>('settings', {}) };
  // las dificultades antiguas ('normal' ...) ya no existen: se vuelve a la nueva Fácil
  if (!['easy', 'hard', 'impossible'].includes(s.aiLevel)) s.aiLevel = 'easy';
  return s;
};
export const saveSettings = (s: Settings) => save('settings', s);
BRNEON_EOF_3

echo "  escribiendo src/games/capy/sprites.ts"
write_start 'src/games/capy/sprites.ts'
cat > 'src/games/capy/sprites.ts' <<'BRNEON_EOF_4'
// Sprites pixel-art (1 carácter = 1 píxel de arte). Generados a mano/por script; '.' = transparente.
export const PAL: Record<string, string> = {
  o: '#2e1a0c', b: '#b8814b', d: '#8a582c', l: '#e0b57a', n: '#1c1009', e: '#1c1009', w: '#ffffff', x: '#d11b3a',
  g: '#4fc46a', h: '#9af0a0', G: '#2a8a48', O: '#14452a',
  k: '#1d1a33', v: '#3a3566', y: '#f0b84a', r: '#6a5fc0',
};

export const SPRITES = {
  capyA: [
    "..............................",
    "..............................",
    "..............................",
    "...................ooo........",
    "..................odddooooo...",
    ".......oooooooooo.odddddddbo..",
    ".....ooddddddddddoobbbwebbnno.",
    "...ooddddddddddddddbbbbebbnno.",
    "..obbbbbbbbbbbbbbbbbbbbbbbnno.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    "..obbbbbbbbbbbbbbbbbbbllllllo.",
    "..obblllllllllllllldddoooooo..",
    "..obbbollllllllllbbodddo......",
    ".obbbo.odddoooooobbbdddo......",
    ".obbboodddo.....obbbodddo.....",
    "obbbo.odddo......obbbdddo.....",
    ".ooo...ooo........oooooo......",
    "onnno.onnno......onnnnnno....."
  ],
  capyB: [
    "..............................",
    "..............................",
    "..............................",
    "...................ooo........",
    "..................odddooooo...",
    ".......oooooooooo.odddddddbo..",
    ".....ooddddddddddoobbbwebbnno.",
    "...ooddddddddddddddbbbbebbnno.",
    "..obbbbbbbbbbbbbbbbbbbbbbbnno.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    "..obbbbbbbbbbbbbbbbbbbllllllo.",
    "...oollllllllllllllbbdddoooo..",
    ".....oollllllllllobbbdddo.....",
    "......oddbbbooooo.obbbdo......",
    ".......odbbbo.....obbbdo......",
    ".......obbbo......obbbo.......",
    "........ooo........ooo........",
    ".......onnno......onnno......."
  ],
  capyJump: [
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "...................ooo........",
    "..................odddooooo...",
    ".......oooooooooo.odddddddbo..",
    ".....ooddddddddddoobbbwebbnno.",
    "...ooddddddddddddddbbbbebbnno.",
    "..obbbbbbbbbbbbbbbbbbbbbbbnno.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    "..obbbbbbbbbbbbbbbbbbbllllllo.",
    ".ooddllllllllllllllbbodddooo..",
    "odddooollllllllllooobbbodddoo.",
    ".ooo.obbboooooooo...obbboodddo",
    "onnnoonnno..........onnnoonnno"
  ],
  capyDuck: [
    "..............................",
    "..............................",
    "..............................",
    ".......oooooooooo..ooo........",
    "...ooooddddddddddoodddooooo...",
    "..odddddddddddddddddddddddbo..",
    ".obbbbbbbbbbbbbbbbbbbbwebbnno.",
    "obbbbbbbbbbbbbbbbbbbbbbebbnno.",
    ".obbbbbbbbbbbbbbbbbbbbllllnno.",
    "..ollllllllllllllllbbbllllllo.",
    "...ooddllllllllllobbbbllllllo.",
    ".....oooooooooooo.oooooooooo..",
    "....onnnoonnno...onnnonnno...."
  ],
  capyDead: [
    "..............................",
    "..............................",
    "..............................",
    "...................ooo........",
    "..................odddooooo...",
    ".......oooooooooo.odddddddbo..",
    ".....ooddddddddddoobbbxbxbnno.",
    "...ooddddddddddddddbbbbxbbnno.",
    "..obbbbbbbbbbbbbbbbbbbxbxbnno.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    ".obbbbbbbbbbbbbbbbbbbbllllllo.",
    "..obbbbbbbbbbbbbbbbbbbllllllo.",
    "...odllllllllllllllbodddoooo..",
    "..odddollllllllllbbboodddo....",
    "..odddoobbbooooooobbbodddo....",
    ".odddo.obbbo.....obbboodddo...",
    "..ooo...ooo.......ooo..ooo....",
    "..ooo...ooo.......ooo..ooo....",
    ".onnno.onnno.....onnnoonnno..."
  ],
  bambooTall: [
    "........................",
    ".....O...........O......",
    "....OgO.........OgO.....",
    ".....OgO.......OgO......",
    "......OhO.....OhO.......",
    ".OO...OghO.O.OhgO.......",
    "OggOO..OghOgOhgO....OO..",
    ".OOggOO.OOgggOO...OOggO.",
    "..OgghhOOOhgGO..OOggOO..",
    "...OGgghhOhgGOOOhhggO...",
    "....OGGgghhgGOhhggGO....",
    ".....OOGOOhgGhggGGO.....",
    ".......O.OhgGOOGOO......",
    ".........OOOOO.O........",
    "........OGGGGGO.........",
    ".........OhgGO..........",
    ".......OOOhgGO..........",
    "..OOOOOhhhhgGO..........",
    ".OgggghggOhgGO..........",
    "..OOgggGOOhgGO..........",
    "....OGGO.OOOOO..........",
    ".....OO.OGGGGGO.........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO.........."
  ],
  bambooShort: [
    "........................",
    ".....O...........O......",
    "....OgO.........OgO.....",
    ".....OgO.......OgO......",
    "......OhO.....OhO.......",
    ".OO...OghO.O.OhgO.......",
    "OggOO..OghOgOhgO....OO..",
    ".OOggOO.OOgggOO...OOggO.",
    "..OgghhOOOhgGO..OOggOO..",
    "...OGgghhOhgGOOOhhggO...",
    "....OGGgghhgGOhhggGO....",
    ".....OOGOOhgGhggGGO.....",
    ".......O.OOOOOOGOO......",
    "........OGGGGGOO........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO..........",
    ".........OhgGO.........."
  ],
  crowUp: [
    "..........rkr.....",
    ".........rvvvr....",
    ".........rvvkkr...",
    "........rkvvkkkr..",
    "...rrrr.rvvkkkkkr.",
    "..rkkkkrkvkkkkkkkr",
    ".rkewkkkvkkkkkkkkk",
    "rryykkkkkkkkkkkkkr",
    "yyyykkkkkkkkkkkkr.",
    "rrrykkkvvvvvvvvkrr",
    "...rrvvvvvvvvvkkkk",
    ".....rrrrvrrrrrrrr",
    ".........r........",
    "..................",
    ".................."
  ],
  crowDown: [
    "..................",
    "..................",
    "..................",
    "..................",
    "...rrrr..r........",
    "..rkkkkrrkrrrrrrrr",
    ".rkewkkkkkkkkkkkkk",
    "rryykkkkkkkkkkkkkr",
    "yyyykkkkkkkkkkkkr.",
    "rrrykkkkvvvvvvvkrr",
    "...rrvvvkkkkkkkkkk",
    ".....rrrrvkkkkkrrr",
    ".........rvvkkr...",
    "..........rkvr....",
    "..........rkr....."
  ],
} as const;
export type SpriteName = keyof typeof SPRITES;

export const PX = 3; // cada píxel de arte se dibuja de 3x3 px lógicos
export const spriteSize = (n: SpriteName) => ({ w: SPRITES[n][0].length, h: SPRITES[n].length });

const cache = new Map<SpriteName, HTMLCanvasElement>();
/** Sprite ya "pintado" en un canvas del tamaño del arte; se dibuja ampliado sin suavizado. */
export function getSprite(n: SpriteName): HTMLCanvasElement {
  let c = cache.get(n);
  if (c) return c;
  const rows = SPRITES[n];
  c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.') { g.fillStyle = PAL[ch] ?? '#f0f'; g.fillRect(x, y, 1, 1); } } });
  cache.set(n, c);
  return c;
}

/** Para dibujar el mismo sprite como SVG (arte del menú): un <path> por color. */
export function spritePaths(n: SpriteName): { color: string; d: string }[] {
  const by = new Map<string, string>();
  SPRITES[n].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      by.set(ch, (by.get(ch) ?? '') + `M${x} ${y}h1v1h-1z`);
    }
  });
  return [...by.entries()].map(([ch, d]) => ({ color: PAL[ch] ?? '#f0f', d }));
}
BRNEON_EOF_4

echo "  escribiendo src/games/capy/CapyGame.tsx"
write_start 'src/games/capy/CapyGame.tsx'
cat > 'src/games/capy/CapyGame.tsx' <<'BRNEON_EOF_5'
// Capy Run: estilo "dinosaurio de Chrome". Un capibara pixel-art corre, salta bambú y se agacha ante los cuervos.
import { useEffect, useRef, useState } from 'react';
import { PX, getSprite, spriteSize } from './sprites.ts';
import type { SpriteName } from './sprites.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';

type Overlay = 'ready' | 'play' | 'pause' | 'over';
type Lane = 'low' | 'mid' | 'high';

// ---------- física (unidades: px lógicos y frames a 60 Hz)
const GRAVITY = 0.72, JUMP_V = 13.5, FAST_FALL = 3;
const SPEED0 = 6, SPEED_MAX = 14, ACCEL = 0.0024;
const CROW_EXTRA = 1.6;                      // los cuervos vuelan más rápido que el suelo
const LANE_LIFT: Record<Lane, number> = { low: 0, mid: 31, high: 75 }; // altura del borde inferior del sprite sobre el suelo
const FLOOR = 40;                            // franja de tierra bajo el suelo

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Part { sprite: SpriteName; dx: number }
interface Obstacle { kind: 'bamboo' | 'crow'; x: number; lift: number; w: number; h: number; parts: Part[]; boxes: Box[]; vx: number; lane?: Lane }
interface Dust { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number }

const SZ = (n: SpriteName) => { const s = spriteSize(n); return { w: s.w * PX, h: s.h * PX }; };
// cajas de colisión relativas a la esquina superior izquierda de cada sprite (px lógicos)
const CAPY_BOX: Box = { x0: 9, y0: 12, x1: 84, y1: 60 };
const CAPY_DUCK_BOX: Box = { x0: 9, y0: 9, x1: 84, y1: 36 };
const CROW_BOX: Box = { x0: 6, y0: 12, x1: 48, y1: 36 };
const STALK = { x0: 25, x1: 47 };           // el tallo (las hojas son decorativas: no cuentan)

function makeBamboo(count: number): Obstacle {
  const order: SpriteName[] = count === 1 ? [Math.random() < 0.5 ? 'bambooTall' : 'bambooShort'] : count === 2 ? ['bambooShort', 'bambooTall'] : ['bambooShort', 'bambooTall', 'bambooShort'];
  const parts: Part[] = []; const boxes: Box[] = [];
  let dx = 0, h = 0;
  for (const sprite of order) {
    const { w: sw, h: sh } = SZ(sprite);
    parts.push({ sprite, dx });
    boxes.push({ x0: dx + STALK.x0, x1: dx + STALK.x1, y0: 5 * PX, y1: sh }); // desde la punta del tallo
    h = Math.max(h, sh);
    dx += 14 * PX;
  }
  const w = dx - 14 * PX + SZ(order[order.length - 1]).w;
  return { kind: 'bamboo', x: 0, lift: 0, w, h, parts, boxes, vx: 0 };
}
function makeCrow(lane: Lane): Obstacle {
  const { w, h } = SZ('crowUp');
  return { kind: 'crow', x: 0, lift: LANE_LIFT[lane], w, h, parts: [{ sprite: 'crowUp', dx: 0 }], boxes: [CROW_BOX], vx: CROW_EXTRA, lane };
}

// ---------- colores (amanecer neón -> noche), se mezclan con nm 0..1
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const SKY_DAY = ['#3a1c78', '#7a2a9a', '#c4369a', '#ff5f8a', '#ff8f6a', '#ffc27a'];
const SKY_NIGHT = ['#03021a', '#080531', '#100a45', '#181059', '#201468', '#2a1a78'];

// decoración repetible: montañas, nubes, estrellas, hierbas
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const MOUNT_FAR = Array.from({ length: 48 }, (_, i) => 36 + Math.round(26 * Math.abs(Math.sin(i * 0.47) + 0.5 * Math.sin(i * 1.3))) );
const MOUNT_NEAR = Array.from({ length: 40 }, (_, i) => 14 + Math.round(16 * Math.abs(Math.sin(i * 0.9 + 1) + 0.4 * Math.sin(i * 2.1))));
const STARS = Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd() * 0.62, p: rnd() * 6 }));
const TUFTS = Array.from({ length: 70 }, () => ({ x: Math.round(rnd() * 2400), y: 8 + Math.round(rnd() * 24), k: rnd() < 0.55 ? 0 : 1 }));
const COL = 12; // ancho de columna de las montañas

export default function CapyGame({ onExit }: { onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<Overlay>('ready');
  const [overlay, setOverlayState] = useState<Overlay>('ready');
  const [hud, setHud] = useState({ score: 0, best: load<number>('capyHi', 0), blink: false });
  const [newBest, setNewBest] = useState(false);

  const g = useRef({
    speed: SPEED0, dist: 0, score: 0, best: load<number>('capyHi', 0), nm: 0, night: false,
    py: 0, vy: 0, duck: false, duckKey: false, duckBtn: false, onGround: true, dead: false, deadT: 0, anim: 0,
    obs: [] as Obstacle[], gap: 0, dust: [] as Dust[], dustT: 0, blink: 0, shake: 0,
    clouds: Array.from({ length: 6 }, (_, i) => ({ x: i * 190 + rnd() * 80, y: 20 + rnd() * 70, w: 6 + Math.floor(rnd() * 4) })),
    ground: 0, far: 0, near: 0, t: 0, lastShown: -1, lastShownScore: -1, view: { W: 600, H: 240, scale: 1, dpr: 1 },
  });

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };

  const reset = () => {
    const s = g.current;
    Object.assign(s, { speed: SPEED0, dist: 0, score: 0, nm: 0, night: false, py: 0, vy: 0, duck: false, onGround: true, dead: false, deadT: 0, anim: 0,
      obs: [], gap: 420, dust: [], dustT: 0, blink: 0, shake: 0, ground: 0, far: 0, near: 0, lastShown: -1, lastShownScore: -1 });
    setNewBest(false);
    setHud((h) => ({ ...h, score: 0, blink: false }));
  };
  const begin = () => { sfx.unlock(); sfx.click(); reset(); setOverlay('play'); };
  const pause = () => { if (overlayRef.current === 'play') setOverlay('pause'); };
  const resume = () => { sfx.unlock(); setOverlay('play'); };

  const jump = () => {
    const s = g.current;
    if (overlayRef.current === 'ready') { begin(); return; }
    if (overlayRef.current !== 'play' || s.dead) return;
    if (s.onGround) { s.vy = JUMP_V; s.onGround = false; s.duck = false; sfx.jump(); }
  };
  const setDuck = (v: boolean, src: 'key' | 'btn') => { if (src === 'key') g.current.duckKey = v; else g.current.duckBtn = v; };

  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = g.current;

    const refit = () => {
      const bw = Math.max(50, box.clientWidth), bh = Math.max(50, box.clientHeight);
      const W = Math.max(560, Math.min(960, Math.round(240 * bw / bh)));
      const H = Math.max(240, Math.min(360, Math.round(W * bh / bw)));
      const scale = Math.min(bw / W, bh / H);
      const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
      s.view = { W, H, scale: cssW / W, dpr };
    };
    refit();
    const ro = new ResizeObserver(refit); ro.observe(box);
    window.addEventListener('orientationchange', refit);

    // ------------------------------------------------ lógica
    const spawn = () => {
      const { W } = s.view;
      const last = s.obs[s.obs.length - 1];
      const lastRight = last ? last.x + last.w : -Infinity;
      const x = W + 30;
      if (x - lastRight < s.gap) return;
      let o: Obstacle;
      if (s.score >= 110 && Math.random() < Math.min(0.42, 0.18 + s.score / 4000)) {
        const r = Math.random();
        o = makeCrow(r < 0.3 ? 'low' : r < 0.78 ? 'mid' : 'high');
        sfx.caw();
      } else {
        const r = Math.random(), more = Math.min(0.25, s.score / 3000);
        o = makeBamboo(r < 0.5 - more ? 1 : r < 0.82 - more / 2 ? 2 : 3);
      }
      o.x = x;
      s.obs.push(o);
      // distancia hasta el siguiente: lo que se recorre en un salto + margen aleatorio
      s.gap = s.speed * 36 * (1 + Math.random() * 0.7) + 150 + (o.kind === 'crow' ? 80 : 0) + o.w * 0.4;
    };

    const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

    const die = () => {
      if (s.dead) return;
      s.dead = true; s.deadT = 0; s.shake = 10; sfx.hit();
      const final = Math.floor(s.score);
      if (final > s.best) { s.best = final; save('capyHi', final); setNewBest(true); setHud((h) => ({ ...h, best: final })); }
    };

    const puff = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) s.dust.push({ x, y, vx: -Math.random() * 2 - 0.4, vy: -Math.random() * 1.6, life: 0, max: 14 + Math.random() * 10, s: PX * (Math.random() < 0.5 ? 1 : 2) });
    };

    const update = () => {
      s.t += 1 / 60;
      const playing = overlayRef.current === 'play';
      s.nm += ((s.night ? 1 : 0) - s.nm) * 0.012;                  // transición día/noche suave
      s.clouds.forEach((c) => { c.x -= 0.15 + (playing && !s.dead ? s.speed * 0.05 : 0); if (c.x < -80) { c.x = s.view.W + 40 + rnd() * 120; c.y = 20 + rnd() * 70; } });
      if (s.dead) {
        s.deadT++; s.vy -= GRAVITY; s.py = Math.max(0, s.py + s.vy);
        if (s.py === 0) s.vy = 0;
        if (s.shake > 0) s.shake--;
        s.dust.forEach((d) => { d.x += d.vx; d.y += d.vy; d.life++; }); s.dust = s.dust.filter((d) => d.life < d.max);
        if (s.deadT === 36 && overlayRef.current === 'play') setOverlay('over');
        return;
      }
      if (!playing) return;

      s.speed = Math.min(SPEED_MAX, s.speed + ACCEL);
      s.dist += s.speed; s.score += s.speed * 0.05;
      s.ground = (s.ground + s.speed) % 2400; s.far = (s.far + s.speed * 0.12) % (MOUNT_FAR.length * COL); s.near = (s.near + s.speed * 0.3) % (MOUNT_NEAR.length * COL);
      s.anim++;

      // día/noche cada 500 puntos
      const phase = Math.floor(s.score / 500) % 2 === 1;
      if (phase !== s.night) s.night = phase;
      // hito de 100 puntos
      const hundred = Math.floor(s.score / 100);
      if (hundred > 0 && hundred !== s.lastShown) { if (s.lastShown >= 0) { sfx.power(); s.blink = 45; } s.lastShown = hundred; }
      if (s.blink > 0) s.blink--;

      // salto / agacharse
      s.duck = (s.duckKey || s.duckBtn);
      if (!s.onGround) {
        s.vy -= GRAVITY * (s.duck ? FAST_FALL : 1);
        s.py += s.vy;
        if (s.py <= 0) { s.py = 0; s.vy = 0; s.onGround = true; sfx.land(); puff(70, s.view.H - FLOOR, 6); }
      } else {
        s.dustT++;
        if (s.dustT % 7 === 0 && !s.duck) puff(24, s.view.H - FLOOR, 1);
      }

      // obstáculos
      spawn();
      for (const o of s.obs) o.x -= s.speed + o.vx;
      s.obs = s.obs.filter((o) => o.x + o.w > -20);

      // colisiones
      const capyX = 60;
      const ducking = s.duck && s.onGround;
      const sh = ducking ? SZ('capyDuck').h : SZ('capyA').h;
      const top = s.view.H - FLOOR - s.py - sh;
      const cb = ducking ? CAPY_DUCK_BOX : CAPY_BOX;
      const me: Box = { x0: capyX + cb.x0, x1: capyX + cb.x1, y0: top + cb.y0, y1: top + cb.y1 };
      for (const o of s.obs) {
        const oTop = s.view.H - FLOOR - o.lift - o.h;
        for (const b of o.boxes) {
          if (hits(me, { x0: o.x + b.x0, x1: o.x + b.x1, y0: oTop + b.y0, y1: oTop + b.y1 })) { die(); break; }
        }
        if (s.dead) break;
      }
      // HUD de React (solo cuando cambia el entero)
      const shown = Math.floor(s.score);
      if (shown !== s.lastShownScore) { s.lastShownScore = shown; setHud((h) => ({ ...h, score: shown, blink: s.blink > 0 })); }
    };

    // ------------------------------------------------ dibujo
    const spr = (name: SpriteName, x: number, y: number) => {
      const c = getSprite(name);
      ctx.drawImage(c, Math.round(x), Math.round(y), c.width * PX, c.height * PX);
    };

    const draw = () => {
      const { W, H, scale, dpr } = s.view;
      const GROUND = H - FLOOR;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const k = scale * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      const nm = s.nm;

      // cielo en franjas (look pixel)
      const bands = SKY_DAY.length, bh = Math.ceil(GROUND / bands);
      for (let i = 0; i < bands; i++) { ctx.fillStyle = mix(SKY_DAY[i], SKY_NIGHT[i], nm); ctx.fillRect(-10, i * bh, W + 20, bh + 1); }
      // estrellas
      if (nm > 0.05) {
        for (const st of STARS) { const tw = (Math.sin(s.t * 2 + st.p) + 1) / 2; ctx.globalAlpha = nm * (0.35 + tw * 0.65); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(st.x * W / PX) * PX, Math.round(st.y * GROUND / PX) * PX, PX, PX); }
        ctx.globalAlpha = 1;
      }
      // sol / luna (píxeles)
      const cx = Math.round(W * 0.78 / PX) * PX, cy = Math.round(GROUND * 0.3 / PX) * PX, R = 6;
      const disc = (col: string, a: number) => { if (a < 0.02) return; ctx.globalAlpha = a; ctx.fillStyle = col; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R + 1) ctx.fillRect(cx + x * PX, cy + y * PX, PX, PX); ctx.globalAlpha = 1; };
      disc('#ffe38a', 1 - nm);
      if (nm > 0.02) { disc('#e9f3ff', nm); ctx.globalAlpha = nm; ctx.fillStyle = '#b8c8e6'; ctx.fillRect(cx - 2 * PX, cy - 2 * PX, 2 * PX, 2 * PX); ctx.fillRect(cx + 1 * PX, cy + 1 * PX, 3 * PX, 2 * PX); ctx.fillRect(cx - 3 * PX, cy + 2 * PX, PX, PX); ctx.globalAlpha = 1; }
      // nubes
      ctx.fillStyle = mix('#ffd9ec', '#46398f', nm); ctx.globalAlpha = 0.55 + 0.1 * (1 - nm);
      for (const c of s.clouds) {
        const x = Math.round(c.x / PX) * PX, y = Math.round(c.y / PX) * PX, w = c.w * PX;
        ctx.fillRect(x, y, w, PX); ctx.fillRect(x + PX, y - PX, w - 3 * PX, PX); ctx.fillRect(x + 2 * PX, y - 2 * PX, Math.max(PX, w - 6 * PX), PX); ctx.fillRect(x - PX, y + PX, w + 2 * PX, PX);
      }
      ctx.globalAlpha = 1;
      // montañas lejanas y cercanas (columnas de 12 px)
      const layer = (arr: number[], off: number, col: string, base: number) => {
        ctx.fillStyle = col;
        const n = arr.length, first = Math.floor(off / COL), shift = off % COL;
        for (let i = 0; i <= W / COL + 1; i++) { const h = arr[(first + i) % n]; ctx.fillRect(i * COL - shift, base - Math.round(h / PX) * PX, COL + 1, Math.round(h / PX) * PX + 1); }
      };
      layer(MOUNT_FAR, s.far, mix('#7a3b8c', '#1a1052', nm), GROUND - 4);
      layer(MOUNT_NEAR, s.near, mix('#4a2670', '#0f0833', nm), GROUND);

      // suelo
      ctx.fillStyle = mix('#5a3a2c', '#241520', nm); ctx.fillRect(-10, GROUND, W + 20, FLOOR + 10);
      ctx.fillStyle = mix('#47b862', '#1f6a46', nm); ctx.fillRect(-10, GROUND, W + 20, PX * 2);
      ctx.fillStyle = mix('#2f8a48', '#134a32', nm); ctx.fillRect(-10, GROUND + PX * 2, W + 20, PX);
      for (const t of TUFTS) {
        const x = ((t.x - s.ground) % 2400 + 2400) % 2400 - 100;
        if (x > W + 20) continue;
        const px = Math.round(x / PX) * PX, py = GROUND + 3 * PX + Math.round(t.y / PX) * PX;
        if (py > H) continue;
        ctx.fillStyle = mix(t.k ? '#7a5a46' : '#3f9a58', t.k ? '#3b2a38' : '#18583c', nm);
        if (t.k) { ctx.fillRect(px, py, 2 * PX, PX); } else { ctx.fillRect(px, py, PX, PX); ctx.fillRect(px + 2 * PX, py, PX, PX); ctx.fillRect(px + PX, py - PX, PX, PX); }
      }

      // obstáculos
      for (const o of s.obs) {
        const top = GROUND - o.lift - o.h;
        if (o.kind === 'bamboo') for (const p of o.parts) spr(p.sprite, o.x + p.dx, GROUND - SZ(p.sprite).h);
        else spr(Math.floor(s.t * 8) % 2 ? 'crowUp' : 'crowDown', o.x, top);
      }

      // capibara
      const ducking = s.duck && s.onGround && !s.dead;
      const name: SpriteName = s.dead ? 'capyDead' : !s.onGround ? 'capyJump' : ducking ? 'capyDuck' : overlayRef.current !== 'play' ? 'capyA' : Math.floor(s.anim / 5) % 2 ? 'capyB' : 'capyA';
      const sh = SZ(name).h, capyY = GROUND - s.py - sh;
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; const shw = Math.max(30, 78 - s.py * 0.3); ctx.fillRect(60 + 6 + (78 - shw) / 2, GROUND + 1, shw, PX);
      spr(name, 60, capyY);

      // polvo
      for (const d of s.dust) { ctx.globalAlpha = 1 - d.life / d.max; ctx.fillStyle = mix('#e8d2b0', '#6a5a7a', nm); ctx.fillRect(Math.round(d.x / PX) * PX, Math.round(d.y / PX) * PX, d.s, d.s); }
      ctx.globalAlpha = 1;
    };

    // ------------------------------------------------ bucle
    let raf = 0, last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { acc -= STEP; update(); }
      draw();
    };
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------ entrada
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const jumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
      const duckKey = e.code === 'ArrowDown' || e.code === 'KeyS';
      if (jumpKey || duckKey) e.preventDefault();
      if (down) {
        if (jumpKey && !e.repeat) {
          if (overlayRef.current === 'over' && g.current.deadT > 45) begin();
          else if (overlayRef.current === 'pause') resume();
          else jump();
        }
        if (duckKey) setDuck(true, 'key');
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (overlayRef.current === 'play') pause(); else if (overlayRef.current === 'pause') resume(); }
      } else if (duckKey) setDuck(false, 'key');
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => { g.current.duckKey = false; g.current.duckBtn = false; pause(); };
    const vis = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', vis);
    const tap = (e: PointerEvent) => { e.preventDefault(); jump(); };
    canvas.addEventListener('pointerdown', tap);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('orientationchange', refit);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointerdown', tap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game capy">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className={'stat' + (hud.blink ? ' blink' : '')}><span>Puntos</span><b>{hud.score}</b></div>
          <div className="stat"><span>Récord</span><b>{hud.best}</b></div>
        </div>
        <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv pix" />
        {overlay === 'ready' && (
          <div className="ov">
            <h2 className="ov-title lime">Capy Run</h2>
            <p className="ov-text">Corre lo más lejos que puedas: salta el bambú y agáchate ante los cuervos. Cada vez va más rápido.</p>
            <ul className="legend how">
              <li><i>☝</i> Celular: toca la pantalla para saltar y mantén «Agacharse»</li>
              <li><i>⌨</i> PC: Espacio / ↑ salta · ↓ se agacha · P pausa</li>
            </ul>
            <button className="btn lime" onClick={begin}>¡Correr!</button>
          </div>
        )}
        {overlay === 'pause' && (
          <div className="ov">
            <h2 className="ov-title amber">Pausa</h2>
            <button className="btn lime" onClick={resume}>Continuar</button>
            <button className="btn ghost" onClick={begin}>Reiniciar</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'over' && (
          <div className="ov">
            <h2 className="ov-title pink">¡Ouch!</h2>
            <p className="ov-text">Puntos: <b>{hud.score}</b> · Récord: <b>{hud.best}</b>{newBest && <span className="newbest"> · ¡nuevo récord!</span>}</p>
            <button className="btn lime" onClick={begin}>Reintentar</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
      </div>
      <footer className="capy-ctl">
        <button className="btn lime" onPointerDown={(e) => { e.preventDefault(); jump(); }} aria-label="Saltar">▲ Saltar</button>
        <button className="btn ghost" onPointerDown={(e) => { e.preventDefault(); setDuck(true, 'btn'); }} onPointerUp={() => setDuck(false, 'btn')}
          onPointerLeave={() => setDuck(false, 'btn')} onPointerCancel={() => setDuck(false, 'btn')} onContextMenu={(e) => e.preventDefault()} aria-label="Agacharse">▼ Agacharse</button>
      </footer>
    </div>
  );
}
BRNEON_EOF_5

echo "  escribiendo src/games/hockey/HockeyGame.tsx"
write_start 'src/games/hockey/HockeyGame.tsx'
cat > 'src/games/hockey/HockeyGame.tsx' <<'BRNEON_EOF_6'
import { useEffect, useRef, useState } from 'react';
import { createHockey, step, setTarget, setKeys, aiThink, restart, HW, HH, GOAL, MALLET_R, PUCK_R } from './engine.ts';
import type { HockeyState, HEvent } from './engine.ts';
import { applyView, fitCanvas, toLogical } from '../../core/view.ts';
import type { View } from '../../core/view.ts';
import { drawMallet, drawPuck, MALLET_SKINS, PUCK_SKINS, findSkin } from '../../core/skins.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';
import SkinPicker from '../../ui/SkinPicker.tsx';
import Skull from '../../ui/Skull.tsx';

type Overlay = 'setup' | 'skins' | 'play' | 'pause' | 'over';
const LEVELS: { id: Settings['aiLevel']; label: string; hint: string }[] = [
  { id: 'easy', label: 'Fácil', hint: 'La CPU es lenta y casi no ataca.' },
  { id: 'hard', label: 'Difícil', hint: 'Defiende bien y ataca con ganas.' },
  { id: 'impossible', label: 'Imposible', hint: 'Rápida, precisa y sin piedad. Suerte.' },
];
interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; max: number }

const C0 = '#19f4ff', C1 = '#ff2bd6';
const FONT = `'Press Start 2P', ui-monospace, monospace`;

export default function HockeyGame({ settings, onChange, onExit }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const stateRef = useRef<HockeyState>(createHockey(settings.goalsToWin));
  const overlayRef = useRef<Overlay>('setup');
  const skinsBack = useRef<Overlay>('setup');
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const particles = useRef<Particle[]>([]);
  const flash = useRef<{ color: string; a: number }>({ color: C0, a: 0 });
  const banner = useRef<{ text: string; life: number }>({ text: '', life: 0 });
  const keys = useRef(new Set<string>());
  const pointers = useRef(new Map<number, 0 | 1>());
  const [overlay, setOverlayState] = useState<Overlay>('setup');
  const [players, setPlayers] = useState<1 | 2>(() => (load<number>('hockeyPlayers', 1) === 2 ? 2 : 1));
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const one = players === 1;

  const setOverlay = (o: Overlay) => { overlayRef.current = o; setOverlayState(o); };
  const begin = () => { sfx.unlock(); sfx.click(); stateRef.current.goalsToWin = settingsRef.current.goalsToWin; restart(stateRef.current); setScore([0, 0]); setWinner(null); setOverlay('play'); };
  const resume = () => { sfx.unlock(); setOverlay('play'); };
  const pause = () => { if (overlayRef.current === 'play') setOverlay('pause'); };
  const choosePlayers = (n: 1 | 2) => { sfx.unlock(); sfx.click(); setPlayers(n); save('hockeyPlayers', n); };
  const openSkins = () => {
    sfx.unlock(); sfx.click();
    const cur = overlayRef.current;
    skinsBack.current = cur === 'setup' ? 'setup' : 'pause';
    setOverlay('skins');
  };
  const closeSkins = () => setOverlay(skinsBack.current);
  const toSetup = () => { sfx.click(); setOverlay('setup'); };

  const burst = (x: number, y: number, color: string, n: number, speed = 6) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * speed + 1;
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, size: Math.random() * 3 + 2, life: 0, max: Math.random() * 18 + 12 });
    }
  };

  const handle = (s: HockeyState, evs: HEvent[]) => {
    for (const e of evs) {
      if (e.t === 'hit') { sfx.puckHit(e.v); burst(e.x, e.y, '#ffffff', Math.min(14, 3 + Math.floor(e.v / 2)), 4); }
      else if (e.t === 'wall') { sfx.puckWall(e.v); burst(e.x, e.y, '#9a93c4', 3, 2); }
      else if (e.t === 'goal') {
        sfx.goal(); flash.current = { color: e.scorer === 0 ? C0 : C1, a: 0.6 };
        burst(e.scorer === 0 ? HW : 0, HH / 2, e.scorer === 0 ? C0 : C1, 50, 9);
        banner.current = { text: '¡GOL!', life: 80 };
        setScore([s.score[0], s.score[1]]);
      } else if (e.t === 'count') { sfx.beep(); banner.current = { text: String(e.n), life: 40 }; }
      else if (e.t === 'go') { sfx.beep(true); banner.current = { text: '¡YA!', life: 40 }; }
      else if (e.t === 'over') { sfx.win(); setWinner(e.winner); setTimeout(() => setOverlay('over'), 900); }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const refit = () => { viewRef.current = fitCanvas(canvas, box, HW, HH); };
    refit();
    const ro = new ResizeObserver(refit); ro.observe(box);
    window.addEventListener('orientationchange', refit);

    let raf = 0, last = performance.now(), acc = 0, t = 0;
    const STEP = 1000 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      const s = stateRef.current;
      const playing = overlayRef.current === 'play' || (overlayRef.current === 'over' && s.phase !== 'OVER');
      while (acc >= STEP) {
        acc -= STEP; t += 1 / 60;
        if (playing) {
          // teclado
          const k = keys.current;
          const ax = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0), ay = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
          const bx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0), by = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
          if (one) setKeys(s, 0, Math.max(-1, Math.min(1, ax + bx)), Math.max(-1, Math.min(1, ay + by)));
          else { setKeys(s, 0, ax, ay); setKeys(s, 1, bx, by); }
          if (one) aiThink(s, settingsRef.current.aiLevel, 1);
          step(s);
          if (s.events.length) { const ev = s.events; s.events = []; handle(s, ev); }
        }
        particles.current.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life++; });
        particles.current = particles.current.filter((p) => p.life < p.max);
        if (flash.current.a > 0) flash.current.a -= 0.02;
        if (banner.current.life > 0) banner.current.life--;
      }
      draw(ctx, s, viewRef.current!, t);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (down) {
        keys.current.add(e.code);
        if ((e.code === 'Escape' || e.code === 'KeyP')) { overlayRef.current === 'play' ? pause() : overlayRef.current === 'pause' ? resume() : null; }
      } else keys.current.delete(e.code);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => { keys.current.clear(); pause(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', clear);
    const vis = () => { if (document.hidden) clear(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('orientationchange', refit);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- entrada táctil / mouse (varios dedos a la vez, uno por jugador)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pos = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return toLogical(viewRef.current!, e.clientX - r.left, e.clientY - r.top); };
    const aim = (e: PointerEvent, who: 0 | 1) => {
      const p = pos(e);
      const off = e.pointerType === 'touch' ? (who === 0 ? 34 : -34) : 0; // el dedo no tapa la paleta
      setTarget(stateRef.current, who, p.x + off, p.y);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      if (overlayRef.current !== 'play') return;
      const p = pos(e);
      const who: 0 | 1 = one ? 0 : p.x < HW / 2 ? 0 : 1;
      for (const [, w] of pointers.current) if (w === who) return; // ese jugador ya tiene un dedo
      pointers.current.set(e.pointerId, who);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
      aim(e, who);
    };
    const move = (e: PointerEvent) => {
      if (overlayRef.current !== 'play') return;
      const who = pointers.current.get(e.pointerId);
      if (who !== undefined) { e.preventDefault(); aim(e, who); }
      else if (one && e.pointerType === 'mouse') aim(e, 0); // PC: el mouse mueve tu paleta sin hacer clic
    };
    const up = (e: PointerEvent) => {
      const who = pointers.current.get(e.pointerId);
      if (who === undefined) return;
      e.preventDefault();
      pointers.current.delete(e.pointerId);
      const m = stateRef.current.mallets[who]; m.tx = m.x; m.ty = m.y;
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up);
    };
  }, [one]);

  const draw = (ctx: CanvasRenderingContext2D, s: HockeyState, v: View, t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    applyView(ctx, v);
    const upright = (x: number, y: number, extra: number, fn: () => void) => { ctx.save(); ctx.translate(x, y); ctx.rotate((v.portrait ? Math.PI / 2 : 0) + extra); fn(); ctx.restore(); };

    // superficie con agujeritos de aire
    const g = ctx.createLinearGradient(0, 0, HW, 0);
    g.addColorStop(0, '#0b1a2a'); g.addColorStop(0.5, '#0a0a1c'); g.addColorStop(1, '#240b26');
    ctx.fillStyle = g; ctx.fillRect(0, 0, HW, HH);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 12; x < HW; x += 24) for (let y = 12; y < HH; y += 24) ctx.fillRect(x, y, 2, 2);

    // marcador grande de fondo
    ctx.globalAlpha = 0.12;
    upright(HW * 0.25, HH / 2, 0, () => { ctx.fillStyle = C0; ctx.font = `120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(s.score[0]), 0, 0); });
    upright(HW * 0.75, HH / 2, v.portrait ? Math.PI : 0, () => { ctx.fillStyle = C1; ctx.font = `120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(s.score[1]), 0, 0); });
    ctx.globalAlpha = 1;

    // línea central y círculo
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(HW / 2, 0); ctx.lineTo(HW / 2, HH); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(HW / 2, HH / 2, 62, 0, Math.PI * 2); ctx.stroke();

    // bordes neón con hueco de portería
    const g0 = HH / 2 - GOAL / 2, g1 = HH / 2 + GOAL / 2;
    const rim = (color: string, x0: number, x1: number) => {
      ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.moveTo(x0, HH); ctx.lineTo(x1, HH); ctx.stroke();
      ctx.shadowBlur = 0;
    };
    rim(C0, 0, HW / 2); rim(C1, HW / 2, HW);
    ctx.lineWidth = 6; ctx.shadowBlur = 14;
    ctx.strokeStyle = C0; ctx.shadowColor = C0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, g0); ctx.moveTo(0, g1); ctx.lineTo(0, HH); ctx.stroke();
    ctx.strokeStyle = C1; ctx.shadowColor = C1; ctx.beginPath(); ctx.moveTo(HW, 0); ctx.lineTo(HW, g0); ctx.moveTo(HW, g1); ctx.lineTo(HW, HH); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
    // porterías
    ctx.fillStyle = C0 + '33'; ctx.fillRect(0, g0, 14, GOAL); ctx.fillStyle = C1 + '33'; ctx.fillRect(HW - 14, g0, 14, GOAL);
    ctx.fillStyle = C0; ctx.fillRect(0, g0 - 4, 14, 8); ctx.fillRect(0, g1 - 4, 14, 8);
    ctx.fillStyle = C1; ctx.fillRect(HW - 14, g0 - 4, 14, 8); ctx.fillRect(HW - 14, g1 - 4, 14, 8);
    ctx.strokeStyle = 'rgba(25,244,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, HH / 2, GOAL / 2 + 20, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,43,214,0.35)'; ctx.beginPath(); ctx.arc(HW, HH / 2, GOAL / 2 + 20, Math.PI / 2, (3 * Math.PI) / 2); ctx.stroke();

    // estela del disco
    const pk = s.puck;
    const sp = Math.hypot(pk.vx, pk.vy);
    if (sp > 3) pk.trail.forEach((tp, i) => { ctx.globalAlpha = (1 - i / pk.trail.length) * 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tp.x, tp.y, PUCK_R * (1 - i / 14), 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // paletas y disco
    const st = settingsRef.current;
    s.mallets.forEach((m, i) => { ctx.save(); ctx.translate(m.x, m.y); drawMallet(ctx, findSkin(MALLET_SKINS, i === 0 ? st.mallet1 : st.mallet2), MALLET_R, t); ctx.restore(); });
    ctx.save(); ctx.translate(pk.x, pk.y); ctx.rotate(t * Math.min(6, sp * 0.3) * 0.4 + pk.x * 0.02); drawPuck(ctx, findSkin(PUCK_SKINS, st.puck), PUCK_R, t); ctx.restore();

    for (const p of particles.current) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    if (flash.current.a > 0) { ctx.globalAlpha = flash.current.a * 0.5; ctx.fillStyle = flash.current.color; ctx.fillRect(0, 0, HW, HH); ctx.globalAlpha = 1; }

    if (banner.current.life > 0 && overlayRef.current === 'play') {
      const k = banner.current.life;
      const tx = banner.current.text;
      const parts: [number, number][] = v.portrait ? [[0, 0], [Math.PI, 0]] : [[0, 0]];
      // en vertical se muestra para ambos jugadores (uno boca abajo)
      parts.forEach(([extra], idx) => {
        upright(HW / 2 + (v.portrait ? (idx === 0 ? 0 : 0) : 0), HH / 2 + (v.portrait ? (idx === 0 ? 70 : -70) : 0), extra, () => {
          ctx.globalAlpha = Math.min(1, k / 20);
          ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffb800'; ctx.shadowBlur = 16;
          ctx.font = `${tx.length > 2 ? 40 : 64}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tx, 0, 0);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        });
      });
    }
  };

  const names: [string, string] = one ? ['Tú (izquierda)', 'CPU (derecha)'] : ['Jugador 1 (izquierda)', 'Jugador 2 (derecha)'];
  const level = LEVELS.find((l) => l.id === settings.aiLevel) ?? LEVELS[0];

  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats hockey-score">
          <b className="c0">{one ? 'Tú' : 'J1'} {score[0]}</b>
          <span className="to">a {settings.goalsToWin}</span>
          <b className="c1">{score[1]} {one ? (settings.aiLevel === 'impossible' ? <Skull size={14} /> : 'CPU') : 'J2'}</b>
        </div>
        <button className="tbtn" onClick={openSkins} aria-label="Skins">Skins</button>
        <button className="ibtn" onClick={() => (overlay === 'play' ? pause() : null)} aria-label="Pausa">❚❚</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />
        {overlay === 'setup' && (
          <div className="ov sheet">
            <div className="sheet-in">
              <h2 className="ov-title cyan">Air Hockey</h2>
              <section className="opt">
                <h3>Modo de juego</h3>
                <div className="seg two">
                  <button className={one ? 'on' : ''} onClick={() => choosePlayers(1)}>1 jugador<small>contra la CPU</small></button>
                  <button className={!one ? 'on pink' : ''} onClick={() => choosePlayers(2)}>2 jugadores<small>misma pantalla</small></button>
                </div>
              </section>
              {one && (
                <section className="opt">
                  <h3>Dificultad de la CPU</h3>
                  <div className="seg">
                    {LEVELS.map((l) => (
                      <button key={l.id} className={(settings.aiLevel === l.id ? 'on ' : '') + (l.id === 'impossible' ? 'skullbtn' : '')} onClick={() => { sfx.click(); onChange({ aiLevel: l.id }); }}>
                        {l.id === 'impossible' && <Skull size={16} />}{l.label}
                      </button>
                    ))}
                  </div>
                  <p className="opt-hint">{level.hint}</p>
                </section>
              )}
              <section className="opt">
                <h3>Goles para ganar</h3>
                <div className="seg">
                  {[3, 5, 7, 10].map((n) => <button key={n} className={settings.goalsToWin === n ? 'on' : ''} onClick={() => { sfx.click(); onChange({ goalsToWin: n }); }}>{n}</button>)}
                </div>
              </section>
              <ul className="legend how">
                {one ? (
                  <>
                    <li><i>☝</i> Celular: arrastra el dedo</li>
                    <li><i>⌨</i> PC: mouse, WASD o flechas</li>
                  </>
                ) : (
                  <>
                    <li><i>☝☝</i> Celular: cada uno arrastra en su mitad, a la vez</li>
                    <li><i>⌨</i> PC: J1 = W A S D · J2 = flechas</li>
                  </>
                )}
              </ul>
              <div className="sheet-actions">
                <button className="btn ghost" onClick={openSkins}>Skins</button>
                <button className="btn cyan" onClick={begin}>¡Jugar!</button>
              </div>
            </div>
          </div>
        )}
        {overlay === 'skins' && <SkinPicker kinds={['mallet', 'puck']} settings={settings} onChange={onChange} onClose={closeSkins} players={names} />}
        {overlay === 'pause' && (
          <div className="ov">
            <h2 className="ov-title amber">Pausa</h2>
            <button className="btn cyan" onClick={resume}>Continuar</button>
            <button className="btn ghost" onClick={begin}>Reiniciar partido</button>
            <button className="btn ghost" onClick={openSkins}>Skins</button>
            <button className="btn ghost" onClick={toSetup}>Cambiar modo / dificultad</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'over' && (
          <div className="ov">
            <h2 className={'ov-title ' + (winner === 0 ? 'cyan' : 'pink')}>
              {one ? (winner === 0 ? '¡Ganaste!' : 'Gana la CPU') : winner === 0 ? 'Gana el Jugador 1' : 'Gana el Jugador 2'}
            </h2>
            <p className="ov-text">{score[0]} – {score[1]}</p>
            <button className="btn cyan" onClick={begin}>Revancha</button>
            <button className="btn ghost" onClick={toSetup}>Cambiar modo / dificultad</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
      </div>
    </div>
  );
}
BRNEON_EOF_6

echo "  escribiendo src/games/hockey/engine.ts"
write_start 'src/games/hockey/engine.ts'
cat > 'src/games/hockey/engine.ts' <<'BRNEON_EOF_7'
// Motor de Air Hockey. Campo apaisado 800x450. Jugador 0 = izquierda, jugador 1 = derecha.
export const HW = 800;
export const HH = 450;
export const GOAL = 170;           // ancho de la portería
export const MALLET_R = 36;
export const PUCK_R = 20;
const POST_R = 7;
const SUBSTEPS = 4;
const PUCK_FRICTION = 0.9935;
const WALL_E = 0.93;
const MAX_PUCK = 30;
const MAX_MALLET_SPEED = 28;
const KEY_SPEED = 12;

export type HEvent =
  | { t: 'hit'; x: number; y: number; v: number }
  | { t: 'wall'; x: number; y: number; v: number }
  | { t: 'goal'; scorer: 0 | 1 }
  | { t: 'count'; n: number }
  | { t: 'go' }
  | { t: 'over'; winner: 0 | 1 };

export interface Mallet {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;               // objetivo (táctil / mouse / IA)
  kx: number; ky: number;               // dirección de teclado -1..1
  mode: 'target' | 'keys';
  maxSpeed: number;
}
export interface Puck { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] }

export interface HockeyState {
  mallets: [Mallet, Mallet];
  puck: Puck;
  score: [number, number];
  goalsToWin: number;
  phase: 'COUNT' | 'PLAY' | 'GOAL' | 'OVER';
  timer: number;                       // frames restantes de la fase actual
  serve: 0 | 1;                        // de quién es el saque
  winner: 0 | 1 | null;
  events: HEvent[];
  lastTouch: 0 | 1 | null;
}

const newMallet = (x: number): Mallet => ({ x, y: HH / 2, vx: 0, vy: 0, tx: x, ty: HH / 2, kx: 0, ky: 0, mode: 'target', maxSpeed: MAX_MALLET_SPEED });

export function createHockey(goalsToWin = 7): HockeyState {
  const s: HockeyState = {
    mallets: [newMallet(110), newMallet(HW - 110)],
    puck: { x: HW / 2, y: HH / 2, vx: 0, vy: 0, trail: [] },
    score: [0, 0], goalsToWin, phase: 'COUNT', timer: 150, serve: Math.random() < 0.5 ? 0 : 1,
    winner: null, events: [], lastTouch: null,
  };
  placeServe(s);
  return s;
}

function placeServe(s: HockeyState) {
  s.puck.x = s.serve === 0 ? HW / 2 - 130 : HW / 2 + 130;
  s.puck.y = HH / 2; s.puck.vx = 0; s.puck.vy = 0; s.puck.trail = [];
}

/** Límites de movimiento de cada paleta (su mitad del campo) */
function bounds(i: 0 | 1) {
  return i === 0
    ? { x0: MALLET_R + 4, x1: HW / 2 - MALLET_R, y0: MALLET_R + 4, y1: HH - MALLET_R - 4 }
    : { x0: HW / 2 + MALLET_R, x1: HW - MALLET_R - 4, y0: MALLET_R + 4, y1: HH - MALLET_R - 4 };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function setTarget(s: HockeyState, i: 0 | 1, x: number, y: number) {
  const m = s.mallets[i]; m.tx = x; m.ty = y; m.mode = 'target';
}
export function setKeys(s: HockeyState, i: 0 | 1, kx: number, ky: number) {
  const m = s.mallets[i];
  if (kx !== 0 || ky !== 0) m.mode = 'keys';
  m.kx = kx; m.ky = ky;
  if (m.mode === 'keys' && kx === 0 && ky === 0) { m.tx = m.x; m.ty = m.y; }
}

function moveMallet(s: HockeyState, i: 0 | 1, dt: number) {
  const m = s.mallets[i];
  const b = bounds(i);
  const ox = m.x, oy = m.y;
  if (s.phase === 'OVER') { m.vx = m.vy = 0; return; }
  if (m.mode === 'keys') {
    const len = Math.hypot(m.kx, m.ky) || 1;
    const tvx = (m.kx / len) * KEY_SPEED * (m.kx || m.ky ? 1 : 0);
    const tvy = (m.ky / len) * KEY_SPEED * (m.kx || m.ky ? 1 : 0);
    m.vx += (tvx - m.vx) * 0.22; m.vy += (tvy - m.vy) * 0.22;
    m.x += m.vx * dt; m.y += m.vy * dt;
  } else {
    let dx = m.tx - m.x, dy = m.ty - m.y;
    dx = clamp(m.tx, b.x0, b.x1) - m.x; dy = clamp(m.ty, b.y0, b.y1) - m.y;
    const d = Math.hypot(dx, dy);
    const sp = Math.min(m.maxSpeed, d * 0.55);
    if (d > 0.01) { m.x += (dx / d) * sp * dt; m.y += (dy / d) * sp * dt; }
  }
  m.x = clamp(m.x, b.x0, b.x1); m.y = clamp(m.y, b.y0, b.y1);
  m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt;
}

function collideMallet(s: HockeyState, i: 0 | 1) {
  const m = s.mallets[i], p = s.puck;
  const dx = p.x - m.x, dy = p.y - m.y;
  const d = Math.hypot(dx, dy), min = MALLET_R + PUCK_R;
  if (d >= min) return;
  const nx = d > 0.0001 ? dx / d : (i === 0 ? 1 : -1), ny = d > 0.0001 ? dy / d : 0;
  p.x = m.x + nx * min; p.y = m.y + ny * min;
  const rvn = (p.vx - m.vx) * nx + (p.vy - m.vy) * ny;
  if (rvn < 0) {
    const e = 0.96;
    p.vx -= (1 + e) * rvn * nx; p.vy -= (1 + e) * rvn * ny;
    // un poco del movimiento de la paleta se transfiere siempre (golpe "con efecto")
    p.vx += m.vx * 0.12; p.vy += m.vy * 0.12;
    const v = Math.hypot(p.vx, p.vy);
    if (v > MAX_PUCK) { p.vx *= MAX_PUCK / v; p.vy *= MAX_PUCK / v; }
    s.lastTouch = i;
    s.events.push({ t: 'hit', x: p.x - nx * PUCK_R, y: p.y - ny * PUCK_R, v: Math.min(30, Math.abs(rvn)) });
  }
  // si el disco queda aplastado contra una pared, empuja un poco a la paleta hacia atrás
  const b = bounds(i);
  m.x = clamp(m.x, b.x0, b.x1); m.y = clamp(m.y, b.y0, b.y1);
}

function collidePost(s: HockeyState, px: number, py: number) {
  const p = s.puck;
  const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy), min = PUCK_R + POST_R;
  if (d < min && d > 0.0001) {
    const nx = dx / d, ny = dy / d;
    p.x = px + nx * min; p.y = py + ny * min;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) { p.vx -= 1.9 * vn * nx; p.vy -= 1.9 * vn * ny; s.events.push({ t: 'wall', x: px, y: py, v: Math.abs(vn) }); }
  }
}

function substep(s: HockeyState, dt: number) {
  moveMallet(s, 0, dt); moveMallet(s, 1, dt);
  if (s.phase !== 'PLAY') return;
  const p = s.puck;
  p.x += p.vx * dt; p.y += p.vy * dt;
  collideMallet(s, 0); collideMallet(s, 1);

  const g0 = HH / 2 - GOAL / 2, g1 = HH / 2 + GOAL / 2;
  // paredes superior / inferior
  if (p.y - PUCK_R < 0) { p.y = PUCK_R; if (p.vy < 0) { s.events.push({ t: 'wall', x: p.x, y: 0, v: -p.vy }); p.vy = -p.vy * WALL_E; } }
  else if (p.y + PUCK_R > HH) { p.y = HH - PUCK_R; if (p.vy > 0) { s.events.push({ t: 'wall', x: p.x, y: HH, v: p.vy }); p.vy = -p.vy * WALL_E; } }
  // postes
  for (const x of [0, HW]) for (const y of [g0, g1]) collidePost(s, x, y);
  // paredes laterales con hueco de portería
  const inGap = p.y > g0 + 2 && p.y < g1 - 2;
  if (p.x - PUCK_R < 0 && !inGap) { p.x = PUCK_R; if (p.vx < 0) { s.events.push({ t: 'wall', x: 0, y: p.y, v: -p.vx }); p.vx = -p.vx * WALL_E; } }
  if (p.x + PUCK_R > HW && !inGap) { p.x = HW - PUCK_R; if (p.vx > 0) { s.events.push({ t: 'wall', x: HW, y: p.y, v: p.vx }); p.vx = -p.vx * WALL_E; } }
  // gol: el disco cruza completamente la línea
  if (p.x + PUCK_R < -4) scored(s, 1);
  else if (p.x - PUCK_R > HW + 4) scored(s, 0);
}

function scored(s: HockeyState, who: 0 | 1) {
  s.score[who]++;
  s.events.push({ t: 'goal', scorer: who });
  s.serve = who === 0 ? 1 : 0; // saca quien recibió el gol
  s.puck.vx = 0; s.puck.vy = 0;
  if (s.score[who] >= s.goalsToWin) {
    s.phase = 'OVER'; s.winner = who; s.timer = 0;
    s.events.push({ t: 'over', winner: who });
  } else { s.phase = 'GOAL'; s.timer = 90; }
}

export function step(s: HockeyState) {
  s.puck.trail.unshift({ x: s.puck.x, y: s.puck.y });
  if (s.puck.trail.length > 10) s.puck.trail.pop();

  if (s.phase === 'COUNT' || s.phase === 'GOAL') {
    s.timer--;
    if (s.phase === 'COUNT') {
      if (s.timer > 0 && s.timer % 50 === 0) s.events.push({ t: 'count', n: s.timer / 50 });
      if (s.timer <= 0) { s.phase = 'PLAY'; s.events.push({ t: 'go' }); }
    } else if (s.timer <= 0) {
      s.phase = 'COUNT'; s.timer = 100; placeServe(s);
    }
  }
  for (let i = 0; i < SUBSTEPS; i++) substep(s, 1 / SUBSTEPS);
  if (s.phase === 'PLAY') {
    s.puck.vx *= PUCK_FRICTION; s.puck.vy *= PUCK_FRICTION;
    const v = Math.hypot(s.puck.vx, s.puck.vy);
    if (v > MAX_PUCK) { s.puck.vx *= MAX_PUCK / v; s.puck.vy *= MAX_PUCK / v; }
  }
}

export function restart(s: HockeyState) {
  s.score = [0, 0]; s.phase = 'COUNT'; s.timer = 150; s.winner = null; s.lastTouch = null;
  s.mallets[0].x = 110; s.mallets[0].y = HH / 2; s.mallets[1].x = HW - 110; s.mallets[1].y = HH / 2;
  s.mallets.forEach((m) => { m.tx = m.x; m.ty = m.y; m.vx = m.vy = 0; });
  placeServe(s);
}

// ---------------------------------------------------------------- IA (jugador 1, derecha)
// Fácil = nueva (de verdad fácil). Difícil = la antigua "normal". Imposible = la antigua "difícil".
export const AI_LEVELS = {
  easy:       { speed: 5,  err: 70, react: 0.3, attack: 0.18 },
  hard:       { speed: 15, err: 18, react: 0.8, attack: 0.8 },
  impossible: { speed: 21, err: 6,  react: 1,   attack: 1 },
} as const;
export type AiLevel = keyof typeof AI_LEVELS;

let aiNoise = 0, aiNoiseT = 0;
let aiAimY = HH / 2, aiAimT = 0;
export function aiThink(s: HockeyState, level: keyof typeof AI_LEVELS, who: 0 | 1 = 1) {
  const cfg = AI_LEVELS[level];
  const m = s.mallets[who], p = s.puck;
  m.maxSpeed = cfg.speed;
  if (s.phase === 'OVER') return;
  if (--aiNoiseT <= 0) { aiNoise = (Math.random() - 0.5) * 2 * cfg.err; aiNoiseT = 25; }

  if (--aiAimT <= 0) {
    // variedad de tiro: esquinas de la portería y a veces rebote en pared
    const spread = GOAL / 2 - PUCK_R - 8;
    let y = HH / 2 + (Math.random() * 2 - 1) * spread;
    if (Math.random() < 0.35) y = Math.random() < 0.5 ? -y : 2 * HH - y;
    aiAimY = y; aiAimT = 45;
  }
  const dir = who === 1 ? -1 : 1;                         // hacia la portería rival
  const home = who === 1 ? HW - 70 : 70;
  const rivalGoalX = who === 1 ? 0 : HW;
  const onMySide = who === 1 ? p.x > HW / 2 : p.x < HW / 2;
  const towardsMe = who === 1 ? p.vx > 0.5 : p.vx < -0.5;

  // predicción: dónde cruzará el disco la línea de defensa (con rebotes en las paredes)
  const predictY = () => {
    if (!towardsMe) return p.y;
    const t = (home - p.x) / p.vx;
    let y = p.y + p.vy * Math.min(t, 60);
    const H = HH - 2 * PUCK_R;
    y = ((y - PUCK_R) % (2 * H) + 2 * H) % (2 * H);
    return (y > H ? 2 * H - y : y) + PUCK_R;
  };

  let tx = home, ty = HH / 2;
  const puckSlow = Math.hypot(p.vx, p.vy) < 6;
  const behindPuck = who === 1 ? m.x > p.x - 4 : m.x < p.x + 4;

  if (s.phase !== 'PLAY') { tx = home; ty = HH / 2; }
  else if (onMySide && (puckSlow || !towardsMe) && Math.random() < cfg.attack + 0.2) {
    // ATAQUE: ponerse detrás del disco y empujarlo hacia la portería rival
    const gx = rivalGoalX - p.x, gy = aiAimY - p.y; const gl = Math.hypot(gx, gy) || 1;
    if (behindPuck && Math.abs(m.y - p.y) < MALLET_R * 1.6) {
      tx = p.x + (gx / gl) * 60; ty = p.y + (gy / gl) * 60;         // golpe
    } else {
      tx = p.x - (gx / gl) * (MALLET_R + PUCK_R + 16);            // rodear
      ty = p.y - (gy / gl) * (MALLET_R + PUCK_R + 16);
      if (!behindPuck) ty += (m.y < p.y ? -1 : 1) * (MALLET_R + PUCK_R + 6); // esquivar por el costado
    }
  } else {
    // DEFENSA: seguir la altura prevista del disco
    tx = home + dir * (onMySide ? 40 : 0) * -1;
    ty = predictY();
  }
  const react = Math.random() < cfg.react;
  if (react) setTarget(s, who, tx, ty + aiNoise);
}
BRNEON_EOF_7

echo "  escribiendo src/games/pool/PoolGame.tsx"
write_start 'src/games/pool/PoolGame.tsx'
cat > 'src/games/pool/PoolGame.tsx' <<'BRNEON_EOF_8'
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPool, shoot, step, WALL, MAX_PULL, levelConfig } from './engine.ts';
import type { PoolState, PoolEvent, PowerType } from './engine.ts';
import { applyView, fitCanvas, toLogical } from '../../core/view.ts';
import type { View } from '../../core/view.ts';
import { drawBall, BALL_SKINS, findSkin } from '../../core/skins.ts';
import { sfx } from '../../core/audio.ts';
import { load, save } from '../../core/storage.ts';
import type { Settings } from '../../core/storage.ts';
import SkinPicker from '../../ui/SkinPicker.tsx';

const TILE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  2048: { bg: '#ff0055', border: '#ff66aa', text: '#ffffff' },
  1024: { bg: '#9900ff', border: '#cc66ff', text: '#ffffff' },
  512: { bg: '#0044ff', border: '#6699ff', text: '#ffffff' },
  256: { bg: '#00e5ff', border: '#99f5ff', text: '#001020' },
  128: { bg: '#00ff66', border: '#80ffb3', text: '#002010' },
  64: { bg: '#ccff00', border: '#e6ff80', text: '#203000' },
  32: { bg: '#ffea00', border: '#fff580', text: '#302800' },
  16: { bg: '#ff8800', border: '#ffbb66', text: '#ffffff' },
  8: { bg: '#ff3300', border: '#ff8866', text: '#ffffff' },
  4: { bg: '#ff00aa', border: '#ff80d5', text: '#ffffff' },
  2: { bg: '#00ffcc', border: '#99ffe6', text: '#00332a' },
};
const POWER_STYLE: Record<PowerType, { color: string; label: string; text: string }> = {
  BOMB: { color: '#ff0055', label: 'B', text: '¡BOMBA!' },
  SHOTS: { color: '#00ffcc', label: '+3', text: '+3 TIROS' },
  LASER: { color: '#ffea00', label: 'L', text: 'LÁSER x3' },
  SUPER: { color: '#ff00aa', label: 'x4', text: 'SUPER SPLIT' },
};
const FONT = `'Press Start 2P', ui-monospace, monospace`;

interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; max: number }
interface FText { x: number; y: number; text: string; color: string; life: number }
type Overlay = 'intro' | 'skins' | 'play' | 'win' | 'lose';

function aimPath(s: PoolState, ang: number, bounces: number) {
  const r = s.cue.r;
  const pts = [{ x: s.cue.x, y: s.cue.y }];
  let x = s.cue.x, y = s.cue.y, dx = Math.cos(ang), dy = Math.sin(ang);
  let hit = false;
  for (let b = 0; b <= bounces; b++) {
    let twx = Infinity, twy = Infinity;
    if (dx > 0) twx = (s.w - WALL - r - x) / dx; else if (dx < 0) twx = (WALL + r - x) / dx;
    if (dy > 0) twy = (s.h - WALL - r - y) / dy; else if (dy < 0) twy = (WALL + r - y) / dy;
    const tw = Math.min(twx, twy);
    let tt = Infinity;
    for (const t of s.tiles) {
      const fx = x - t.x, fy = y - t.y, R = t.r + r;
      const bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - R * R, disc = bq * bq - cq;
      if (disc >= 0) { const th = -bq - Math.sqrt(disc); if (th >= 0 && th < tt) tt = th; }
    }
    if (tt < tw) { x += dx * tt; y += dy * tt; pts.push({ x, y }); hit = true; break; }
    x += dx * tw; y += dy * tw; pts.push({ x, y });
    if (twx < twy) dx = -dx; else dy = -dy;
  }
  return { pts, hit };
}

export default function PoolGame({ settings, onChange, onExit }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onExit: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const stateRef = useRef<PoolState>(createPool(1, false));
  const overlayRef = useRef<Overlay>('intro');
  const particles = useRef<Particle[]>([]);
  const texts = useRef<FText[]>([]);
  const shake = useRef(0);
  const carry = useRef(0);
  const drag = useRef<{ id: number; sx: number; sy: number; cx: number; cy: number } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [overlay, setOverlayState] = useState<Overlay>('intro');
  const [maxLevel, setMaxLevel] = useState(() => load('poolMaxLevel', 1));
  const [selLevel, setSelLevel] = useState(() => load('poolMaxLevel', 1));
  const [hi, setHi] = useState(() => load('poolHi', 0));
  const [hud, setHud] = useState({ level: 1, score: 0, shots: 0, laser: 0, sup: false });
  const hiRef = useRef(hi);

  const setOverlay = useCallback((o: Overlay) => { overlayRef.current = o; setOverlayState(o); }, []);
  const skinsBack = useRef<Overlay>('intro');
  const openSkins = () => { sfx.unlock(); sfx.click(); if (overlayRef.current !== 'skins') skinsBack.current = overlayRef.current; setOverlay('skins'); };

  const startLevel = useCallback((lvl: number, keepScore: boolean) => {
    const s = createPool(lvl, false);
    if (keepScore) s.score = carry.current; else { carry.current = 0; }
    stateRef.current = s;
    particles.current = []; texts.current = []; drag.current = null;
    setOverlay('play');
  }, [setOverlay]);

  // -------- efectos visuales / sonido a partir de los eventos del motor
  const burst = (x: number, y: number, color: string, n = 18) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 5 + 1;
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, size: Math.floor(Math.random() * 3) + 3, life: 0, max: Math.random() * 20 + 15 });
    }
  };
  const ftext = (x: number, y: number, text: string, color: string) => texts.current.push({ x, y, text, color, life: 0 });

  const handleEvents = (s: PoolState, evs: PoolEvent[]) => {
    for (const e of evs) {
      switch (e.t) {
        case 'shoot': sfx.shoot(); break;
        case 'wall': sfx.bounce(); s.cue.sx = 0.7; s.cue.sy = 1.3; break;
        case 'hit': {
          sfx.split(e.value);
          burst(e.x, e.y, (TILE_COLORS[e.value] ?? TILE_COLORS[2]).bg, 16);
          ftext(e.x, e.y, `+${e.pts}`, e.chain ? '#ffffff' : (TILE_COLORS[e.value] ?? TILE_COLORS[2]).bg);
          if (e.value >= 64) shake.current = Math.max(shake.current, 4);
          break;
        }
        case 'pop': sfx.pop(); burst(e.x, e.y, '#ffffff', 22); ftext(e.x, e.y, `POP +${e.pts}`, '#00ffcc'); break;
        case 'power': sfx.power(); burst(e.x, e.y, POWER_STYLE[e.type].color, 20); ftext(e.x, e.y - 10, POWER_STYLE[e.type].text, POWER_STYLE[e.type].color); break;
        case 'bomb': sfx.bomb(); burst(e.x, e.y, '#ff0055', 40); burst(e.x, e.y, '#ffea00', 24); shake.current = 12; break;
        case 'combo': sfx.combo(); ftext(e.x, e.y - 30, `COMBO x${e.hits}  +1 TIRO`, '#ffea00'); break;
        case 'win': sfx.win(); break;
        case 'lose': sfx.lose(); break;
      }
    }
  };

  // -------- bucle principal
  useEffect(() => {
    const canvas = canvasRef.current!, box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const refit = () => { viewRef.current = fitCanvas(canvas, box, 800, 450); };
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(box);
    window.addEventListener('orientationchange', refit);

    let raf = 0, last = performance.now(), acc = 0, t = 0;
    const STEP = 1000 / 60;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last); last = now;
      const s = stateRef.current;
      while (acc >= STEP) {
        acc -= STEP; t += 1 / 60;
        if (overlayRef.current === 'play' || s.moving) {
          step(s);
          if (s.events.length) { const evs = s.events; s.events = []; handleEvents(s, evs); }
        }
        particles.current.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life++; });
        particles.current = particles.current.filter((p) => p.life < p.max);
        texts.current.forEach((f) => { f.y -= 0.6; f.life++; });
        texts.current = texts.current.filter((f) => f.life < 45);
        if (shake.current > 0) shake.current *= 0.85;
      }
      if (overlayRef.current === 'play') {
        if (s.status === 'WIN') {
          carry.current = s.score;
          const nl = Math.max(load('poolMaxLevel', 1), s.level + 1);
          save('poolMaxLevel', nl); setMaxLevel(nl);
          setTimeout(() => setOverlay('win'), 500); overlayRef.current = 'win';
        } else if (s.status === 'LOSE') {
          setTimeout(() => setOverlay('lose'), 500); overlayRef.current = 'lose';
        }
        if (s.status !== 'PLAYING' && s.score > hiRef.current) { hiRef.current = s.score; setHi(s.score); save('poolHi', s.score); }
      }
      setHud((h) => (h.level === s.level && h.score === s.score && h.shots === s.shots && h.laser === s.laserTurns && h.sup === s.superActive ? h : { level: s.level, score: s.score, shots: s.shots, laser: s.laserTurns, sup: s.superActive }));
      draw(ctx, s, viewRef.current!, t);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('orientationchange', refit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = (ctx: CanvasRenderingContext2D, s: PoolState, v: View, t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060710'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    applyView(ctx, v);
    if (shake.current > 0.5) ctx.translate((Math.random() - 0.5) * shake.current, (Math.random() - 0.5) * shake.current);
    const upright = (x: number, y: number, fn: () => void) => { ctx.save(); ctx.translate(x, y); if (v.portrait) ctx.rotate(Math.PI / 2); fn(); ctx.restore(); };

    ctx.fillStyle = '#060710'; ctx.fillRect(-20, -20, s.w + 40, s.h + 40);
    ctx.strokeStyle = '#101428'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= s.w; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, s.h); }
    for (let y = 0; y <= s.h; y += 25) { ctx.moveTo(0, y); ctx.lineTo(s.w, y); }
    ctx.stroke();
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 4;
    ctx.strokeRect(WALL / 2, WALL / 2, s.w - WALL, s.h - WALL);
    ctx.shadowBlur = 0;

    // power-ups
    for (const p of s.powers) {
      const st = POWER_STYLE[p.type], fy = Math.sin(p.pulse) * 4;
      ctx.save(); ctx.translate(p.x, p.y + fy);
      ctx.shadowColor = st.color; ctx.shadowBlur = 14;
      ctx.fillStyle = st.color; ctx.fillRect(-13, -13, 26, 26);
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-13, -13, 26, 26);
      ctx.restore();
      upright(p.x, p.y + fy + 1, () => { ctx.fillStyle = p.type === 'LASER' ? '#222' : '#fff'; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(st.label, 0, 0); });
    }
    // partículas
    for (const p of particles.current) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); }
    ctx.globalAlpha = 1;

    // estela
    const c = s.cue;
    c.trail.forEach((tp, i) => { const sz = Math.max(3, Math.floor(c.r * 1.3 * (1 - i / c.trail.length))); ctx.fillStyle = 'rgba(0,255,204,0.25)'; ctx.fillRect(Math.floor(tp.x - sz / 2), Math.floor(tp.y - sz / 2), sz, sz); });

    // guía de apuntado (con rebotes)
    const d = drag.current;
    if (d && overlayRef.current === 'play' && !s.moving && s.status === 'PLAYING') {
      const dx = d.sx - d.cx, dy = d.sy - d.cy, dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const ang = Math.atan2(dy, dx), pw = Math.min(1, dist / MAX_PULL);
        const laser = s.laserTurns > 0;
        const { pts, hit } = aimPath(s, ang, laser ? 3 : 1);
        ctx.strokeStyle = laser ? '#ffea00' : '#00ffcc'; ctx.lineWidth = laser ? 3 : 2; ctx.setLineDash([5, 6]);
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
        const e = pts[pts.length - 1];
        ctx.beginPath(); ctx.arc(e.x, e.y, c.r, 0, Math.PI * 2); ctx.strokeStyle = hit ? '#ff0055' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        // barra de potencia detrás de la bola
        const len = pw * 90;
        ctx.strokeStyle = `hsl(${120 - pw * 120}, 100%, 55%)`; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - Math.cos(ang) * len, c.y - Math.sin(ang) * len); ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
    // bola
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(c.sx, c.sy);
    drawBall(ctx, findSkin(BALL_SKINS, settingsRef.current.ball), c.r, c.pulse);
    ctx.restore();
    if (s.superActive) { ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 7 + Math.sin(t * 8) * 2, 0, Math.PI * 2); ctx.stroke(); }

    // fichas
    for (const tl of s.tiles) {
      const th = TILE_COLORS[tl.value] ?? TILE_COLORS[2];
      const sz = tl.r * 1.86 * tl.spawn, rx = tl.x - sz / 2, ry = tl.y - sz / 2;
      ctx.shadowColor = th.bg; ctx.shadowBlur = tl.mega ? 18 : 8;
      ctx.fillStyle = th.bg; ctx.fillRect(rx, ry, sz, sz);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = tl.mega ? '#ffffff' : th.border; ctx.lineWidth = tl.mega ? 4 : 3; ctx.strokeRect(rx, ry, sz, sz);
      if (tl.mega) { ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 2; ctx.strokeRect(rx - 3, ry - 3, sz + 6, sz + 6); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(rx + 2, ry + 2, 3, 3);
      const digits = String(tl.value).length;
      const fs = Math.max(8, Math.floor(tl.r * (digits <= 2 ? 0.72 : digits === 3 ? 0.56 : 0.44)));
      upright(tl.x, tl.y + 1, () => { ctx.fillStyle = th.text; ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(tl.value), 0, 0); });
    }
    // textos flotantes
    for (const f of texts.current) {
      ctx.globalAlpha = Math.max(0, 1 - f.life / 45);
      upright(f.x, f.y, () => { ctx.fillStyle = f.color; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.text, 0, 0); });
    }
    ctx.globalAlpha = 1;
  };

  // -------- entrada (puntero: mouse / táctil). Se arrastra desde cualquier punto hacia atrás, como una honda.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return toLogical(viewRef.current!, e.clientX - r.left, e.clientY - r.top);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (overlayRef.current !== 'play' || s.moving || s.status !== 'PLAYING' || drag.current) return;
      const p = pos(e);
      drag.current = { id: e.pointerId, sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
    };
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d || d.id !== e.pointerId) return;
      e.preventDefault();
      const p = pos(e); d.cx = p.x; d.cy = p.y;
    };
    const up = (e: PointerEvent) => {
      const d = drag.current; if (!d || d.id !== e.pointerId) return;
      e.preventDefault();
      drag.current = null;
      const s = stateRef.current;
      const dx = d.sx - d.cx, dy = d.sy - d.cy, dist = Math.hypot(dx, dy);
      if (e.type === 'pointerup' && dist > 14 && overlayRef.current === 'play') shoot(s, Math.atan2(dy, dx), Math.min(1, dist / MAX_PULL));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    };
  }, []);

  const cfg = levelConfig(selLevel);
  return (
    <div className="game">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className="stat"><span>Nivel</span><b>{hud.level}</b></div>
          <div className="stat"><span>Puntos</span><b>{hud.score}</b></div>
          <div className={'stat ' + (hud.shots <= 3 ? 'warn' : '')}><span>Tiros</span><b>{hud.shots}</b></div>
          <div className="stat hide-s"><span>Récord</span><b>{hi}</b></div>
          {hud.laser > 0 && <div className="chip amber">Láser {hud.laser}</div>}
          {hud.sup && <div className="chip pink">Split x4</div>}
        </div>
        <button className="tbtn" onClick={openSkins} aria-label="Skins">Skins</button>
        <button className="ibtn" onClick={() => { sfx.click(); startLevel(hud.level, false); }} aria-label="Reiniciar">↻</button>
      </header>
      <div className="stage" ref={boxRef}>
        <canvas ref={canvasRef} className="cv" />
        <div className="scan" />
        {overlay === 'intro' && (
          <div className="ov">
            <h2 className="ov-title cyan">Neon 2048 Pool</h2>
            <p className="ov-text">Arrastra hacia atrás desde cualquier punto y suelta para lanzar la bola. Cada golpe parte una ficha en dos; las fichas que chocan fuerte entre sí se rompen en cadena. Junta 4 golpes en un tiro y ganas un tiro extra.</p>
            <ul className="legend">
              <li><i style={{ background: '#ff0055' }}>B</i> Bomba: rompe todo lo cercano</li>
              <li><i style={{ background: '#00ffcc', color: '#003' }}>+3</i> Tiros extra</li>
              <li><i style={{ background: '#ffea00', color: '#222' }}>L</i> Láser: guía con 3 rebotes</li>
              <li><i style={{ background: '#ff00aa' }}>x4</i> Super split: parte en 4</li>
            </ul>
            <div className="lvlpick">
              <button className="ibtn" disabled={selLevel <= 1} onClick={() => setSelLevel(selLevel - 1)}>‹</button>
              <div><span>Nivel {selLevel}</span><small>Ficha mayor {Math.max(...cfg.tiles)} · {cfg.shots} tiros</small></div>
              <button className="ibtn" disabled={selLevel >= maxLevel} onClick={() => setSelLevel(selLevel + 1)}>›</button>
            </div>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={openSkins}>Skins</button>
              <button className="btn cyan" onClick={() => { sfx.click(); startLevel(selLevel, false); }}>Jugar</button>
            </div>
          </div>
        )}
        {overlay === 'skins' && <SkinPicker kinds={['ball']} settings={settings} onChange={onChange} onClose={() => setOverlay(skinsBack.current)} />}
        {overlay === 'win' && (
          <div className="ov">
            <h2 className="ov-title amber">¡Nivel {hud.level} completado!</h2>
            <p className="ov-text">Puntos: {hud.score}. Cada tiro que te sobró suma 100.</p>
            <button className="btn cyan" onClick={() => { sfx.click(); startLevel(hud.level + 1, true); }}>Siguiente nivel</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
        {overlay === 'lose' && (
          <div className="ov">
            <h2 className="ov-title pink">Sin tiros</h2>
            <p className="ov-text">Quedaron {stateRef.current.tiles.length} fichas. Apunta a las fichas grandes y busca rebotes para encadenar choques.</p>
            <button className="btn pink" onClick={() => { sfx.click(); startLevel(hud.level, true); }}>Reintentar nivel</button>
            <button className="btn ghost" onClick={onExit}>Menú</button>
          </div>
        )}
      </div>
    </div>
  );
}
BRNEON_EOF_8

echo "  escribiendo src/games.css"
write_start 'src/games.css'
cat > 'src/games.css' <<'BRNEON_EOF_9'
/* ===== Suerte 2048 y 2048: estilos (identidad BrNeon) ===== */
.game > .page { height: auto; flex: 1; min-height: 0; width: 100%; }
.play { flex: 1; min-height: 0; display: grid; place-content: center; justify-items: center; gap: 16px; touch-action: none; padding: 10px; }
.hint { margin: 0; color: var(--mute); font-size: 14px; text-align: center; }

/* ---------- 2048 ---------- */
.b2048 { --bs: min(94vw, calc(100dvh - 190px), 520px); position: relative; width: var(--bs); height: var(--bs); padding: 0;
  border-radius: 14px; background: #0b0818; border: 2px solid var(--cyan); box-shadow: 0 0 26px -6px var(--cyan), inset 0 0 30px -14px var(--cyan); }
.b2048 .cells, .b2048 .tpos-wrap { position: absolute; inset: 8px; }
.b2048 .cells { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
.cell { margin: 4px; border-radius: 8px; background: #151030; border: 1px solid #231a4a; }
.tpos { position: absolute; left: 8px; top: 8px; width: calc((100% - 16px) / 4); height: calc((100% - 16px) / 4); transition: transform .11s ease-out; }
.tile { position: absolute; inset: 4px; border-radius: 8px; border: 3px solid; display: grid; place-items: center; font-family: var(--px);
  font-size: calc(var(--bs) * 0.075); transition: opacity .02s linear .1s; }
.tile.d3 { font-size: calc(var(--bs) * 0.058); } .tile.d4 { font-size: calc(var(--bs) * 0.045); } .tile.d5 { font-size: calc(var(--bs) * 0.036); }
.tile.fresh { animation: appear .2s ease-out .1s backwards; }
.tile.merged { animation: pop .22s ease-out .1s backwards; }
.tile.ghost { opacity: 0; }
@keyframes appear { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes pop { 0% { transform: scale(0); } 60% { transform: scale(1.22); filter: brightness(1.5); } 100% { transform: scale(1); } }
.inb { border-radius: 12px; animation: fadeIn .3s ease-out; }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
.score-stat { position: relative; }
.plus { position: absolute; top: -2px; right: -6px; font: 700 14px var(--px); color: var(--amber); font-style: normal; animation: floatUp .8s ease-out forwards; pointer-events: none; }
@keyframes floatUp { from { transform: translateY(10px); opacity: 1 } to { transform: translateY(-30px); opacity: 0 } }

/* ---------- Suerte 2048 ---------- */
.ltitle { font-family: var(--px); font-size: 13px; color: var(--pink); text-shadow: 0 0 12px #ff2bd699; }
.lsetup { padding-top: 16px; } .btn.big { width: 100%; padding: 16px; font-size: 13px; }
.stepper { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.stepper span { font-weight: 700; } .stepper div { display: flex; align-items: center; gap: 12px; }
.stepper b { min-width: 36px; text-align: center; font: 16px var(--px); color: var(--amber); }
.lplay { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.chips { display: flex; gap: 8px; padding: 10px 12px; overflow-x: auto; flex: none; touch-action: pan-x; -webkit-overflow-scrolling: touch; }
.pchip { flex: none; min-width: 86px; display: grid; justify-items: center; gap: 4px; padding: 6px 10px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--panel); color: var(--mute); font-size: 12px; transition: transform .2s, border-color .2s, box-shadow .2s; }
.pchip b { font: 13px var(--px); color: var(--pc); }
.pchip.on { border-color: var(--pc); color: var(--text); transform: translateY(-2px) scale(1.04); box-shadow: 0 0 16px -3px var(--pc); }
.lmain { flex: 1; min-height: 0; display: grid; align-content: center; justify-items: center; gap: 14px; padding: 8px 12px 16px; touch-action: none; }
.lturn { font-family: var(--px); font-size: 12px; text-align: center; line-height: 1.5; animation: slideIn .4s ease-out; text-shadow: 0 0 12px currentColor; }
.lturn small { display: block; margin-top: 6px; font: 500 12px var(--body); color: var(--mute); text-shadow: none; }
@keyframes slideIn { from { transform: translateY(-10px); opacity: 0 } to { transform: none; opacity: 1 } }
.lboard { --bs: min(94vw, 48dvh, 440px); width: var(--bs); height: var(--bs); display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 1fr); gap: calc(var(--bs) * 0.025);
  padding: calc(var(--bs) * 0.03); border-radius: 14px; background: #0b0818; border: 2px solid var(--pink); box-shadow: 0 0 26px -6px var(--pink), inset 0 0 30px -14px var(--pink); }
.ltile { position: relative; padding: 0; border: 0; background: none; transform-style: preserve-3d; transform: perspective(500px) rotateY(0deg);
  transition: transform .55s cubic-bezier(.3, 1.4, .5, 1) var(--rev, 0s);  animation: dealIn .45s ease-out calc(var(--i) * 20ms) backwards; }
.ltile:not(:disabled):active { transform: perspective(500px) scale(.92); }
.ltile.flip { transform: perspective(500px) rotateY(180deg); }
.ltile.dim .face { opacity: .4; } /* la opacidad va en las caras: en el contenedor 3D aplanaría el giro */
@keyframes dealIn { from { transform: perspective(500px) scale(0) rotateZ(-20deg); opacity: 0 } to { transform: perspective(500px) scale(1); opacity: 1 } }
.face { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 9px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.face.front { background: linear-gradient(160deg, #1d1545, #120e2a); border: 2px solid #3a2d7a; color: var(--cyan); font: calc(var(--bs) * 0.085) var(--px); text-shadow: 0 0 10px var(--cyan); animation: shimmer 3s ease-in-out infinite; animation-delay: calc(var(--i) * -170ms); }
@keyframes shimmer { 0%, 100% { border-color: #3a2d7a; } 50% { border-color: #19f4ff88; } }
.face.back { transform: rotateY(180deg); border: 3px solid; font-family: var(--px); font-size: calc(var(--bs) * 0.062); }
.face.back.d3 { font-size: calc(var(--bs) * 0.05); } .face.back.d4 { font-size: calc(var(--bs) * 0.04); }
.lresult { display: flex; align-items: center; gap: 16px; justify-content: space-between; padding: 10px 14px; border: 2px solid; border-radius: 14px; background: var(--panel); width: min(94vw, 440px); animation: slideUp .35s ease-out; }
@keyframes slideUp { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
.lsum { display: grid; gap: 4px; } .lsum span { font-size: 13px; color: var(--mute); } .lsum em { color: var(--amber); font-style: normal; font-weight: 700; }
.lsum b { font: 22px var(--px); }
.lfinal { position: relative; justify-items: center; text-align: center; padding-top: 28px; gap: 22px; }
.winner { margin: 0; font-family: var(--px); font-size: clamp(14px, 4.4vw, 22px); line-height: 1.6; color: var(--amber); text-shadow: 0 0 16px #ffb80099; animation: winPop .7s cubic-bezier(.3, 1.6, .5, 1); }
@keyframes winPop { from { transform: scale(.3); opacity: 0 } to { transform: none; opacity: 1 } }
.rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; width: 100%; }
.rank li { display: grid; grid-template-columns: 92px 1fr auto; gap: 10px; align-items: center; text-align: left; animation: slideUp .4s ease-out backwards; }
.rank .rn { font-size: 13px; color: var(--mute); } .rank li.top .rn { color: var(--text); font-weight: 700; }
.rank b { font: 12px var(--px); color: var(--pc); min-width: 42px; text-align: right; }
.rank .bar { display: block; height: 14px; border-radius: 7px; background: var(--pc); width: var(--w); box-shadow: 0 0 12px -2px var(--pc); transform-origin: left; animation: grow .8s ease-out .3s backwards; }
@keyframes grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti span { position: absolute; top: -12px; width: 8px; height: 14px; animation: fall linear infinite; }
@keyframes fall { to { transform: translateY(105vh) rotate(720deg); } }

@media (orientation: landscape) and (max-height: 560px) {
  .lmain { grid-template-columns: auto auto; gap: 12px 24px; align-content: center; }
  .lboard { --bs: min(78dvh, 50vw, 440px); } .lmain .lturn, .lmain .hint, .lmain .lresult { grid-column: 2; }
  .lmain .lboard { grid-column: 1; grid-row: 1 / 4; }
  .b2048 { --bs: min(94vw, calc(100dvh - 120px), 520px); } .play { gap: 4px; }
}
@media (prefers-reduced-motion: reduce) { .ltile, .tile, .confetti span, .face.front { animation: none !important; } .tpos { transition: none; } }

.c-amber { --c: var(--amber); } .c-lime { --c: #b6ff2e; } .c-green { --c: #3ddc84; }

/* ---------- Capy Run ---------- */
.capy .stage { background: #05030f; }
.capy .cv.pix { image-rendering: pixelated; cursor: pointer; border-radius: 0; box-shadow: 0 0 0 2px #3a2d7a, 0 0 30px -8px #3ddc84aa; }
.capy-ctl { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 12px calc(var(--sab) + 6px); border-top: 2px solid var(--line); }
.capy-ctl .btn { min-height: 58px; touch-action: none; }
.capy .stat.blink b { color: var(--amber); animation: blinkS .25s steps(2, end) 6; }
@keyframes blinkS { 50% { opacity: .2 } }
.newbest { color: var(--amber); }
.ov-text b { color: var(--text); }
@media (max-height: 480px) { .capy-ctl { padding: 4px 10px; } .capy-ctl .btn { min-height: 42px; } }
@media (hover: hover) and (pointer: fine) and (min-width: 900px) { .capy-ctl { display: none; } }
BRNEON_EOF_9

echo "  escribiendo src/styles.css"
write_start 'src/styles.css'
cat > 'src/styles.css' <<'BRNEON_EOF_10'
:root {
  --ink: #07060f; --panel: #120e24; --panel2: #1a1433; --line: #2a2152;
  --cyan: #19f4ff; --pink: #ff2bd6; --amber: #ffb800; --text: #f1edff; --mute: #9a93c4;
  --px: 'Press Start 2P', ui-monospace, 'SF Mono', Menlo, monospace;
  --body: 'Chakra Petch', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px); --sar: env(safe-area-inset-right, 0px);
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
/* La página nunca se mueve ni hace zoom: todo vive en un contenedor fijo del tamaño de la pantalla */
html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; background: var(--ink); }
body { position: fixed; inset: 0; color: var(--text); font-family: var(--body); font-size: 16px;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-text-size-adjust: 100%;
  touch-action: manipulation; }
#root { position: fixed; inset: 0; height: 100dvh; }
button { font: inherit; color: inherit; -webkit-appearance: none; appearance: none; cursor: pointer; touch-action: manipulation; }
:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }
.scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }

/* ------------------------------------------------ menú */
.menu { position: relative; height: 100%; padding: calc(var(--sat) + 24px) calc(var(--sar) + 18px) calc(var(--sab) + 22px) calc(var(--sal) + 18px);
  display: grid; gap: 26px; align-content: start; align-content: safe center; max-width: 560px; margin: 0 auto;
  background: radial-gradient(120% 60% at 50% -10%, #2a0f4d55 0%, transparent 60%); }
.menu .sound { position: absolute; top: calc(var(--sat) + 14px); right: calc(var(--sar) + 14px); color: var(--mute); }
.menu .sound[aria-pressed="true"] { color: var(--cyan); border-color: #19f4ff55; }
.brand { text-align: center; }
.tube { margin: 0; font-family: var(--px); font-weight: 400; font-size: clamp(34px, 11vw, 60px); line-height: 1.1; letter-spacing: -1px; text-transform: lowercase; }
.tube .br { color: #ffe3fb; text-shadow: 0 0 4px #fff, 0 0 12px var(--pink), 0 0 28px var(--pink), 0 0 56px var(--pink); }
.tube .neon { color: #e1fdff; text-shadow: 0 0 4px #fff, 0 0 12px var(--cyan), 0 0 28px var(--cyan), 0 0 56px var(--cyan); animation: ignite 1.6s steps(1, end) 1 both; }
@keyframes ignite { 0% { opacity: .15 } 12% { opacity: 1 } 18% { opacity: .2 } 24% { opacity: 1 } 30% { opacity: .35 } 36%, 100% { opacity: 1 } }
.games { margin: 14px 0 0; font-family: var(--px); font-size: 13px; color: var(--amber); text-shadow: 0 0 10px #ffb80099; letter-spacing: 6px; text-indent: 6px; text-transform: uppercase; }
.tag { margin: 16px auto 0; max-width: 36ch; color: var(--mute); line-height: 1.45; font-size: 15px; }
.sec { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font: 400 10px var(--px); color: var(--mute); letter-spacing: 2px; text-transform: uppercase; }
.sec::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, var(--line), transparent); }
.sec span { order: 3; color: var(--c0, var(--cyan)); }
.cabs { display: grid; gap: 14px; }
.cab { text-align: left; display: grid; grid-template-columns: 104px 1fr; grid-template-rows: auto auto auto; column-gap: 16px; align-items: center;
  padding: 14px 16px; background: var(--panel); border: 2px solid var(--c); border-radius: 14px; box-shadow: 0 0 0 1px #000, 0 0 22px -6px var(--c), inset 0 0 24px -14px var(--c);
  transition: transform .12s ease, box-shadow .12s ease; }
.cab:active { transform: scale(.98); box-shadow: 0 0 0 1px #000, 0 0 34px -2px var(--c), inset 0 0 24px -8px var(--c); }
.c-cyan { --c: var(--cyan); } .c-pink { --c: var(--pink); }
.cab .art { grid-row: 1 / 4; width: 104px; height: auto; background: #0b0818; border-radius: 8px; border: 1px solid var(--line); overflow: hidden; }
.cab-t { font-family: var(--px); font-size: 12px; line-height: 1.5; color: var(--c); align-self: end; }
.cab-s { color: var(--mute); font-size: 14px; line-height: 1.35; margin-top: 4px; }
.cab-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-self: start; }
.cab-tags i { font-style: normal; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.foot { display: flex; justify-content: center; color: #5d5690; font: 400 9px var(--px); letter-spacing: 2px; text-transform: lowercase; }

/* ------------------------------------------------ botones */
.btn { border: 2px solid var(--c, var(--cyan)); background: transparent; color: var(--c, var(--cyan)); padding: 13px 20px; min-height: 48px; border-radius: 10px;
  font-family: var(--px); font-size: 11px; line-height: 1.4; box-shadow: 0 0 14px -4px var(--c, var(--cyan)); }
.btn small { display: block; margin-top: 6px; font: 500 12px var(--body); color: var(--mute); }
.btn.cyan { --c: var(--cyan); background: #19f4ff18; } .btn.pink { --c: var(--pink); background: #ff2bd618; } .btn.amber { --c: var(--amber); }
.btn.lime { --c: #b6ff2e; background: #b6ff2e14; }
.btn.ghost { --c: var(--mute); box-shadow: none; }
.btn:active { transform: translateY(1px) scale(.98); }
.ibtn { width: 44px; height: 44px; flex: none; border-radius: 10px; border: 1.5px solid var(--line); background: var(--panel); font-size: 20px; line-height: 1; display: grid; place-items: center; }
.ibtn:disabled { opacity: .3; }
/* botón de texto pequeño de la barra del juego (Skins, etc.) */
.tbtn { flex: none; height: 44px; padding: 0 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--panel); color: var(--amber); font: 400 9px var(--px); letter-spacing: .5px; }
.tbtn:active { transform: translateY(1px) scale(.98); }

/* ------------------------------------------------ páginas internas */
.page { height: 100%; padding: calc(var(--sat) + 14px) calc(var(--sar) + 16px) calc(var(--sab) + 24px) calc(var(--sal) + 16px); max-width: 640px; margin: 0 auto; display: grid; gap: 16px; align-content: start; }
.pbar { display: flex; align-items: center; gap: 12px; }
.pbar h2 { margin: 0; font-family: var(--px); font-size: 14px; color: var(--cyan); }
.unlocked { margin-left: auto; color: var(--amber); font-size: 13px; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: grid; gap: 12px; }
.panel h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text); }
.panel p { margin: 0; color: var(--mute); line-height: 1.5; font-size: 14px; } .panel p b { color: var(--text); }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.seg { display: flex; gap: 8px; flex-wrap: wrap; }
.seg button { flex: 1 1 0; min-height: 44px; padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--panel2); color: var(--mute); font-weight: 700; }
.seg button.on { border-color: var(--cyan); color: var(--cyan); background: #19f4ff14; box-shadow: 0 0 12px -4px var(--cyan); }
.seg.big button { font-size: 14px; }
.seg button small { display: block; margin-top: 3px; font: 500 11px var(--body); color: var(--mute); }
.seg button.on.pink { border-color: var(--pink); color: var(--pink); background: #ff2bd614; box-shadow: 0 0 12px -4px var(--pink); }
.seg button.skullbtn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.seg button.skullbtn .skull { flex: none; }
.seg button.skullbtn.on { border-color: #ff3b57; color: #ff3b57; background: #ff3b5718; box-shadow: 0 0 14px -3px #ff3b57; }
.skull { display: inline-block; vertical-align: -2px; }
.hockey-score .skull { color: var(--pink); filter: drop-shadow(0 0 6px #ff2bd699); }
.skin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; }
.skin { display: grid; gap: 6px; justify-items: center; padding: 10px 6px 12px; border-radius: 14px; border: 2px solid var(--line); background: var(--panel); font-weight: 700; font-size: 14px; }
.skin.sel { border-color: var(--amber); box-shadow: 0 0 16px -4px var(--amber); }
.prev { width: 96px; height: 96px; }

/* ------------------------------------------------ juego */
.game { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--ink); padding: var(--sat) var(--sar) var(--sab) var(--sal); }
.gbar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 2px solid var(--line); flex: none; }
.stats { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
.stat { display: grid; justify-items: center; line-height: 1.1; min-width: 44px; }
.stat span { font-size: 11px; color: var(--mute); } .stat b { font-family: var(--px); font-size: 13px; color: var(--cyan); margin-top: 4px; }
.stat.warn b { color: #ff3b6b; }
.chip { font-family: var(--px); font-size: 9px; padding: 6px 8px; border-radius: 8px; border: 1.5px solid; }
.chip.amber { color: var(--amber); border-color: var(--amber); } .chip.pink { color: var(--pink); border-color: var(--pink); }
.hockey-score { gap: 12px; flex-wrap: nowrap; }
.hockey-score b { font-family: var(--px); font-size: 15px; white-space: nowrap; }
.hockey-score .c0 { color: var(--cyan); text-shadow: 0 0 10px #19f4ff88; } .hockey-score .c1 { color: var(--pink); text-shadow: 0 0 10px #ff2bd688; }
.hockey-score .to { color: var(--mute); font-size: 12px; }
.stage { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; overflow: hidden; touch-action: none; }
.cv { display: block; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; cursor: crosshair;
  border-radius: 10px; box-shadow: 0 0 0 2px var(--line), 0 0 30px -8px #19f4ff55; }
.scan { pointer-events: none; position: absolute; inset: 0; background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,.18) 50%); background-size: 100% 4px; }
.ov { position: absolute; inset: 0; z-index: 5; display: grid; align-content: center; justify-items: center; gap: 14px; padding: 20px; text-align: center; background: #07060fee; overflow-y: auto; touch-action: pan-y; }
.ov-title { margin: 0; font-family: var(--px); font-size: clamp(15px, 4.6vw, 24px); line-height: 1.4; }
.cyan.ov-title, .ov-title.cyan { color: var(--cyan); text-shadow: 0 0 14px #19f4ff88; }
.ov-title.lime { color: #b6ff2e; text-shadow: 0 0 14px #b6ff2e88; }
.ov-title.pink { color: var(--pink); text-shadow: 0 0 14px #ff2bd688; } .ov-title.amber { color: var(--amber); text-shadow: 0 0 14px #ffb80088; }
.ov-text { margin: 0; max-width: 46ch; color: var(--mute); line-height: 1.5; font-size: 15px; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; text-align: left; font-size: 14px; color: var(--text); }
.legend li { display: flex; align-items: center; gap: 10px; }
.legend i { font-style: normal; flex: none; min-width: 34px; height: 26px; padding: 0 4px; display: grid; place-items: center; font: 10px var(--px); color: #fff; border: 2px solid #fff; }
.legend.how i { background: var(--panel2); border-color: var(--line); font-size: 14px; border-radius: 6px; }
.lvlpick { display: flex; align-items: center; gap: 14px; }
.lvlpick div { display: grid; min-width: 190px; } .lvlpick span { font-family: var(--px); font-size: 13px; color: var(--amber); } .lvlpick small { color: var(--mute); margin-top: 6px; font-size: 12px; }

.ov.sheet { align-content: safe center; justify-items: stretch; }
.ov.sheet.top { align-content: start; }
.sheet-in { width: min(100%, 520px); margin: 0 auto; display: grid; gap: 14px; text-align: left; }
.sheet-in > .ov-title { text-align: center; }
.sheet-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sheet-bar .ov-title { font-size: 15px; }
.sheet-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 4px; }
.sheet-actions .btn { flex: 1 1 140px; }
.opt { display: grid; gap: 8px; }
.opt h3 { margin: 0; font: 400 10px var(--px); color: var(--mute); letter-spacing: 1px; text-transform: uppercase; }
.opt-hint { margin: 0; font-size: 13px; color: var(--mute); }
.ov.sheet .skin-grid { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); }
.ov.sheet .prev { width: 80px; height: 80px; }
.legend.how { margin: 2px auto; }

/* celular apaisado (poco alto): HUD más compacto */
@media (max-height: 480px) {
  .gbar { padding: 4px 8px; } .ibtn { width: 38px; height: 38px; }
  .stat b { font-size: 11px; } .ov { gap: 8px; padding: 10px; } .ov-text { font-size: 13px; } .legend { font-size: 12px; gap: 4px; }
}
@media (max-width: 420px) { .hide-s { display: none; } .stats { gap: 10px; } }
@media (min-width: 900px) {
  .menu { max-width: 1040px; } .cabs { grid-template-columns: repeat(3, 1fr); } .cab { grid-template-columns: 1fr; grid-template-rows: auto auto auto; }
  .cab .art { grid-row: auto; width: 100%; margin-bottom: 14px; }
}
@media (max-height: 480px) { .tbtn { height: 38px; } .sheet-in { gap: 8px; } }
@media (prefers-reduced-motion: reduce) { .tube .neon { animation: none; } * { transition: none !important; } }
BRNEON_EOF_10

echo "  escribiendo src/ui/Menu.tsx"
write_start 'src/ui/Menu.tsx'
cat > 'src/ui/Menu.tsx' <<'BRNEON_EOF_11'
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';
import { spritePaths } from '../games/capy/sprites.ts';
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
// Capy Run: mismos sprites que el juego, dibujados como SVG
function Sprite({ name, x, y, scale }: { name: SpriteName; x: number; y: number; scale: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>{spritePaths(name).map((p, i) => <path key={i} d={p.d} fill={p.color} />)}</g>;
}
function CapyArt() {
  return (
    <svg viewBox="0 0 120 80" className="art" aria-hidden shapeRendering="crispEdges">
      <defs><linearGradient id="capy-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a1c78" /><stop offset="0.6" stopColor="#c4369a" /><stop offset="1" stopColor="#ff8f6a" /></linearGradient></defs>
      <rect width="120" height="80" fill="url(#capy-sky)" />
      <rect x="86" y="8" width="14" height="14" fill="#ffe38a" />
      <rect x="0" y="62" width="120" height="18" fill="#5a3a2c" /><rect x="0" y="62" width="120" height="3" fill="#47b862" />
      <Sprite name="capyA" x={6} y={37} scale={1.15} />
      <Sprite name="bambooShort" x={62} y={39} scale={1} />
      <Sprite name="crowUp" x={86} y={26} scale={1.2} />
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
BRNEON_EOF_11

echo "  escribiendo src/ui/SkinPicker.tsx"
write_start 'src/ui/SkinPicker.tsx'
cat > 'src/ui/SkinPicker.tsx' <<'BRNEON_EOF_12'
// Selector de skins que vive DENTRO de cada juego (Pool: bolita · Hockey: paletas y disco).
import { useEffect, useRef, useState } from 'react';
import { BALL_SKINS, MALLET_SKINS, PUCK_SKINS, drawBall, drawMallet, drawPuck } from '../core/skins.ts';
import type { Skin } from '../core/skins.ts';
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

export type SkinKind = 'ball' | 'mallet' | 'puck';
interface Props {
  kinds: SkinKind[];
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onClose: () => void;
  /** nombres de los dos jugadores (solo para las paletas) */
  players?: [string, string];
}

const LABEL: Record<SkinKind, string> = { ball: 'Bolita', mallet: 'Paleta', puck: 'Disco' };

function Preview({ skin, kind }: { skin: Skin; kind: SkinKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000, W = c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.translate(W / 2, W / 2);
      const r = W * 0.27;
      if (kind === 'ball') drawBall(ctx, skin, r, t * 4);
      else if (kind === 'mallet') drawMallet(ctx, skin, r * 1.15, t);
      else drawPuck(ctx, skin, r * 0.9, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin, kind]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

export default function SkinPicker({ kinds, settings, onChange, onClose, players = ['Jugador 1', 'Jugador 2'] }: Props) {
  const [tab, setTab] = useState<SkinKind>(kinds[0]);
  const [who, setWho] = useState<1 | 2>(1);
  const list = tab === 'ball' ? BALL_SKINS : tab === 'mallet' ? MALLET_SKINS : PUCK_SKINS;
  const current = tab === 'ball' ? settings.ball : tab === 'puck' ? settings.puck : who === 1 ? settings.mallet1 : settings.mallet2;
  const pick = (id: string) => {
    sfx.unlock(); sfx.click();
    if (tab === 'ball') onChange({ ball: id });
    else if (tab === 'puck') onChange({ puck: id });
    else onChange(who === 1 ? { mallet1: id } : { mallet2: id });
  };
  return (
    <div className="ov sheet top">
      <div className="sheet-in">
        <header className="sheet-bar">
          <h2 className="ov-title cyan">Skins</h2>
          <button className="btn cyan" onClick={() => { sfx.click(); onClose(); }}>Listo</button>
        </header>
        {kinds.length > 1 && (
          <div className="seg big">
            {kinds.map((k) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{LABEL[k]}</button>)}
          </div>
        )}
        {tab === 'mallet' && (
          <div className="seg">
            <button className={who === 1 ? 'on' : ''} onClick={() => setWho(1)}>{players[0]}</button>
            <button className={who === 2 ? 'on' : ''} onClick={() => setWho(2)}>{players[1]}</button>
          </div>
        )}
        <div className="skin-grid">
          {list.map((s) => (
            <button key={s.id} className={'skin ' + (s.id === current ? 'sel' : '')} onClick={() => pick(s.id)} aria-pressed={s.id === current}>
              <Preview skin={s} kind={tab} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
BRNEON_EOF_12

echo "  escribiendo src/ui/Skull.tsx"
write_start 'src/ui/Skull.tsx'
cat > 'src/ui/Skull.tsx' <<'BRNEON_EOF_13'
// Calavera pixel-art en SVG (usa currentColor, así toma el color del botón que la contiene).
const BITMAP = [
  '....########....',
  '..############..',
  '.##############.',
  '.##############.',
  '################',
  '##....####....##',
  '##....####....##',
  '###..######..###',
  '################',
  '######.##.######',
  '.######..######.',
  '..############..',
  '..##.##..##.##..',
  '..##.##..##.##..',
  '...##.####.##...',
];

const PATH = BITMAP.map((row, y) => {
  let d = '';
  for (let x = 0; x < row.length; x++) if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`;
  return d;
}).join('');

export default function Skull({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={'skull ' + className} viewBox="0 0 16 15" width={size} height={size * (15 / 16)} shapeRendering="crispEdges" aria-hidden focusable="false">
      <path d={PATH} fill="currentColor" />
    </svg>
  );
}
BRNEON_EOF_13

echo "  escribiendo tools/sim-hockey.ts"
write_start 'tools/sim-hockey.ts'
cat > 'tools/sim-hockey.ts' <<'BRNEON_EOF_14'
// node --experimental-strip-types tools/sim-hockey.ts : prueba rápida de la IA (impossible vs easy)
import { createHockey, step, aiThink } from '../src/games/hockey/engine.ts';
import type { AiLevel } from '../src/games/hockey/engine.ts';
const lv = (process.argv[2] || 'impossible') as AiLevel;
const lv0 = (process.argv[3] || 'easy') as AiLevel;
let w = [0, 0], frames = 0, goals = 0;
for (let g = 0; g < 20; g++) {
  const s = createHockey(7);
  let f = 0;
  while (s.phase !== 'OVER' && f++ < 60 * 60 * 8) {
    aiThink(s, lv0, 0); aiThink(s, lv, 1); step(s);
    s.events.length = 0;
  }
  if (s.winner !== null) w[s.winner]++;
  frames += f; goals += s.score[0] + s.score[1];
}
console.log(`IA izq=${lv0} vs IA der=${lv}`, w, `media ${(frames / 20 / 60).toFixed(0)}s por partido, goles ${goals / 20}`);
BRNEON_EOF_14

# ---------- archivos que se reemplazan por los nuevos (Skins y HockeySetup ya no existen: ahora viven dentro de cada juego)
if [ -f 'src/ui/Skins.tsx' ]; then backup 'src/ui/Skins.tsx'; rm -f 'src/ui/Skins.tsx'; echo "  eliminado src/ui/Skins.tsx"; fi
if [ -f 'src/ui/HockeySetup.tsx' ]; then backup 'src/ui/HockeySetup.tsx'; rm -f 'src/ui/HockeySetup.tsx'; echo "  eliminado src/ui/HockeySetup.tsx"; fi

# ---------- renombrado en archivos de configuración
for f in index.html package.json package-lock.json public/favicon.svg; do backup "$f"; done
sed -i.bak -e 's/BrNeon Games/brneon Arcade/g' index.html
sed -i.bak -e 's/"name": "brneon-games"/"name": "brneon-arcade"/g' package.json
[ -f package-lock.json ] && sed -i.bak -e 's/"name": "brneon-games"/"name": "brneon-arcade"/g' package-lock.json
sed -i.bak -e 's#>Br</text>#>br</text>#' public/favicon.svg
rm -f index.html.bak package.json.bak package-lock.json.bak public/favicon.svg.bak

echo
echo "Listo. Copia de seguridad en: $ROOT/$BK"
if command -v npm >/dev/null 2>&1; then
  [ -d node_modules ] || { echo "Instalando dependencias..."; npm install --no-audit --no-fund; }
  echo "Comprobando que compila..."
  if npm run build >/dev/null 2>&1; then echo "Compilación OK."; else echo "AVISO: la compilación falló. Ejecuta 'npm run build' para ver el error."; fi
  echo "Ahora corre:  npm run dev"
else
  echo "Instala Node.js y luego: npm install && npm run dev"
fi
