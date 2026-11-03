import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => rutas relativas: funciona en GitHub Pages (usuario.github.io/nombre-repo/)
// sin importar cómo se llame el repositorio.
// host: true => "npm run dev" muestra Local (localhost) y Network (IP de la red).
//
// Cloudflare Tunnel (cloudflared):
//   1) npm run dev
//   2) cloudflared tunnel --url http://localhost:5173
//   Abre la URL https://xxxx.trycloudflare.com que te muestra cloudflared.
//   Si el hot reload no se actualiza a través del túnel, inicia así:  TUNNEL=1 npm run dev
//   (en Windows PowerShell:  $env:TUNNEL=1; npm run dev)
//
// Dominio propio en un túnel con nombre: EXTRA_HOSTS=juego.midominio.com npm run dev
const extraHosts = (process.env.EXTRA_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);
const allowedHosts = ['.trycloudflare.com', '.cfargotunnel.com', ...extraHosts];
const viaTunnel = process.env.TUNNEL === '1';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts,
    // Detrás de https, el websocket del hot reload debe usar wss y el puerto 443
    ...(viaTunnel ? { hmr: { protocol: 'wss', clientPort: 443 } } : {}),
  },
  preview: { host: true, port: 4173, allowedHosts },
});