# Publicar en GitHub Pages y jugar online

## 1. Subir el proyecto
```bash
git init && git add . && git commit -m "BrNeon Games"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```
En GitHub: **Settings → Pages → Source: GitHub Actions**. Cada `git push` a `main` publica solo
(`.github/workflows/deploy.yml`). La web queda en `https://TU_USUARIO.github.io/TU_REPO/`.
`vite.config.ts` usa `base: './'`, así que funciona con cualquier nombre de repo.

## 2. Cómo funciona el online (sin servidor propio)
* Usa **PeerJS** (WebRTC): los dos navegadores se conectan directo; solo se usa el servidor público gratuito de PeerJS para que se encuentren.
* El **código de amistad** (5 caracteres) es el ID de la sala. También se puede compartir un enlace `?sala=XXXXX&juego=hockey`.
* Air Hockey: el anfitrión simula la física y el invitado la ve con predicción. Suerte 2048: por turnos, 1 contra 1.
* Si a algún amigo no le conecta (WiFi de universidad/oficina, algunos datos móviles) hace falta un servidor TURN: ver `src/net/config.ts`.
* **Modo prueba** (casilla en el lobby): dos pestañas del mismo navegador, sin internet.

## 3. Cambiar a un backend propio más adelante
Los juegos solo usan la interfaz `Link` de `src/net/link.ts`. Para usar WebSockets/Firebase/Supabase:
1. Escribe un `Backend` nuevo en `src/net/backends.ts` (`createRoom()` y `joinRoom(code)` que devuelvan un `BaseLink`;
   `localBackend` es el ejemplo más corto).
2. Regístralo en `BACKENDS` y úsalo en `src/ui/Online.tsx` en lugar de `'peerjs'`.
No hay que tocar HockeyGame ni LuckyGame.
