import { useState } from 'react';
import { clearScores, fmtDate, topScores } from '../core/scores.ts';
import type { ScoreEntry } from '../core/scores.ts';
import { sfx } from '../core/audio.ts';

interface Props { game: string; title: string; list: ScoreEntry[]; onChange: (l: ScoreEntry[]) => void; onClose: () => void; extraLabel?: string }

export default function Scoreboard({ game, title, list, onChange, onClose, extraLabel = '' }: Props) {
  const [tab, setTab] = useState<'top' | 'recent'>('top');
  const rows = tab === 'top' ? topScores(list) : list.slice(0, 20);
  return (
    <div className="ov sb">
      <h2 className="ov-title amber">{title}</h2>
      <div className="seg">
        <button className={tab === 'top' ? 'on' : ''} onClick={() => { sfx.click(); setTab('top'); }}>Mejores 10</button>
        <button className={tab === 'recent' ? 'on' : ''} onClick={() => { sfx.click(); setTab('recent'); }}>Recientes</button>
      </div>
      {rows.length === 0 ? <p className="ov-text">Todavía no hay partidas guardadas.</p> : (
        <ol className="sblist">
          {rows.map((r, i) => (
            <li key={r.date + '-' + i}>
              <span className="sbn">{tab === 'top' ? i + 1 : '·'}</span>
              <b>{r.score}</b>
              <span className="sbx">{r.extra ? `${extraLabel}${r.extra}` : ''}</span>
              <span className="sbd">{fmtDate(r.date)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="small">Se guarda en este dispositivo hasta que borres los datos del sitio.</p>
      <div className="row">
        {list.length > 0 && <button className="btn ghost" onClick={() => { if (confirm('¿Borrar todo el historial?')) { clearScores(game); onChange([]); } }}>Borrar</button>}
        <button className="btn cyan" onClick={() => { sfx.click(); onClose(); }}>Cerrar</button>
      </div>
    </div>
  );
}
