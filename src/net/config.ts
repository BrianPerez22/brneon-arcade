// Configuración de PeerJS. Por defecto usa el servidor público gratuito de PeerJS (solo para el "apretón de manos").
// Si más adelante montas tu propio PeerServer o un backend, cambia aquí.
export const PEER_PREFIX = 'brneon-games-';
export const PEER_OPTIONS: Record<string, unknown> = {
  // host: 'tu-servidor.com', port: 443, path: '/peerjs', secure: true,   // <- PeerServer propio
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      // Para redes muy restrictivas (4G de algunos operadores, WiFi de universidades) hace falta un servidor TURN:
      // { urls: 'turn:tu-turn.com:3478', username: 'usuario', credential: 'clave' },
    ],
  },
};
