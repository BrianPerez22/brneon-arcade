// Paleta neón de las fichas 2048 (compartida por Suerte 2048 y 2048)
export interface TileTheme { bg: string; border: string; text: string }
export const TILE_COLORS: Record<number, TileTheme> = {
  2: { bg: '#00ffcc', border: '#99ffe6', text: '#00332a' },
  4: { bg: '#ff00aa', border: '#ff80d5', text: '#ffffff' },
  8: { bg: '#ff3300', border: '#ff8866', text: '#ffffff' },
  16: { bg: '#ff8800', border: '#ffbb66', text: '#ffffff' },
  32: { bg: '#ffea00', border: '#fff580', text: '#302800' },
  64: { bg: '#ccff00', border: '#e6ff80', text: '#203000' },
  128: { bg: '#00ff66', border: '#80ffb3', text: '#002010' },
  256: { bg: '#00e5ff', border: '#99f5ff', text: '#001020' },
  512: { bg: '#0044ff', border: '#6699ff', text: '#ffffff' },
  1024: { bg: '#9900ff', border: '#cc66ff', text: '#ffffff' },
  2048: { bg: '#ff0055', border: '#ff66aa', text: '#ffffff' },
  4096: { bg: '#ffffff', border: '#ffd6f5', text: '#1a0030' },
  8192: { bg: '#ffb800', border: '#ffffff', text: '#2a1700' },
};
export const tileTheme = (v: number): TileTheme => TILE_COLORS[v] ?? { bg: '#ffffff', border: '#ffffff', text: '#000000' };
