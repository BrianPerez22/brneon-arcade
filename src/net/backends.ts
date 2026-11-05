import { BaseLink, genCode, normalizeCode } from './link.ts';
import type { Backend, HostRoom, Link, Msg } from './link.ts';
import { PEER_OPTIONS, PEER_PREFIX } from './config.ts';

// ------------------------------------------------------------------ PeerJS (WebRTC, sin servidor propio)
/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadPeer(): Promise<any> {
  const mod: any = await import('peerjs');
  return mod.Peer ?? mod.default;
}
function openPeer(Peer: any, id?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
    const timer = setTimeout(() => { try { p.destroy(); } catch { /* ok */ } reject({ type: 'timeout' }); }, 12000);
    p.on('open', () => { clearTimeout(timer); resolve(p); });
    p.on('error', (e: any) => { clearTimeout(timer); reject(e); });
  });
}
function wire(link: BaseLink, conn: any) {
  conn.on('data', (d: Msg) => link.receive(d));
  conn.on('close', () => link.remoteClosed('closed'));
  conn.on('error', () => link.remoteClosed('error'));
}

/** Sala con varios invitados: guarda los enlaces y avisa de cada uno nuevo. */
function makeRoom(code: string, backendId: string, destroy: () => void): HostRoom & { emit(l: Link): void } {
  let cb: ((l: Link) => void) | undefined;
  const pending: Link[] = [], all: Link[] = [];
  let closed = false;
  return {
    code, backendId,
    onGuest(f) { cb = f; pending.splice(0).forEach(f); },
    emit(l) { all.push(l); if (cb) cb(l); else pending.push(l); },
    close() {
      if (closed) return;
      closed = true;
      all.forEach((l) => { try { l.close(); } catch { /* ok */ } });
      destroy();
    },
  };
}

export const peerBackend: Backend = {
  id: 'peerjs',
  label: 'Internet (PeerJS)',
  async createRoom(): Promise<HostRoom> {
    const Peer = await loadPeer();
    let peer: any = null, code = '';
    for (let i = 0; i < 8 && !peer; i++) {
      code = genCode();
      try { peer = await openPeer(Peer, PEER_PREFIX + code); }
      catch (e: any) { if (e?.type !== 'unavailable-id') throw e; }
    }
    if (!peer) throw { type: 'unavailable-id' };
    const room = makeRoom(code, 'peerjs', () => { try { peer.destroy(); } catch { /* ok */ } });
    // Cada invitado es una conexión aparte con el anfitrión. Quien decide si la sala está llena o la partida ya
    // empezó es la Session (net/session.ts): aquí se acepta a todos y se avisa.
    peer.on('connection', (c: any) => {
      const link = new BaseLink('host', code, (m) => c.send(m), () => { try { c.close(); } catch { /* ok */ } });
      wire(link, c);
      link.onConnect(() => room.emit(link));
      if (c.open) link.markConnected(); else c.on('open', () => link.markConnected());
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ok */ } });
    peer.on('error', () => { /* errores tardíos: el latido detecta la caída */ });
    return room;
  },
  async joinRoom(raw: string): Promise<Link> {
    const code = normalizeCode(raw);
    const Peer = await loadPeer();
    const peer = await openPeer(Peer);
    return new Promise<Link>((resolve, reject) => {
      let conn: any = null, settled = false;
      const fail = (e: unknown) => { if (settled) return; settled = true; try { peer.destroy(); } catch { /* ok */ } reject(e); };
      const link = new BaseLink('guest', code, (m) => conn?.send(m), () => { try { peer.destroy(); } catch { /* ok */ } });
      const timer = setTimeout(() => fail({ type: 'peer-unavailable' }), 12000);
      peer.on('error', (e: any) => { clearTimeout(timer); if (!settled) fail(e); });
      conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
      wire(link, conn);
      conn.on('open', () => { clearTimeout(timer); if (settled) return; settled = true; link.markConnected(); resolve(link); });
    });
  },
};

// ------------------------------------------------------------------ Local (BroadcastChannel): dos pestañas del mismo navegador.
// Sirve para probar sin internet. También es el ejemplo más corto de cómo escribir un Backend nuevo.
export const localBackend: Backend = {
  id: 'local',
  label: 'Misma PC (dos pestañas)',
  async createRoom(): Promise<HostRoom> {
    const code = genCode(), me = Math.random().toString(36).slice(2);
    const ch = new BroadcastChannel('brneon-' + code);
    const guests = new Map<string, BaseLink>();
    const room = makeRoom(code, 'local', () => { try { ch.close(); } catch { /* ok */ } });
    ch.onmessage = (e) => {
      const d = e.data;
      if (d.from === me) return;
      if (d.hello) {
        if (guests.has(d.from)) return;
        const gid: string = d.from;
        const link = new BaseLink('host', code, (m) => ch.postMessage({ from: me, to: gid, m }), () => { ch.postMessage({ from: me, to: gid, bye: true }); guests.delete(gid); });
        guests.set(gid, link);
        link.onConnect(() => room.emit(link));
        ch.postMessage({ from: me, to: gid, welcome: true });
        link.markConnected();
        return;
      }
      if (d.to !== me) return;
      const link = guests.get(d.from);
      if (!link) return;
      if (d.bye) { link.remoteClosed('closed'); return; }
      if (d.m) link.receive(d.m);
    };
    return room;
  },
  joinRoom(raw: string): Promise<Link> {
    const code = normalizeCode(raw), me = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      const ch = new BroadcastChannel('brneon-' + code);
      let hostId: string | null = null, done = false;
      const link = new BaseLink('guest', code, (m) => ch.postMessage({ from: me, to: hostId, m }), () => { ch.postMessage({ from: me, to: hostId, bye: true }); ch.close(); });
      const timer = setTimeout(() => { if (!done) { done = true; ch.close(); reject({ type: 'peer-unavailable' }); } }, 2500);
      ch.onmessage = (e) => {
        const d = e.data;
        if (d.from === me) return;
        if (d.welcome && d.to === me && !hostId) { hostId = d.from; done = true; clearTimeout(timer); link.markConnected(); resolve(link); return; }
        if (d.to !== me) return;
        if (d.bye) { link.remoteClosed('closed'); return; }
        if (d.m) link.receive(d.m);
      };
      ch.postMessage({ from: me, hello: true });
    });
  },
};

export const BACKENDS: Record<string, Backend> = { peerjs: peerBackend, local: localBackend };

export function explainError(e: any): string {
  const t = e?.type ?? e?.message ?? '';
  if (t === 'peer-unavailable') return 'No encontramos esa sala. Revisa el código (o pídele que la cree de nuevo).';
  if (t === 'unavailable-id') return 'No se pudo reservar un código libre. Inténtalo otra vez.';
  if (t === 'timeout') return 'El servidor de salas tardó demasiado. Revisa tu internet e inténtalo de nuevo.';
  if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(t)) return 'No se pudo conectar con el servidor de salas. Revisa tu internet.';
  if (/Failed to fetch dynamically|Cannot find module|import/i.test(String(e?.message))) return 'Falta instalar PeerJS: ejecuta "npm install" en la carpeta del proyecto.';
  return 'No se pudo conectar. Inténtalo de nuevo.';
}
