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
  aiLevel: 'easy' | 'normal' | 'hard';
  goalsToWin: number;
}
export const defaultSettings: Settings = {
  sound: true, ball: 'cian', mallet1: 'cian', mallet2: 'magenta', puck: 'clasico', aiLevel: 'normal', goalsToWin: 7,
};
export const loadSettings = (): Settings => ({ ...defaultSettings, ...load<Partial<Settings>>('settings', {}) });
export const saveSettings = (s: Settings) => save('settings', s);
