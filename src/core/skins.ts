// Todas las skins vienen desbloqueadas. Se dibujan centradas en (0,0) con radio r.
export type Style = 'solid' | 'pixel' | 'rainbow' | 'galaxy' | 'radar' | 'star' | 'hex' | 'ball' | 'eye' | 'coin';
export interface Skin { id: string; name: string; a: string; b: string; glow: string; style: Style }

export const BALL_SKINS: Skin[] = [
  { id: 'cian', name: 'Burbuja cian', a: '#00ffcc', b: '#0099ff', glow: '#00ffcc', style: 'solid' },
  { id: 'magenta', name: 'Magenta pop', a: '#ff6ee0', b: '#8a2bff', glow: '#ff2bd6', style: 'solid' },
  { id: 'sol', name: 'Sol líquido', a: '#fff176', b: '#ff7a00', glow: '#ffb800', style: 'solid' },
  { id: 'acido', name: 'Ácido', a: '#e4ff4a', b: '#12b76a', glow: '#c6ff00', style: 'solid' },
  { id: 'cristal', name: 'Cristal', a: '#ffffff', b: '#7fd8ff', glow: '#bdeaff', style: 'solid' },
  { id: 'magma', name: 'Magma', a: '#ff9a62', b: '#c1121f', glow: '#ff4d2d', style: 'solid' },
  { id: 'pixel', name: 'Píxel 8-bit', a: '#00ffcc', b: '#0b6bff', glow: '#00ffcc', style: 'pixel' },
  { id: 'prisma', name: 'Prisma', a: '#fff', b: '#fff', glow: '#ffffff', style: 'rainbow' },
  { id: 'galaxia', name: 'Galaxia', a: '#6a1bff', b: '#12053a', glow: '#8f5bff', style: 'galaxy' },
];

export const MALLET_SKINS: Skin[] = [
  { id: 'cian', name: 'Cian', a: '#19f4ff', b: '#0a5d73', glow: '#19f4ff', style: 'solid' },
  { id: 'magenta', name: 'Magenta', a: '#ff2bd6', b: '#6b0f5c', glow: '#ff2bd6', style: 'solid' },
  { id: 'ambar', name: 'Ámbar', a: '#ffb800', b: '#7a4a00', glow: '#ffb800', style: 'solid' },
  { id: 'lima', name: 'Lima', a: '#b6ff2e', b: '#2f6b00', glow: '#b6ff2e', style: 'solid' },
  { id: 'hielo', name: 'Hielo', a: '#e8f7ff', b: '#4a86a6', glow: '#bdeaff', style: 'solid' },
  { id: 'radar', name: 'Radar', a: '#38ff9c', b: '#06361f', glow: '#38ff9c', style: 'radar' },
  { id: 'estrella', name: 'Estrella', a: '#ffe14a', b: '#b3003c', glow: '#ff5d8f', style: 'star' },
  { id: 'hexa', name: 'Hexágono', a: '#9b7bff', b: '#241059', glow: '#9b7bff', style: 'hex' },
  { id: 'prisma', name: 'Prisma', a: '#fff', b: '#222', glow: '#ffffff', style: 'rainbow' },
  { id: 'pixel', name: 'Píxel', a: '#ff5d5d', b: '#4a0f0f', glow: '#ff5d5d', style: 'pixel' },
];

export const PUCK_SKINS: Skin[] = [
  { id: 'clasico', name: 'Clásico', a: '#f4f1ff', b: '#1a1740', glow: '#19f4ff', style: 'solid' },
  { id: 'plasma', name: 'Plasma', a: '#ff7bf0', b: '#5a14a8', glow: '#ff2bd6', style: 'solid' },
  { id: 'moneda', name: 'Moneda', a: '#ffd54a', b: '#a86b00', glow: '#ffb800', style: 'coin' },
  { id: 'balon', name: 'Balón', a: '#ffffff', b: '#111111', glow: '#ffffff', style: 'ball' },
  { id: 'ojo', name: 'Ojo', a: '#ffffff', b: '#19f4ff', glow: '#19f4ff', style: 'eye' },
  { id: 'prisma', name: 'Prisma', a: '#fff', b: '#222', glow: '#ffffff', style: 'rainbow' },
  { id: 'pixel', name: 'Píxel', a: '#b6ff2e', b: '#1d3d00', glow: '#b6ff2e', style: 'pixel' },
];

export const findSkin = (list: Skin[], id: string) => list.find((s) => s.id === id) ?? list[0];
const hue = (t: number, off = 0) => `hsl(${(t * 70 + off) % 360}, 100%, 60%)`;

function glowDisc(ctx: CanvasRenderingContext2D, r: number, color: string, k = 1.25) {
  const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * k + 6);
  g.addColorStop(0, color + 'aa'); g.addColorStop(1, color + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * k + 6, 0, Math.PI * 2); ctx.fill();
}

export function drawBall(ctx: CanvasRenderingContext2D, sk: Skin, r: number, t: number) {
  const pr = r + Math.sin(t) * 1.2;
  ctx.save();
  glowDisc(ctx, pr, sk.style === 'rainbow' ? '#ffffff' : sk.glow, 1.15);
  if (sk.style === 'pixel') {
    ctx.fillStyle = sk.a; ctx.fillRect(-pr, -pr, pr * 2, pr * 2);
    ctx.fillStyle = sk.b; ctx.fillRect(-pr * 0.6, -pr * 0.6, pr * 1.2, pr * 1.2);
    ctx.fillStyle = '#fff'; ctx.fillRect(-pr * 0.7, -pr * 0.8, 4, 4); ctx.fillRect(-pr * 0.4, -pr * 0.8, 2, 2);
  } else if (sk.style === 'galaxy') {
    const g = ctx.createRadialGradient(-pr * 0.3, -pr * 0.3, 1, 0, 0, pr);
    g.addColorStop(0, sk.a); g.addColorStop(1, sk.b);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      const a = t * 0.6 + i * 1.05, d = pr * (0.25 + (i % 3) * 0.22);
      ctx.fillRect(Math.cos(a) * d - 1, Math.sin(a) * d - 1, 2, 2);
    }
    ctx.strokeStyle = sk.glow; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.stroke();
  } else {
    const c1 = sk.style === 'rainbow' ? hue(t) : sk.a;
    const c2 = sk.style === 'rainbow' ? hue(t, 90) : sk.b;
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, pr * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-pr * 0.4, -pr * 0.5, 4, 4); ctx.fillRect(-pr * 0.2, -pr * 0.6, 2, 2);
  }
  ctx.restore();
}

export function drawMallet(ctx: CanvasRenderingContext2D, sk: Skin, r: number, t: number) {
  ctx.save();
  const a = sk.style === 'rainbow' ? hue(t) : sk.a;
  const b = sk.style === 'rainbow' ? '#15122e' : sk.b;
  glowDisc(ctx, r, sk.style === 'rainbow' ? '#ffffff' : sk.glow, 1.2);
  // sombra de contacto
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(2, 3, r, 0, Math.PI * 2); ctx.fill();
  if (sk.style === 'star') {
    ctx.fillStyle = a; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * 0.78 : r; const an = (i / 16) * Math.PI * 2 + t * 0.4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill();
  } else if (sk.style === 'hex') {
    ctx.fillStyle = a; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + Math.PI / 6; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    ctx.closePath(); ctx.fill();
  } else if (sk.style === 'pixel') {
    ctx.fillStyle = a; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(-r + 3, -r + 3, 6, 6);
  } else {
    ctx.fillStyle = a; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = b; ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.fill();
  if (sk.style === 'radar') {
    ctx.save(); ctx.rotate(t * 2.2);
    const g = ctx.createLinearGradient(0, 0, r * 0.68, 0);
    g.addColorStop(0, sk.a + 'ff'); g.addColorStop(1, sk.a + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.68, -0.5, 0.05); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = sk.a + '88'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.stroke();
  }
  // perilla central
  ctx.fillStyle = a; ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.14, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawPuck(ctx: CanvasRenderingContext2D, sk: Skin, r: number, t: number) {
  ctx.save();
  glowDisc(ctx, r, sk.style === 'rainbow' ? '#ffffff' : sk.glow, 1.35);
  const a = sk.style === 'rainbow' ? hue(t) : sk.a;
  const b = sk.style === 'rainbow' ? hue(t, 120) : sk.b;
  if (sk.style === 'pixel') {
    ctx.fillStyle = a; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = b; ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
    ctx.fillStyle = '#fff'; ctx.fillRect(-r + 2, -r + 2, 4, 4);
  } else {
    ctx.fillStyle = a; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = sk.style === 'rainbow' ? '#fff' : sk.glow; ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
    if (sk.style === 'ball') {
      ctx.fillStyle = b;
      for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2 - Math.PI / 2 + t * 0.3; ctx.beginPath(); ctx.arc(Math.cos(an) * r * 0.55, Math.sin(an) * r * 0.55, r * 0.17, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (sk.style === 'eye') {
      ctx.fillStyle = b; ctx.beginPath(); ctx.arc(Math.cos(t * 1.3) * r * 0.1, Math.sin(t * 1.7) * r * 0.1, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#04122a'; ctx.beginPath(); ctx.arc(Math.cos(t * 1.3) * r * 0.1, Math.sin(t * 1.7) * r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (sk.style === 'coin') {
      ctx.fillStyle = b; ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('B', 0, 1);
    } else {
      ctx.fillStyle = b; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
