import type { Settings } from '../core/storage.ts';
import { sfx } from '../core/audio.ts';

interface Props { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void; onStart: (players: 1 | 2) => void }

export default function HockeySetup({ settings, onChange, onBack, onStart }: Props) {
  const lv: { id: Settings['aiLevel']; label: string }[] = [{ id: 'easy', label: 'Fácil' }, { id: 'hard', label: 'Difícil' }, { id: 'impossible', label: 'Imposible' }];
  return (
    <main className="page scroll">
      <header className="pbar">
        <button className="ibtn" onClick={onBack} aria-label="Volver">‹</button>
        <h2>Air Hockey</h2>
      </header>
      <section className="panel">
        <h3>¿Cuántos juegan?</h3>
        <div className="row">
          <button className="btn cyan" onClick={() => { sfx.unlock(); sfx.click(); onStart(1); }}>1 jugador<small>contra la CPU</small></button>
          <button className="btn pink" onClick={() => { sfx.unlock(); sfx.click(); onStart(2); }}>2 jugadores<small>misma pantalla</small></button>
        </div>
        <p className="small">¿Online con un amigo? Usa <b>Jugar Online</b> en el menú principal.</p>
      </section>
      <section className="panel">
        <h3>Dificultad de la CPU</h3>
        <div className="seg">
          {lv.map((l) => <button key={l.id} className={settings.aiLevel === l.id ? 'on' : ''} onClick={() => onChange({ aiLevel: l.id })}>{l.label}</button>)}
        </div>
        <h3>Goles para ganar</h3>
        <div className="seg">
          {[3, 5, 7, 10].map((n) => <button key={n} className={settings.goalsToWin === n ? 'on' : ''} onClick={() => onChange({ goalsToWin: n })}>{n}</button>)}
        </div>
      </section>
      <section className="panel help">
        <h3>Controles</h3>
        <p><b>Celular:</b> arrastra el dedo en tu mitad. En 2 jugadores cada uno usa su lado, a la vez, sin que la página haga zoom. Gira el teléfono como prefieras.</p>
        <p><b>PC, 1 jugador:</b> mouse, o WASD / flechas.</p>
        <p><b>PC, 2 jugadores:</b> Jugador 1 con W A S D, Jugador 2 con las flechas. Pausa con Esc.</p>
      </section>
    </main>
  );
}
