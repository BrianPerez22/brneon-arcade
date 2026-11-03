# BrNeon Games

Arcade 100 % front-end (React + Vite + TypeScript, sin servidor) con dos juegos:

* **Neon 2048 Pool** – lanza la bola contra fichas numeradas que se parten en dos.
* **Air Hockey** – contra la CPU (3 dificultades) o de a dos en la misma pantalla.

Incluye skins desbloqueadas para la bolita, las paletas (por jugador) y el disco.

## Cómo correrlo

```bash
npm install
npm run dev
```

La terminal muestra algo así:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.25:5173/
```

Abre la dirección **Network** en el celular (misma red WiFi). Si no abre, permite Node.js en el firewall del PC.

Otros comandos: `npm run build` (producción en `dist/`), `npm run preview` (sirve `dist/` también con IP de red),
`npm run sim:pool` (bot que juega el Pool para comprobar el balance).

## Controles

| | Pool | Air Hockey 1 jugador | Air Hockey 2 jugadores |
|---|---|---|---|
| Celular | arrastra hacia atrás y suelta | arrastra el dedo | cada jugador arrastra en su mitad, a la vez |
| PC | mouse (arrastrar y soltar) | mouse, WASD o flechas | J1: W A S D · J2: flechas |

Pausa en hockey: `Esc` o `P`.

## Sobre el zoom de Safari en iPhone

Safari iOS ignora `user-scalable=no`, así que se bloquea por tres vías (ver `src/core/noZoom.ts` y `src/styles.css`):
eventos `gesturestart/change/end`, `touchmove`/`touchstart` con más de un dedo, y doble toque; además el canvas usa `touch-action: none`
y la página es `position: fixed` sin scroll. Cada dedo se sigue con su propio `pointerId`, por eso dos jugadores pueden tocar a la vez.

## Estructura

```
src/core/      audio, skins, almacenamiento, ajuste del canvas, bloqueo de zoom
src/games/pool/    engine.ts (física, sin DOM) + PoolGame.tsx
src/games/hockey/  engine.ts (física + IA)     + HockeyGame.tsx
src/ui/        menú, skins, preparación del hockey
tools/         simulaciones de balance (Node 22+)
```
