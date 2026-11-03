// Historial de partidas por juego, guardado en localStorage de cada dispositivo
// (dura hasta que se borren los datos del sitio / cookies).
import { load, save } from './storage.ts';

export interface ScoreEntry { score: number; extra?: string; date: number }
const MAX = 50;
const key = (game: string) => `scores:${game}`;

export const loadScores = (game: string): ScoreEntry[] => {
  const v = load<ScoreEntry[]>(key(game), []);
  return Array.isArray(v) ? v : [];
};
export function addScore(game: string, entry: Omit<ScoreEntry, 'date'>): ScoreEntry[] {
  const list = [{ ...entry, date: Date.now() }, ...loadScores(game)].slice(0, MAX);
  save(key(game), list);
  return list;
}
export const clearScores = (game: string) => save(key(game), [] as ScoreEntry[]);
export const topScores = (list: ScoreEntry[], n = 10) => [...list].sort((a, b) => b.score - a.score).slice(0, n);
export const fmtDate = (t: number) => new Date(t).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
