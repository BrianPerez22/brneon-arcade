import { BaseLink, genCode, normalizeCode } from './link.ts';
import type { Backend, Link, Msg } from './link.ts';
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

export const peerBackend: Backend = {
  id: 'peerjs',
  label: 'Internet (PeerJS)',
  async createRoom(): Promise<Link> {
    const Peer = await loadPeer();
    let peer: any = null, code = '';
    for (let i = 0; i < 8 && !peer; i++) {
      code = genCode();
      try { peer = await openPeer(Peer, PEER_PREFIX + code); }
      catch (e: any) { if (e?.type !== 'unavailable-id') throw e; }
    }
    if (!peer) throw { type: 'unavailable-id' };
    let conn: any = null;
    const link = new BaseLink('host', code, (m) => conn?.send(m), () => { try { peer.destroy(); } catch { /* ok */ } });
    peer.on('connection', (c: any) => {
      if (conn) { c.on('open', () => c.close()); return; } // sala llena (1 contra 1)
      conn = c;
      wire(link, c);
      if (c.open) link.markConnected(); else c.on('open', () => link.markConnected());
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ok */ } });
    peer.on('error', () => { /* errores tardíos: el latido detecta la caída */ });
    return link;
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
  async createRoom(): Promise<Link> {
    const code = genCode(), me = Math.random().toString(36).slice(2);
    const ch = new BroadcastChannel('brneon-' + code);
    let peerId: string | null = null;
    const link = new BaseLink('host', code, (m) => ch.postMessage({ from: me, to: peerId, m }), () => { ch.postMessage({ from: me, to: peerId, bye: true }); ch.close(); });
    ch.onmessage = (e) => {
      const d = e.data;
      if (d.from === me) return;
      if (d.hello && !peerId) { peerId = d.from; ch.postMessage({ from: me, to: peerId, welcome: true }); link.markConnected(); return; }
      if (d.to !== me) return;
      if (d.bye) { link.remoteClosed('closed'); return; }
      if (d.m) link.receive(d.m);
    };
    return link;
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
