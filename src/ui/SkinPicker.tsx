// Selector de skins unificado que vive dentro de cada juego (Pool, Hockey, Capy, etc.)
import { useEffect, useRef, useState } from 'react';
import { BALL_SKINS, MALLET_SKINS, PUCK_SKINS, drawBall, drawMallet, drawPuck } from '../core/skins.ts';
import type { Skin } from '../core/skins.ts';
import { CAPY_COLORS, drawCapybara } from '../core/capybara.ts';
import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

export type SkinKind = 'ball' | 'mallet' | 'puck' | 'capy';
interface Props {
  kinds: SkinKind[];
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onClose: () => void;
  players?: [string, string];
}

const LABEL: Record<SkinKind, string> = { ball: 'Bolita', mallet: 'Paleta', puck: 'Disco', capy: 'Capibara' };

function Preview({ skin, kind }: { skin: Skin; kind: SkinKind }) {
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
      ctx.translate(W / 2 - 10, W / 2 + 4);
      drawCapybara(ctx, W * 0.72, { glow: color, t, blink: (t % 3.2) > 3.05, step: t * 8 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} width={160} height={160} className="prev" />;
}

export default function SkinPicker({ kinds, settings, onChange, onClose, players = ['Jugador 1', 'Jugador 2'] }: Props) {
  const [tab, setTab] = useState<SkinKind>(kinds[0] ?? 'ball');
  const [who, setWho] = useState<1 | 2>(1);

  const pick = (id: string) => {
    sfx.unlock(); sfx.click();
    if (tab === 'capy') onChange({ capyColor: id });
    else if (tab === 'ball') onChange({ ball: id });
    else if (tab === 'puck') onChange({ puck: id });
    else onChange(who === 1 ? { mallet1: id } : { mallet2: id });
  };

  const current = tab === 'capy'
    ? settings.capyColor
    : tab === 'ball'
    ? settings.ball
    : tab === 'puck'
    ? settings.puck
    : who === 1
    ? settings.mallet1
    : settings.mallet2;

  return (
    <div className="ov sheet top" style={{ zIndex: 99 }}>
      <div className="sheet-in">
        <header className="sheet-bar">
          <h2 className="ov-title cyan">Skins & Estilos</h2>
          <button className="btn cyan" onClick={() => { sfx.click(); onClose(); }}>Listo ✓</button>
        </header>

        {kinds.length > 1 && (
          <div className="seg big">
            {kinds.map((k) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{LABEL[k]}</button>)}
          </div>
        )}

        {tab === 'mallet' && (
          <div className="seg">
            <button className={who === 1 ? 'on' : ''} onClick={() => setWho(1)}>{players[0]}</button>
            <button className={who === 2 ? 'on' : ''} onClick={() => setWho(2)}>{players[1]}</button>
          </div>
        )}

        {tab === 'capy' ? (
          <div className="skin-grid">
            {CAPY_COLORS.map((c) => (
              <button key={c.id} className={'skin ' + (c.id === current ? 'sel' : '')} onClick={() => pick(c.id)} aria-pressed={c.id === current}>
                <CapyPreview color={c.color} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="skin-grid">
            {(tab === 'ball' ? BALL_SKINS : tab === 'mallet' ? MALLET_SKINS : PUCK_SKINS).map((s) => (
              <button key={s.id} className={'skin ' + (s.id === current ? 'sel' : '')} onClick={() => pick(s.id)} aria-pressed={s.id === current}>
                <Preview skin={s} kind={tab} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
