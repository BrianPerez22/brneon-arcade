// Sesión online: una sala de 2 a 4 personas que sobrevive entre juegos.
//
// Topología en estrella: el anfitrión tiene UNA conexión (Link 1 a 1) con cada invitado; los invitados solo hablan con él.
// Flujo: el anfitrión crea la sala, los demás entran con el código y todos quedan en el "hub". Desde el hub el anfitrión
// elige un juego compatible con el número de jugadores y la sesión lo abre en todos los dispositivos.
// Los juegos NO conocen la sesión: reciben un `Link` normal (ver link.ts) que solo ve los mensajes de su partida.
//
//  - Mensajes de la sala (hub): `t` empieza por "hub:" (los maneja App y esta clase).
//  - Mensajes de un juego: llevan la marca `__g` (id de la partida). Si llegan antes de que el juego esté abierto
//    se guardan; si pertenecen a una partida vieja se descartan.
//  - Lo que un invitado manda en un juego llega al anfitrión y este lo reenvía a los demás invitados con `__from`
//    (posición del emisor en la partida). Lo que manda el anfitrión llega a todos los invitados.
//  - Ranking: el anfitrión suma victorias (`link.reportWin`) y reparte la tabla (`hub:roster`) hasta que la sala se cierre.
import type { HostRoom, Link, Msg, Role } from './link.ts';

export type HubGame = 'hockey' | 'capy' | 'lucky' | 'roulette';

export const MAX_PLAYERS = 4;
/** Cuántos jugadores admite cada juego dentro de una sala. Air Hockey y Capy Run son 1 contra 1. */
export const GAME_LIMITS: Record<HubGame, { min: number; max: number }> = {
  hockey: { min: 2, max: 2 },
  capy: { min: 2, max: 2 },
  lucky: { min: 2, max: 4 },
  roulette: { min: 2, max: 4 },
};
export const supportsPlayers = (g: HubGame, n: number) => n >= GAME_LIMITS[g].min && n <= GAME_LIMITS[g].max;

/** Colores de cada puesto de la sala (mismo orden en todos los dispositivos). */
export const SLOT_COLORS = ['#19f4ff', '#ff2bd6', '#ffb800', '#b6ff2e'];
export const slotName = (slot: number) => (slot === 0 ? 'Anfitrión' : `Jugador ${slot + 1}`);

export interface Member { slot: number; name: string; wins: number }

export const newGid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

class GameLink implements Link {
  private msgCb?: (m: Msg) => void;
  private closeCb?: (r: string) => void;
  private queue: Msg[] = [];
  private dead = false;
  /** `order`: puestos de la sala que juegan, en orden. La posición en esta lista es el índice del jugador en el juego. */
  constructor(private s: Session, readonly gid: string, readonly order: number[]) {}

  get role(): Role { return this.s.role; }
  get code(): string { return this.s.code; }
  get rtt(): number { return this.s.rtt; }
  get connected(): boolean { return !this.dead && !this.s.closed; }
  get index(): number { return Math.max(0, this.order.indexOf(this.s.slot)); }
  get players(): number { return this.order.length; }

  send(m: Msg) { if (this.connected) this.s.sendGame(this.gid, this.order, m); }
  reportWin(winners: number[], key: string) { this.s.reportWin(this, winners, key); }
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
  readonly isHost: boolean;
  /** Mi puesto en la sala: 0 = anfitrión; los invitados lo reciben al entrar (`hub:welcome`). */
  slot: number;
  private members: Member[];
  private guests = new Map<number, Link>();   // anfitrión: puesto → conexión con ese invitado
  private base: Link | null = null;           // invitado: conexión con el anfitrión
  private hubCb?: (m: Msg) => void;
  private hubQueue: Msg[] = [];
  private closeCbs: ((r: string) => void)[] = [];
  private changeCbs = new Set<() => void>();
  private game: GameLink | null = null;
  private early = new Map<string, Msg[]>();
  private reported = new Set<string>();

  /** Anfitrión: `new Session(primerInvitado, sala)`. Invitado: `new Session(enlaceConElAnfitrion)`. */
  constructor(link: Link, readonly room?: HostRoom) {
    this.isHost = !!room;
    if (room) {
      this.slot = 0;
      this.members = [{ slot: 0, name: slotName(0), wins: 0 }];
      this.addGuest(link);
      room.onGuest((l) => this.addGuest(l));
    } else {
      this.slot = -1;
      this.members = [];
      this.base = link;
      link.onMessage((m) => this.fromHost(m));
      link.onClose((r) => this.finish(r));
    }
  }

  get role(): Role { return this.isHost ? 'host' : 'guest'; }
  get code(): string { return this.room?.code ?? this.base?.code ?? ''; }
  get backendId(): string { return this.room?.backendId ?? ''; }
  get rtt(): number {
    if (this.base) return this.base.rtt;
    let r = 0; this.guests.forEach((l) => { r = Math.max(r, l.rtt); }); return r;
  }
  get activeGid(): string | null { return this.game?.gid ?? null; }
  /** Tabla de la sala (puestos presentes, con sus victorias). */
  get roster(): Member[] { return this.members.map((m) => ({ ...m })); }
  get playerCount(): number { return this.members.length; }
  /** Puestos presentes, en orden: lo que usa el anfitrión para abrir una partida. */
  slots(): number[] { return this.members.map((m) => m.slot).sort((a, b) => a - b); }

  /** Avisa cuando cambia la gente de la sala o el ranking. Devuelve la función para dejar de escuchar. */
  onChange(cb: () => void) { this.changeCbs.add(cb); return () => { this.changeCbs.delete(cb); }; }
  private notify() { this.changeCbs.forEach((c) => c()); }

  // ------------------------------------------------------------ anfitrión: invitados
  private addGuest(link: Link) {
    if (this.closed) { try { link.close(); } catch { /* ok */ } return; }
    let slot = -1;
    for (let s = 1; s < MAX_PLAYERS; s++) if (!this.guests.has(s)) { slot = s; break; }
    if (slot < 0 || this.game) {
      // Sala llena o partida en curso: se le avisa y se cierra su conexión.
      link.send({ t: 'hub:reject', why: slot < 0 ? 'full' : 'busy' });
      setTimeout(() => { try { link.close(); } catch { /* ok */ } }, 400);
      return;
    }
    this.guests.set(slot, link);
    this.members.push({ slot, name: slotName(slot), wins: 0 });
    this.members.sort((a, b) => a.slot - b.slot);
    link.onMessage((m) => this.fromGuest(slot, m));
    link.onClose(() => this.guestGone(slot));
    link.send({ t: 'hub:welcome', slot });
    this.broadcastRoster();
    this.notify();
  }

  private guestGone(slot: number) {
    const link = this.guests.get(slot);
    if (!link) return;
    this.guests.delete(slot);
    try { link.close(); } catch { /* ok */ }
    this.members = this.members.filter((m) => m.slot !== slot);
    const inGame = !!this.game && this.game.order.includes(slot);
    this.broadcastRoster();
    this.emitHub({ t: 'hub:left', slot, inGame });
    this.notify();
  }

  private broadcastRoster() {
    this.guests.forEach((l) => l.send({ t: 'hub:roster', players: this.members }));
  }

  private fromGuest(slot: number, m: Msg) {
    if (typeof m.t === 'string' && m.t.startsWith('hub:')) {
      if (m.t === 'hub:bye') this.guestGone(slot);
      else if (m.t === 'hub:back') {
        // un invitado salió del juego: se avisa a los demás y el anfitrión vuelve a la sala
        this.guests.forEach((l, s) => { if (s !== slot) l.send({ t: 'hub:back' }); });
        this.emitHub({ ...m, slot });
      }
      return;
    }
    const gid = m.__g as string | undefined;
    const game = this.game;
    if (!gid || !game || game.gid !== gid) return;
    const idx = game.order.indexOf(slot);
    if (idx < 0) return;
    const tagged: Msg = { ...m, __from: idx };
    game.order.forEach((s) => { if (s !== slot && s !== 0) this.guests.get(s)?.send(tagged); });
    game.receive(tagged);
  }

  // ------------------------------------------------------------ invitado: mensajes del anfitrión
  private fromHost(m: Msg) {
    if (typeof m.t === 'string' && m.t.startsWith('hub:')) {
      if (m.t === 'hub:welcome') { this.slot = Number(m.slot); this.notify(); return; }
      if (m.t === 'hub:roster') { this.members = (m.players as Member[]) ?? []; this.notify(); return; }
      this.emitHub(m);
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

  // ------------------------------------------------------------ mensajes de la sala
  private emitHub(m: Msg) { if (this.hubCb) this.hubCb(m); else this.hubQueue.push(m); }
  /** Mensajes de la sala. Devuelve la función para dejar de escuchar. */
  onHub(cb: (m: Msg) => void) {
    this.hubCb = cb;
    const q = this.hubQueue; this.hubQueue = []; q.forEach(cb);
    return () => { if (this.hubCb === cb) this.hubCb = undefined; };
  }
  /** Anfitrión: lo manda a todos los invitados. Invitado: lo manda al anfitrión. */
  sendHub(t: string, data: Record<string, unknown> = {}) {
    const msg = { ...data, t: 'hub:' + t };
    if (this.base) this.base.send(msg); else this.guests.forEach((l) => l.send(msg));
  }
  onClose(cb: (r: string) => void) {
    this.closeCbs.push(cb);
    if (this.closed) cb(this.closeReason);
    return () => { this.closeCbs = this.closeCbs.filter((c) => c !== cb); };
  }

  // ------------------------------------------------------------ partidas
  /** (interno) lo usa GameLink */
  sendGame(gid: string, order: number[], m: Msg) {
    const msg = { ...m, __g: gid };
    if (this.base) this.base.send(msg);
    else order.forEach((s) => { if (s !== 0) this.guests.get(s)?.send(msg); });
  }

  /** Abre la partida `gid` con los jugadores `order` (puestos de la sala) y devuelve el Link que usará el juego. */
  openGame(gid: string, order: number[] = [0, 1]): Link {
    if (this.game) this.game.detach();
    const g = new GameLink(this, gid, order);
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

  // ------------------------------------------------------------ ranking
  /** (interno) lo usa GameLink. Solo cuenta si lo manda el anfitrión durante la partida activa. */
  reportWin(g: GameLink, winners: number[], key: string) {
    if (!this.isHost || this.game !== g) return;
    const k = g.gid + ':' + key;
    if (this.reported.has(k)) return;
    this.reported.add(k);
    for (const idx of winners) {
      const slot = g.order[idx];
      const mem = this.members.find((x) => x.slot === slot);
      if (mem) mem.wins++;
    }
    this.broadcastRoster();
    this.notify();
  }

  // ------------------------------------------------------------ cierre
  private finish(reason: string) {
    if (this.closed) return;
    this.closed = true; this.closeReason = reason;
    this.game?.notifyClose(reason);
    this.closeCbs.slice().forEach((c) => c(reason));
  }

  /** Cierra la sala: si eres el anfitrión se cierra para todos; si eres invitado, solo sales tú. */
  close() {
    if (this.closed) return;
    try {
      if (this.base) this.base.send({ t: 'hub:bye' });
      else this.guests.forEach((l) => l.send({ t: 'hub:bye' }));
    } catch { /* ya caído */ }
    this.closed = true; this.closeReason = 'left';
    this.game?.detach(); this.game = null;
    // pequeño margen para que salga el aviso antes de cerrar los canales
    setTimeout(() => {
      try { this.base?.close(); } catch { /* ok */ }
      try { this.room?.close(); } catch { /* ok */ }
    }, 120);
  }
}
