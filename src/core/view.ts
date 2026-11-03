// Ajuste del canvas al contenedor (con DPR) y rotación automática a vertical (celular en portrait).
// La física siempre es "apaisada" (lw x lh). En portrait se gira -90°: x lógica = abajo -> arriba.
export interface View { portrait: boolean; s: number; cssW: number; cssH: number; dpr: number; lw: number; lh: number }

export function fitCanvas(canvas: HTMLCanvasElement, box: HTMLElement, lw: number, lh: number): View {
  const bw = Math.max(50, box.clientWidth);
  const bh = Math.max(50, box.clientHeight);
  const portrait = bh > bw * 1.05;
  const fw = portrait ? lh : lw;
  const fh = portrait ? lw : lh;
  const k = Math.min(bw / fw, bh / fh);
  const cssW = Math.floor(fw * k), cssH = Math.floor(fh * k);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  return { portrait, s: k, cssW, cssH, dpr, lw, lh };
}

export function applyView(ctx: CanvasRenderingContext2D, v: View) {
  const k = v.s * v.dpr;
  if (v.portrait) ctx.setTransform(0, -k, k, 0, 0, k * v.lw);
  else ctx.setTransform(k, 0, 0, k, 0, 0);
}

/** px CSS relativos al canvas -> coordenadas lógicas */
export function toLogical(v: View, sx: number, sy: number) {
  if (v.portrait) return { x: v.lw - sy / v.s, y: sx / v.s };
  return { x: sx / v.s, y: sy / v.s };
}
