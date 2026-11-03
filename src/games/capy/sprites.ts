// Sprites pixel-art retro, 1 solo color (D) + el color del fondo (w = "hueco"). '.' = transparente.
export const SPRITES = {
  capyA: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DD..DD.....DD.DD.',
    '.DD..DD.....DD.DD.',
    '.DD..DD.....DD.DD.',
    '.DD............DD.'
  ],
  capyB: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD...DD..DD.',
    '..DD..DD...DD..DD.',
    '..DD..DD...DD..DD.',
    '......DD...DD.....'
  ],
  capyJump: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    'DD..DD......DD..DD',
    '....DD......DD....',
    '..................',
    '..................'
  ],
  capyDuck: [
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDDwDDD',
    '..DDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.'
  ],
  capyDead: [
    '..........DD......',
    '..........DDDDDDD.',
    '.........DDDDDDDDD',
    '.........DDDDwDwDD',
    '..DDDDDDDDDDDDwDDD',
    '.DDDDDDDDDDDDwDwDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDD',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.',
    '..DD..DD....DD.DD.'
  ],
  bambooTall: [
    '.D......D..',
    '.DDD..DDD..',
    '..DDDDDD...',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.DD..',
    '...DDDD....',
    '....DD.....',
    '.DD.DD.....',
    '...DDD.....',
    '...DDDD....',
    '....DD.....',
    '....DD.....',
    '....DD.....'
  ],
  bambooShort: [
    '.D......D..',
    '.DDD..DDD..',
    '..DDDDDD...',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '....DD.....',
    '...DDDD....',
    '....DD.....',
    '....DD.....',
    '....DD.....'
  ],
  crowUp: [
    '........DD..',
    '.......DDD..',
    '..DDD.DDDDD.',
    '.DwDDDDDDDD.',
    'DDDDDDDDDDDD',
    'DDDDDDDDDDDD',
    '...DDDDDDD..',
    '............',
    '............'
  ],
  crowDown: [
    '............',
    '............',
    '..DDD.......',
    '.DwDDDDDDDD.',
    'DDDDDDDDDDDD',
    'DDDDDDDDDDDD',
    '...DDDDDDD..',
    '......DDDDD.',
    '.......DDD..'
  ],
} as const;
export type SpriteName = keyof typeof SPRITES;

export const PX = 3; // cada píxel de arte se dibuja de 3x3 px lógicos
export const spriteSize = (n: SpriteName) => ({ w: SPRITES[n][0].length, h: SPRITES[n].length });

// Paleta tipo consola portátil: de día sprites oscuros sobre fondo claro; de noche, al revés.
export interface Theme { bg: string; ink: string; soft: string }
export const DAY: Theme = { bg: '#9bbc0f', ink: '#0f380f', soft: '#8bac0f' };
export const NIGHT: Theme = { bg: '#0f380f', ink: '#9bbc0f', soft: '#306230' };

const cache = new Map<string, HTMLCanvasElement>();
/** Sprite ya "pintado" en un canvas del tamaño del arte; se dibuja ampliado sin suavizado. */
export function getSprite(n: SpriteName, t: Theme): HTMLCanvasElement {
  const key = n + t.ink;
  let c = cache.get(key);
  if (c) return c;
  const rows = SPRITES[n];
  c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; g.fillStyle = ch === 'D' ? t.ink : t.bg; g.fillRect(x, y, 1, 1); } });
  cache.set(key, c);
  return c;
}

/** Mismo sprite como trazado SVG (arte del menú). */
export function spritePath(n: SpriteName): string {
  let d = '';
  SPRITES[n].forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'D') d += `M${x} ${y}h1v1h-1z`; });
  return d;
}
