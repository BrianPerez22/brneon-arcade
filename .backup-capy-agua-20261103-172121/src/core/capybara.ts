// Capibara tierno: cabezón, cuerpo chiquito y patas traseras pegadas a las delanteras.
// Se dibuja centrado en (0,0) mirando a la derecha; s = tamaño aproximado (ancho total).
export interface CapyColor { id: string; name: string; color: string }

// Por defecto 'azul' = el mismo azul neón del resto de BrNeon (--cyan)
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

export interface CapyOpts { glow: string; t?: number; blink?: boolean; step?: number }

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function drawCapybara(ctx: CanvasRenderingContext2D, s: number, o: CapyOpts) {
  const t = o.t ?? 0, bob = Math.sin(t * 5) * s * 0.012;
  const fur = '#b9854f', furDark = '#8a5c33', belly = '#d9aa72', ink = '#2a1608';
  ctx.save();
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.025);

  // brillo neón del color elegido
  ctx.shadowColor = o.glow; ctx.shadowBlur = s * 0.12;

  // patas (cortitas): las traseras casi tocan a las delanteras
  const leg = (x: number, y: number, w: number, h: number, shade: string) => {
    ctx.fillStyle = shade; ctx.strokeStyle = o.glow;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, w * 0.45); ctx.fill(); ctx.stroke();
  };
  const sw = (o.step ?? 0) * s * 0.012;
  leg(-s * 0.1 - sw, s * 0.2, s * 0.13, s * 0.15, furDark);   // trasera
  leg(s * 0.03 + sw, s * 0.2, s * 0.13, s * 0.15, furDark);   // delantera (muy cerca de la trasera)

  // cuerpo chiquito
  ctx.fillStyle = fur; ctx.strokeStyle = o.glow;
  ellipse(ctx, -s * 0.06, s * 0.14, s * 0.25, s * 0.17); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = belly; ellipse(ctx, -s * 0.04, s * 0.2, s * 0.16, s * 0.08); ctx.fill();
  // patas del frente (más claras, delante del cuerpo)
  ctx.shadowBlur = s * 0.12;
  leg(-s * 0.02 + sw, s * 0.2, s * 0.13, s * 0.15, fur);
  leg(s * 0.1 - sw, s * 0.2, s * 0.13, s * 0.15, fur);
  ctx.shadowBlur = 0;

  // cabezota (más grande que el cuerpo)
  ctx.shadowColor = o.glow; ctx.shadowBlur = s * 0.12;
  ctx.fillStyle = fur; ctx.strokeStyle = o.glow;
  ctx.beginPath(); ctx.ellipse(s * 0.12, -s * 0.12, s * 0.34, s * 0.29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hocico chato y redondeado
  ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.12, s * 0.2, s * 0.22, s * 0.09); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = fur; ctx.beginPath(); ctx.roundRect(s * 0.27, -s * 0.12, s * 0.2, s * 0.22, s * 0.09); ctx.fill();
  ellipse(ctx, s * 0.12, -s * 0.12, s * 0.33, s * 0.28); ctx.fill();

  // orejitas
  ctx.fillStyle = furDark; ellipse(ctx, -s * 0.06, -s * 0.36, s * 0.06, s * 0.05); ctx.fill();
  ctx.fillStyle = belly; ellipse(ctx, -s * 0.06, -s * 0.36, s * 0.03, s * 0.025); ctx.fill();

  // ojo grande y brillante
  const ex = s * 0.2, ey = -s * 0.16;
  if (o.blink) { ctx.strokeStyle = ink; ctx.lineWidth = s * 0.02; ctx.beginPath(); ctx.arc(ex, ey, s * 0.04, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else {
    ctx.fillStyle = ink; ellipse(ctx, ex, ey, s * 0.045, s * 0.055); ctx.fill();
    ctx.fillStyle = '#fff'; ellipse(ctx, ex + s * 0.015, ey - s * 0.02, s * 0.016, s * 0.018); ctx.fill();
  }
  // naricitas y sonrisa
  ctx.fillStyle = ink; ellipse(ctx, s * 0.43, -s * 0.07, s * 0.018, s * 0.024); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.014; ctx.beginPath(); ctx.arc(s * 0.36, 0, s * 0.05, 0.25, Math.PI * 0.8); ctx.stroke();
  // cachete rosado
  ctx.fillStyle = '#ff8fa3aa'; ellipse(ctx, s * 0.14, s * 0.0, s * 0.045, s * 0.03); ctx.fill();
  ctx.restore();
}
