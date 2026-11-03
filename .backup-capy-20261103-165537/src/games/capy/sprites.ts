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
