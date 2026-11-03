// Capibara pixel art tierno (chibi): cabeza grande y redondita, hocico chato y tierno,
// cuerpo regordete, patitas cortas y casco de burbuja con mandarina (diseño del menú/interfaz).
export interface CapyColor { id: string; name: string; color: string }

export const CAPY_COLORS: CapyColor[] = [
  { id: 'azul', name: 'Azul neón', color: '#19f4ff' },
  { id: 'rosa', name: 'Rosa neón', color: '#ff2bd6' },
  { id: 'ambar', name: 'Ámbar', color: '#ffb800' },
  { id: 'lima', name: 'Lima', color: '#b6ff2e' },
  { id: 'violeta', name: 'Violeta', color: '#9b7bff' },
  { id: 'verde', name: 'Verde menta', color: '#38ff9c' },
  { id: 'rojo', name: 'Rojo neón', color: '#ff3b6b' },
];
export const findCapyColor = (id: string) => CAPY_COLORS.find((c) => c.id === id) ?? CAPY_COLORS[0];

export type CapyPose = 'run' | 'jump' | 'dead';
export interface CapyOpts {
  glow: string;
  t?: number;
  blink?: boolean;
  pose?: CapyPose;
  step?: number;
  helmet?: boolean;
  ghost?: boolean;
}

export function drawCapybara(ctx: CanvasRenderingContext2D, s: number, o: CapyOpts) {
  const t = o.t ?? 0, pose = o.pose ?? 'run', step = o.step ?? t * 14;
  const p = s / 24; // tamaño de píxel lógico
  const bob = pose === 'run' ? Math.round(Math.sin(step * 2)) * p * 0.45 : 0;

  ctx.save();
  ctx.translate(0, bob);

  if (o.ghost) {
    ctx.globalAlpha = 0.45;
  }

  const px = (x: number, y: number, w = 1, h = 1, col?: string) => {
    if (col) ctx.fillStyle = col;
    ctx.fillRect(Math.round(x * p), Math.round(y * p), Math.round(w * p), Math.round(h * p));
  };

  // Paleta tierna del capibara
  const ink = '#2c1a11';       // contorno pixel art
  const fur = '#b6804e';       // pelaje suave
  const snout = '#7e4e2a';     // hocico marrón
  const furDark = '#6c3e1c';   // patas sombra
  const blush = 'rgba(255, 114, 159, 0.85)'; // chapitas rosas kawaii
  const nostril = '#1c0f08';
  const glow = o.glow;

  const legStep = pose === 'run' ? Math.round(Math.sin(step) * 1.5) : pose === 'jump' ? -1 : 0;

  // 1. Patas traseras lejanas
  px(-4, 6 - legStep, 2.5, 2.5 + legStep, furDark);
  px(4, 6 + legStep, 2.5, 2.5 - legStep, furDark);

  // 2. Cuerpo regordete y tierno (bloque redondeado)
  px(-8, -2, 14, 8, ink);
  px(-7, -1, 12, 6, fur);
  px(-7, -2, 8, 1, '#cda172'); // brillo en lomo

  // 3. Patas cercanas
  px(-7, 6 + legStep, 2.5, 2.5 - legStep, fur);
  px(1, 6 - legStep, 2.5, 2.5 + legStep, fur);
  px(-7, 8, 2.5, 0.8, ink); px(1, 8, 2.5, 0.8, ink); // pezuñas

  // 4. Hocico chato característico
  px(5, 0, 7, 6, ink);
  px(5.5, 0.8, 5.5, 4.5, snout);
  // Naricita pixel
  px(10, 1.8, 1.5, 1.5, nostril);

  // 5. Orejitas tiernas en la cabeza
  px(-2, -6, 2.5, 2.5, ink); px(-1.5, -5.5, 1.5, 1.5, snout);
  px(2, -6, 2.5, 2.5, ink); px(2.5, -5.5, 1.5, 1.5, snout);

  // 6. Chapitas sonrojadas kawaii
  px(4, 3, 2.5, 1.5, blush);

  // 7. Ojito kawaii grande
  if (pose === 'dead') {
    // Ojito X
    px(4, 0, 1, 1, ink); px(6, 0, 1, 1, ink);
    px(5, 0.8, 1, 1, ink);
    px(4, 1.6, 1, 1, ink); px(6, 1.6, 1, 1, ink);
  } else if (o.blink) {
    // Parpadeo tierno
    px(4, 0.8, 3, 1, ink);
  } else {
    // Ojo brillante con reflejo blanco
    px(4, -0.2, 2.6, 2.6, ink);
    px(4, -0.2, 1.2, 1.2, '#ffffff'); // brillo de mirada tierna
  }

  // 8. Casco de burbuja neón y mandarina
  if (o.helmet !== false) {
    const cx = 5, cy = 0.5, cr = 9;

    // Aro neón pixelado del casco
    px(cx - 6, cy - cr, 12, 1.2, glow);
    px(cx - 6, cy + cr - 1, 12, 1.2, glow);
    px(cx - cr, cy - 6, 1.2, 12, glow);
    px(cx + cr - 1, cy - 6, 1.2, 12, glow);
    // Esquinas diagonales
    px(cx - 8, cy - 8, 2, 1.2, glow); px(cx + 6, cy - 8, 2, 1.2, glow);
    px(cx - 8, cy + 7, 2, 1.2, glow); px(cx + 6, cy + 7, 2, 1.2, glow);

    // Cristal translúcido de burbuja
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(Math.round((cx - 7) * p), Math.round((cy - 7) * p), Math.round(14 * p), Math.round(14 * p));

    // Reflejo blanco en el cristal
    px(cx - 5, cy - 7, 2.5, 1.2, '#ffffff');
    px(cx - 6, cy - 6, 1.2, 2.5, '#ffffff');
    px(cx + 5, cy + 5, 1.2, 1.2, '#ffffffaa');

    // Naranjita / Yuzu 🍊 pixel art en la cabeza
    if (pose !== 'dead') {
      const mx = cx - 1, my = cy - cr - 3.5;
      px(mx - 2, my, 4, 3, '#ff7a00');
      px(mx - 1.5, my - 0.8, 3, 1, '#ff7a00');
      px(mx - 1, my + 0.5, 1.5, 1.5, '#ffc83b'); // brillo naranja
      px(mx, my - 1.8, 2, 1.2, '#44cc22');       // hojita verde
      px(mx + 1, my - 1, 1, 1, '#2e9914');
    }
  }

  ctx.restore();
}
