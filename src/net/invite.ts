// Utilidades para invitar gente a la sala: copiar el código y armar el enlace ?sala=XXXXX
export async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* http en red local: no hay clipboard */ }
  try {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}

export const inviteUrl = (code: string, local = false) =>
  `${location.origin}${location.pathname}?sala=${code}${local ? '&modo=local' : ''}`;

/** Abre el menú de compartir del móvil; si no existe, copia el enlace. Devuelve 'shared' | 'copied' | 'fail'. */
export async function shareInvite(code: string, local = false): Promise<'shared' | 'copied' | 'fail'> {
  const data = { title: 'BrNeon Arcade', text: `Juguemos en BrNeon Arcade. Código de sala: ${code}`, url: inviteUrl(code, local) };
  if (navigator.share) { try { await navigator.share(data); return 'shared'; } catch { return 'fail'; } }
  return (await copyText(data.url)) ? 'copied' : 'fail';
}
