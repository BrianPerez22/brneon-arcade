# brneon Arcade

Arcade 100 % front-end (React + Vite + TypeScript, sin servidor) con cinco juegos. Cada juego trae sus propios botones dentro de su interfaz (modo de juego, dificultad, skins...):

* **Neon 2048 Pool** – lanza la bola contra fichas numeradas que se parten en dos. Skins de bolita dentro del juego.
* **Air Hockey** – 1 o 2 jugadores, dificultad Fácil / Difícil / Imposible (calavera), skins de paleta y disco; todo en la pantalla previa y en la pausa.
* **Suerte 2048** – voltea fichas y suma, contra la máquina o varios jugadores.
* **2048** – el clásico.
* **Capy Run** – estilo dinosaurio de Chrome: un capibara pixel-art salta bambú y se agacha ante los cuervos.

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
src/games/capy/    sprites.ts (pixel art) + CapyGame.tsx
src/ui/        menú, selector de skins (se usa dentro de cada juego), calavera SVG
tools/         simulaciones de balance (Node 22+)
```

**Capy Run:** Espacio / flecha arriba salta, flecha abajo se agacha, P pausa. En el celular toca la pantalla (o «Saltar») y mantén «Agacharse».
