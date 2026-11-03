// Evita el zoom por pellizco / doble toque en Safari iOS (que ignora user-scalable=no)
// y bloquea el scroll/rubber-band mientras se juega con dos dedos.
export function installNoZoom() {
  const stop = (e: Event) => e.preventDefault();
  // Safari iOS: eventos propietarios del gesto de pellizco
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) =>
    document.addEventListener(n, stop, { passive: false }),
  );
  // Dos o más dedos => nunca dejar que el navegador interprete nada
  document.addEventListener(
    'touchmove',
    (e) => {
      const te = e as TouchEvent & { scale?: number };
      if (te.touches.length > 1 || (te.scale !== undefined && te.scale !== 1)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'touchstart',
    (e) => {
      if ((e as TouchEvent).touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  // Doble toque rápido = zoom en iOS (no tocar botones/inputs para no romper los clicks)
  let last = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest?.('button, a, input, select, label');
      if (now - last < 320 && !interactive) e.preventDefault();
      last = now;
    },
    { passive: false },
  );
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('contextmenu', stop);
  document.addEventListener('selectstart', stop);
  // PC: Ctrl + rueda / pellizco del touchpad
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
}
