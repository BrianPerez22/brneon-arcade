// Capa de red de BrNeon Games. Los juegos solo conocen "Link" (un canal 1 a 1 con otro jugador).
// Para cambiar de PeerJS a un backend propio (WebSocket, Firebase...) basta con crear otro "Backend"
// (ver src/net/backends.ts) sin tocar los juegos.
export type Role = 'host' | 'guest';
export type Msg = { t: string; [k: string]: unknown };

export interface Link {
  role: Role;
  code: string;
  /** latencia de ida y vuelta en ms (se mide sola cada 2 s) */
  rtt: number;
  connected: boolean;
  send(msg: Msg): void;
  /** host: se llama cuando entra el amigo. guest: ya está conectado al resolverse joinRoom */
  onConnect(cb: () => void): void;
  onMessage(cb: (m: Msg) => void): void;
  onClose(cb: (reason: string) => void): void;
  close(): void;
}

export interface Backend {
  id: string;
  label: string;
  createRoom(): Promise<Link>;
  joinRoom(code: string): Promise<Link>;
}

// Sin letras confusas (0/O, 1/I/L)
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 5;
export const genCode = () =>
  Array.from({ length: CODE_LEN }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
export const normalizeCode = (s: string) =>
  s.toUpperCase().split('').filter((c) => CODE_ALPHABET.includes(c)).join('').slice(0, CODE_LEN);

/** Implementación común: cola de mensajes, latido (ping/pong), detección de caída. */
export class BaseLink implements Link {
  rtt = 0;
  connected = false;
  private msgCb?: (m: Msg) => void;
  private connCb?: () => void;
  private closeCb?: (r: string) => void;
  private queue: Msg[] = [];
  private closed = false;
  private reason = '';
  private lastRx = Date.now();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(public role: Role, public code: string, private raw: (m: Msg) => void, private kill: () => void) {}

  // ---- los backends llaman a estos
  markConnected() {
    this.connected = true; this.lastRx = Date.now();
    this.timer = setInterval(() => {
      if (Date.now() - this.lastRx > 9000) { this.remoteClosed('timeout'); return; }
      this.raw({ t: '__ping', ts: Date.now() });
    }, 2000);
    this.connCb?.();
  }
  receive(m: Msg) {
    this.lastRx = Date.now();
    if (m.t === '__ping') { this.raw({ t: '__pong', ts: m.ts }); return; }
    if (m.t === '__pong') { this.rtt = Date.now() - (m.ts as number); return; }
    if (this.msgCb) this.msgCb(m); else this.queue.push(m);
  }
  remoteClosed(reason: string) {
    if (this.closed) return;
    this.closed = true; this.connected = false; this.reason = reason;
    if (this.timer) clearInterval(this.timer);
    this.closeCb?.(reason);
    try { this.kill(); } catch { /* ya cerrado */ }
  }

  // ---- los juegos usan estos
  send(m: Msg) { if (this.connected && !this.closed) { try { this.raw(m); } catch { /* canal caído */ } } }
  onConnect(cb: () => void) { this.connCb = cb; if (this.connected) cb(); }
  onMessage(cb: (m: Msg) => void) { this.msgCb = cb; const q = this.queue; this.queue = []; q.forEach(cb); }
  onClose(cb: (r: string) => void) { this.closeCb = cb; if (this.closed) cb(this.reason); }
  close() {
    if (this.closed) return;
    this.closed = true; this.connected = false;
    if (this.timer) clearInterval(this.timer);
    try { this.kill(); } catch { /* ok */ }
  }
}
