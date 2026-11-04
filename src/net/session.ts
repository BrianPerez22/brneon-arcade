// Sesión online: UNA conexión 1 a 1 que sobrevive entre juegos.
//
// Flujo: el anfitrión crea la sala, el amigo entra con el código y ambos quedan en el "hub".
// Desde el hub el anfitrión elige cualquier juego compatible y la sesión lo abre en los dos lados.
// Los juegos NO conocen la sesión: reciben un `Link` normal (ver link.ts) que solo ve los mensajes de su partida.
//
//  - Mensajes de la sala (hub): `t` empieza por "hub:" (los maneja App).
//  - Mensajes de un juego: llevan la marca `__g` (id de la partida). Si llegan antes de que el juego esté abierto
//    se guardan; si pertenecen a una partida vieja se descartan. Así una revancha o un cambio de juego nunca
//    recibe mensajes "fantasma" del juego anterior.
import type { Link, Msg, Role } from './link.ts';

export type HubGame = 'hockey' | 'capy' | 'lucky' | 'roulette';

export const newGid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

class GameLink implements Link {
  private msgCb?: (m: Msg) => void;
  private closeCb?: (r: string) => void;
  private queue: Msg[] = [];
  private dead = false;
  constructor(private s: Session, readonly gid: string) {}

  get role(): Role { return this.s.role; }
  get code(): string { return this.s.code; }
  get rtt(): number { return this.s.rtt; }
  get connected(): boolean { return !this.dead && !this.s.closed; }

  send(m: Msg) { if (this.connected) this.s.base.send({ ...m, __g: this.gid }); }
  // La sesión ya está conectada cuando se abre un juego: avisa enseguida.
  onConnect(cb: () => void) { if (this.connected) cb(); }
  onMessage(cb: (m: Msg) => void) { this.msgCb = cb; const q = this.queue; this.queue = []; q.forEach(cb); }
  onClose(cb: (r: string) => void) { this.closeCb = cb; if (this.s.closed) cb(this.s.closeReason); }
  /** Cerrar el link de un juego solo sale del juego; la sala sigue abierta. */
  close() { this.s.closeGame(this); }

  /** (interno) */
  receive(m: Msg) { if (this.dead) return; if (this.msgCb) this.msgCb(m); else if (this.queue.length < 300) this.queue.push(m); }
  detach() { this.dead = true; this.msgCb = undefined; this.closeCb = undefined; this.queue = []; }
  notifyClose(r: string) { this.closeCb?.(r); }
}

export class Session {
  closed = false;
  closeReason = '';
  private hubCb?: (m: Msg) => void;
  private hubQueue: Msg[] = [];
  private closeCbs: ((r: string) => void)[] = [];
  private game: GameLink | null = null;
  private early = new Map<string, Msg[]>();

  constructor(readonly base: Link) {
    base.onMessage((m) => this.dispatch(m));
    base.onClose((r) => this.finish(r));
  }

  get role(): Role { return this.base.role; }
  get code(): string { return this.base.code; }
  get rtt(): number { return this.base.rtt; }
  get isHost(): boolean { return this.base.role === 'host'; }
  get activeGid(): string | null { return this.game?.gid ?? null; }

  private dispatch(m: Msg) {
    if (typeof m.t === 'string' && m.t.startsWith('hub:')) {
      if (this.hubCb) this.hubCb(m); else this.hubQueue.push(m);
      return;
    }
    const gid = m.__g as string | undefined;
    if (!gid) return;
    if (this.game && this.game.gid === gid) { this.game.receive(m); return; }
    if (this.game) return;               // otra partida ya abierta: mensaje viejo
    const list = this.early.get(gid) ?? [];
    if (list.length < 300) list.push(m);
    this.early.set(gid, list);
    if (this.early.size > 4) this.early.delete(this.early.keys().next().value as string);
  }

  /** Mensajes de la sala. Devuelve la función para dejar de escuchar. */
  onHub(cb: (m: Msg) => void) {
    this.hubCb = cb;
    const q = this.hubQueue; this.hubQueue = []; q.forEach(cb);
    return () => { if (this.hubCb === cb) this.hubCb = undefined; };
  }
  sendHub(t: string, data: Record<string, unknown> = {}) { this.base.send({ ...data, t: 'hub:' + t }); }
  onClose(cb: (r: string) => void) {
    this.closeCbs.push(cb);
    if (this.closed) cb(this.closeReason);
    return () => { this.closeCbs = this.closeCbs.filter((c) => c !== cb); };
  }

  /** Abre la partida `gid` y devuelve el Link que usará el juego. */
  openGame(gid: string): Link {
    if (this.game) this.game.detach();
    const g = new GameLink(this, gid);
    this.game = g;
    const pending = this.early.get(gid);
    this.early.clear();
    pending?.forEach((m) => g.receive(m));
    return g;
  }
  closeGame(g?: Link) {
    if (g && this.game !== g) return;
    this.game?.detach();
    this.game = null;
    this.early.clear();
  }

  private finish(reason: string) {
    if (this.closed) return;
    this.closed = true; this.closeReason = reason;
    this.game?.notifyClose(reason);
    this.closeCbs.slice().forEach((c) => c(reason));
  }

  /** Cierra la sala para los dos. */
  close() {
    if (this.closed) return;
    try { this.base.send({ t: 'hub:bye' }); } catch { /* ya caído */ }
    this.closed = true; this.closeReason = 'left';
    this.game?.detach(); this.game = null;
    // pequeño margen para que salga el aviso antes de cerrar el canal
    setTimeout(() => { try { this.base.close(); } catch { /* ok */ } }, 120);
  }
}
