import { useEffect, useRef, useState } from 'react';
import { BALL_SKINS, MALLET_SKINS, PUCK_SKINS, drawBall, drawMallet, drawPuck } from '../core/skins.ts';
import type { Skin } from '../core/skins.ts';
import { CAPY_COLORS, drawCapybara } from '../core/capybara.ts';
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

type Tab = 'ball' | 'mallet' | 'puck' | 'capy';
interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void }

function Preview({ skin, kind }: { skin: Skin; kind: Tab }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000, W = c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.translate(W / 2, W / 2);
      const r = W * 0.27;
      if (kind === 'ball') drawBall(ctx, skin, r, t * 4);
      else if (kind === 'mallet') drawMallet(ctx, skin, r * 1.15, t);
      else drawPuck(ctx, skin, r * 0.9, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin, kind]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

function CapyPreview({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000, W = c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.translate(W / 2 - 6, W / 2 + 4);
      drawCapybara(ctx, W * 0.78, { glow: color, t, blink: (t % 3.2) > 3.05 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

export default function Skins({ settings, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('ball');
  const [who, setWho] = useState<1 | 2>(1);
  const list = tab === 'ball' ? BALL_SKINS : tab === 'mallet' ? MALLET_SKINS : PUCK_SKINS;
  const current = tab === 'ball' ? settings.ball : tab === 'puck' ? settings.puck : who === 1 ? settings.mallet1 : settings.mallet2;
  const pick = (id: string) => {
    sfx.unlock(); sfx.click();
    if (tab === 'ball') onChange({ ball: id });
    else if (tab === 'puck') onChange({ puck: id });
    else onChange(who === 1 ? { mallet1: id } : { mallet2: id });
  };
  return (
    <main className="page scroll">
      <header className="pbar">
        <button className="ibtn" onClick={onBack} aria-label="Volver">‹</button>
        <h2>Skins</h2>
        <span className="unlocked">todas desbloqueadas</span>
      </header>
      <div className="seg big">
        <button className={tab === 'ball' ? 'on' : ''} onClick={() => setTab('ball')}>Bolita (Pool)</button>
        <button className={tab === 'mallet' ? 'on' : ''} onClick={() => setTab('mallet')}>Paleta</button>
        <button className={tab === 'puck' ? 'on' : ''} onClick={() => setTab('puck')}>Disco</button>
        <button className={tab === 'capy' ? 'on' : ''} onClick={() => setTab('capy')}>Capibara</button>
      </div>
      {tab === 'mallet' && (
        <div className="seg">
          <button className={who === 1 ? 'on' : ''} onClick={() => setWho(1)}>Jugador 1 (izq / abajo)</button>
          <button className={who === 2 ? 'on' : ''} onClick={() => setWho(2)}>Jugador 2 (der / arriba)</button>
        </div>
      )}
      {tab === 'capy' && (
        <>
          <p className="small">Color neón del juego del capibara (por defecto, azul neón).</p>
          <div className="skin-grid">
            {CAPY_COLORS.map((c) => (
              <button key={c.id} className={'skin ' + (c.id === settings.capyColor ? 'sel' : '')} aria-pressed={c.id === settings.capyColor}
                onClick={() => { sfx.unlock(); sfx.click(); onChange({ capyColor: c.id }); }}>
                <CapyPreview color={c.color} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {tab !== 'capy' && <div className="skin-grid">
        {list.map((s) => (
          <button key={s.id} className={'skin ' + (s.id === current ? 'sel' : '')} onClick={() => pick(s.id)} aria-pressed={s.id === current}>
            <Preview skin={s} kind={tab} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>}
    </main>
  );
}
