// 2048 clásico. Las fichas conservan su id para animar el deslizamiento con CSS.
export interface T { id: number; v: number; r: number; c: number; ghost?: boolean; merged?: boolean; fresh?: boolean }
export type Dir = 'up' | 'down' | 'left' | 'right';
export const N = 4;

export interface Board { tiles: T[]; score: number; nextId: number }

export function emptyCells(tiles: T[]) {
  const used = new Set(tiles.filter((t) => !t.ghost).map((t) => t.r * N + t.c));
  const out: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!used.has(r * N + c)) out.push([r, c]);
  return out;
}

export function spawn(b: Board): Board {
  const cells = emptyCells(b.tiles);
  if (!cells.length) return b;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  return { ...b, tiles: [...b.tiles, { id: b.nextId, v: Math.random() < 0.9 ? 2 : 4, r, c, fresh: true }], nextId: b.nextId + 1 };
}

export function newGame(): Board {
  return spawn(spawn({ tiles: [], score: 0, nextId: 1 }));
}

/** Mueve y devuelve el nuevo tablero (con fichas "fantasma" que deben limpiarse tras la animación) */
export function move(b: Board, dir: Dir): { board: Board; moved: boolean; gained: number; maxMerged: number } {
  const live = b.tiles.filter((t) => !t.ghost);
  const out: T[] = [];
  let nextId = b.nextId, gained = 0, moved = false, maxMerged = 0;
  const horizontal = dir === 'left' || dir === 'right';
  const forward = dir === 'right' || dir === 'down'; // la meta está en el extremo alto del índice
  for (let line = 0; line < N; line++) {
    const row = live
      .filter((t) => (horizontal ? t.r : t.c) === line)
      .sort((a, b2) => { const ka = horizontal ? a.c : a.r, kb = horizontal ? b2.c : b2.r; return forward ? kb - ka : ka - kb; });
    let pos = 0;
    let last: { t: T; r: number; c: number; merged: boolean } | null = null;
    const coord = (p: number) => {
      const i = forward ? N - 1 - p : p;
      return horizontal ? { r: line, c: i } : { r: i, c: line };
    };
    for (const t of row) {
      if (last && !last.merged && last.t.v === t.v) {
        // fusión: ambas viajan al mismo punto y aparece una ficha nueva
        const at = { r: last.r, c: last.c };
        out.push({ ...last.t, ...at, ghost: true });
        out.push({ ...t, ...at, ghost: true });
        const nv = t.v * 2;
        gained += nv; maxMerged = Math.max(maxMerged, nv);
        const idx = out.findIndex((o) => o.id === last!.t.id && !o.ghost);
        if (idx >= 0) out.splice(idx, 1);
        out.push({ id: nextId++, v: nv, ...at, merged: true });
        last.merged = true; moved = true;
      } else {
        const p = coord(pos++);
        if (p.r !== t.r || p.c !== t.c) moved = true;
        const nt: T = { ...t, ...p, fresh: false, merged: false };
        out.push(nt);
        last = { t: nt, r: p.r, c: p.c, merged: false };
      }
    }
  }
  if (!moved) return { board: b, moved: false, gained: 0, maxMerged: 0 };
  let nb: Board = { tiles: out, score: b.score + gained, nextId };
  nb = spawn(nb);
  return { board: nb, moved: true, gained, maxMerged };
}

export function canMove(tiles: T[]) {
  const live = tiles.filter((t) => !t.ghost);
  if (live.length < N * N) return true;
  const g: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  live.forEach((t) => (g[t.r][t.c] = t.v));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c + 1 < N && g[r][c] === g[r][c + 1]) return true;
    if (r + 1 < N && g[r][c] === g[r + 1][c]) return true;
  }
  return false;
}
