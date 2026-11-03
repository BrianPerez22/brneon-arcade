// Ruleta Colombiana: Ruleta rusa arcade con revolver de agua en pixel art para múltiples jugadores.
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../core/audio.ts';
import type { Settings } from '../../core/storage.ts';
import SkinPicker from '../../ui/SkinPicker.tsx';
import './roulette.css';

interface Props {
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onExit: () => void;
}

const PLAYER_COLORS = ['#19f4ff', '#ff2bd6', '#ffb800', '#b6ff2e', '#9b7bff', '#ff5d8f', '#38ff9c', '#ff7a36'];

export default function RouletteGame({ settings, onChange, onExit }: Props) {
  // Configuración de jugadores
  const [players, setPlayers] = useState<string[]>(['Jugador 1', 'Jugador 2']);
  const [turnIndex, setTurnIndex] = useState(0);
  const [chamberIndex, setChamberIndex] = useState(0);
  const [bulletChamber, setBulletChamber] = useState(0);

  // Estados del juego
  const [phase, setPhase] = useState<'setup' | 'loading' | 'turn' | 'firing' | 'fired_safe' | 'gameover'>('setup');
  const [splashResult, setSplashResult] = useState<{ loser: string; chamber: number } | null>(null);
  const [showSkins, setShowSkins] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef({
    t: 0,
    spinAng: 0,
    spinSpeed: 0.35,
    zoom: 0,
    hammerPull: 0,
    waterBlast: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[],
  });

  // Iniciar una nueva ronda con bala de agua cargada al azar
  const startRound = () => {
    sfx.unlock(); sfx.click();
    const randomBullet = Math.floor(Math.random() * 6);
    setBulletChamber(randomBullet);
    setChamberIndex(0);
    setTurnIndex(0);
    setSplashResult(null);

    animRef.current.spinAng = 0;
    animRef.current.spinSpeed = 0.45;
    animRef.current.zoom = 0;
    animRef.current.waterBlast = 0;
    animRef.current.particles = [];

    setPhase('loading');

    // Animación de carga y giro del tambor (2 segundos)
    setTimeout(() => {
      sfx.click();
      setPhase('turn');
    }, 2200);
  };

  // Disparo del jugador actual
  const pullTrigger = () => {
    if (phase !== 'turn') return;
    sfx.unlock(); sfx.click();
    setPhase('firing');

    // 1. El revólver apunta hacia la pantalla
    animRef.current.zoom = 1;

    setTimeout(() => {
      // Momento del impacto
      if (chamberIndex === bulletChamber) {
        // ¡AGUA! ¡DISPARO AL JUGADOR!
        try { (sfx as any).hit?.(); } catch { /* ok */ }
        animRef.current.waterBlast = 1;
        // Generar partículas de chorro de agua hacia la pantalla
        for (let i = 0; i < 40; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 4 + Math.random() * 8;
          animRef.current.particles.push({
            x: 240,
            y: 140,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 3 + Math.random() * 5,
            color: Math.random() > 0.4 ? '#19f4ff' : '#ffffff',
            life: 60,
          });
        }

        setTimeout(() => {
          try { (sfx as any).lose?.(); } catch { /* ok */ }
          setSplashResult({ loser: players[turnIndex], chamber: chamberIndex + 1 });
          setPhase('gameover');
        }, 600);
      } else {
        // ¡CLIC SECO! El jugador se salva
        sfx.click();
        setPhase('fired_safe');

        // Partículas de clic vacío
        for (let i = 0; i < 8; i++) {
          animRef.current.particles.push({
            x: 240 + (Math.random() - 0.5) * 20,
            y: 130 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: -1 - Math.random() * 2,
            r: 2,
            color: '#ffea00',
            life: 25,
          });
        }

        // Vuelve a su estado normal y pasa al siguiente jugador
        setTimeout(() => {
          animRef.current.zoom = 0;
          setChamberIndex((c) => (c + 1) % 6);
          setTurnIndex((t) => (t + 1) % players.length);
          setPhase('turn');
        }, 1200);
      }
    }, 600);
  };

  // Dibujo en Canvas Pixel Art
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const a = animRef.current;
      a.t += 0.03;

      ctx.clearRect(0, 0, 480, 280);
      ctx.imageSmoothingEnabled = false;

      // Fondo retro arcade
      ctx.fillStyle = '#080614';
      ctx.fillRect(0, 0, 480, 280);

      // Rejilla pixel suave de fondo
      ctx.fillStyle = '#100c24';
      for (let x = 0; x < 480; x += 16) ctx.fillRect(x, 0, 1, 280);
      for (let y = 0; y < 280; y += 16) ctx.fillRect(0, y, 480, 1);

      // ------------------------------------------------ FASE: CARGA Y GIRO DEL TAMBOR
      if (phase === 'loading') {
        a.spinAng += a.spinSpeed;
        a.spinSpeed = Math.max(0.04, a.spinSpeed * 0.985);

        ctx.save();
        ctx.translate(240, 140);

        // Tambor de 6 recámaras en vista frontal pixel art
        ctx.fillStyle = '#1c1538';
        ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#483c7a'; ctx.lineWidth = 4; ctx.stroke();

        // 6 recámaras
        for (let i = 0; i < 6; i++) {
          const ang = a.spinAng + (i * Math.PI * 2) / 6;
          const cx = Math.cos(ang) * 42, cy = Math.sin(ang) * 42;
          ctx.fillStyle = '#090714';
          ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2b2352'; ctx.lineWidth = 2; ctx.stroke();

          // Si es la recámara que contiene la bala de agua
          if (i === bulletChamber) {
            ctx.fillStyle = '#19f4ff';
            ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 3, cy - 3, 3, 3);
          }
        }

        // Eje central
        ctx.fillStyle = '#3a2d6b';
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Texto informativo
        ctx.fillStyle = '#ffb800';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('¡CARGANDO BALA DE AGUA Y GIRANDO!', 240, 240);
        return;
      }

      // ------------------------------------------------ FASE: DISPARO / APUNTADO HACIA LA PANTALLA
      if (a.zoom > 0) {
        // El revólver apunta directamente hacia el jugador (frente)
        const scale = 1 + a.zoom * 1.8;
        ctx.save();
        ctx.translate(240, 140);
        ctx.scale(scale, scale);

        // Cañón frontal pixel art
        ctx.fillStyle = '#1b1435';
        ctx.fillRect(-22, -22, 44, 44);
        ctx.fillStyle = '#2d2254';
        ctx.fillRect(-18, -18, 36, 36);

        // Boca del cañón (agujero negro profundo)
        ctx.fillStyle = '#07050f';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#19f4ff88'; ctx.lineWidth = 2; ctx.stroke();

        // Punto de mira superior
        ctx.fillStyle = '#ff2bd6';
        ctx.fillRect(-3, -26, 6, 5);

        ctx.restore();

        // Si es safe, mostrar texto
        if (phase === 'fired_safe') {
          ctx.fillStyle = '#b6ff2e';
          ctx.font = '12px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('¡¡CLIC SECO!! ¡SALVADO! 😌', 240, 50);
        }
      } else {
        // ------------------------------------------------ VISTA DE PERFIL DEL REVÓLVER
        const rx = 180, ry = 140 + Math.sin(a.t * 3) * 4;
        ctx.save();
        ctx.translate(rx, ry);

        // 1. Empuñadura marrón/madera
        ctx.fillStyle = '#6b3d1b';
        ctx.fillRect(-50, 20, 24, 44);
        ctx.fillStyle = '#4a2810';
        ctx.fillRect(-46, 24, 16, 36);
        ctx.fillStyle = '#8f5629';
        ctx.fillRect(-50, 20, 4, 40);

        // 2. Armazón principal metálico
        ctx.fillStyle = '#1b1638';
        ctx.fillRect(-30, -10, 48, 38);
        ctx.fillStyle = '#2f275e';
        ctx.fillRect(-26, -6, 40, 30);

        // 3. Tambor con depósito de agua translúcido
        ctx.fillStyle = '#140f2e';
        ctx.fillRect(-12, -8, 28, 28);
        ctx.fillStyle = '#19f4ff44'; // cápsula de agua brillante
        ctx.fillRect(-10, -6, 24, 24);
        ctx.fillStyle = '#19f4ff';
        ctx.fillRect(-8, 2, 20, 4); // nivel de agua

        // 4. Cañón largo
        ctx.fillStyle = '#1b1638';
        ctx.fillRect(18, -8, 64, 16);
        ctx.fillStyle = '#3a3170';
        ctx.fillRect(20, -6, 60, 12);
        // Punto de mira frontal
        ctx.fillStyle = '#ff2bd6';
        ctx.fillRect(78, -12, 4, 4);

        // 5. Martillo
        ctx.fillStyle = '#3a3170';
        ctx.fillRect(-36, -14, 8, 12);

        // 6. Guardamonte y gatillo
        ctx.fillStyle = '#1b1638';
        ctx.fillRect(-14, 28, 18, 4);
        ctx.fillRect(4, 20, 4, 12);
        ctx.fillStyle = '#ffb800'; // gatillo
        ctx.fillRect(-6, 20, 4, 8);

        ctx.restore();
      }

      // Partículas de agua / clic
      a.particles = a.particles.filter((p) => {
        p.life--;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravedad
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.r, p.r);
        return p.life > 0;
      });
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [phase, bulletChamber, chamberIndex]);

  // Gestión de nombres de jugadores
  const addPlayer = () => {
    if (players.length >= 8) return;
    sfx.click();
    setPlayers((p) => [...p, `Jugador ${p.length + 1}`]);
  };
  const removePlayer = (idx: number) => {
    if (players.length <= 2) return;
    sfx.click();
    setPlayers((p) => p.filter((_, i) => i !== idx));
  };
  const updateName = (idx: number, val: string) => {
    setPlayers((p) => p.map((n, i) => (i === idx ? val : n)));
  };

  const currentPlayer = players[turnIndex] || 'Jugador 1';
  const currentColor = PLAYER_COLORS[turnIndex % PLAYER_COLORS.length];

  return (
    <div className="game roulette">
      <header className="gbar">
        <button className="ibtn" onClick={onExit} aria-label="Volver al menú">‹</button>
        <div className="stats">
          <div className="stat"><span>Modo</span><b>Ruleta 💦</b></div>
          <div className="stat"><span>Tiro</span><b>{chamberIndex + 1} / 6</b></div>
        </div>
        <button className="ibtn" onClick={() => { sfx.click(); setShowSkins(true); }} aria-label="Skins" title="Skins">🎨</button>
        {phase !== 'setup' && (
          <button className="ibtn" onClick={() => { sfx.click(); setPhase('setup'); }} aria-label="Ajustes">⚙</button>
        )}
      </header>

      {/* Pantalla Roja de impacto de agua cuando se dispara la bala */}
      {phase === 'gameover' && splashResult && (
        <div className="red-splash-screen">
          <div className="red-splash-card">
            <div className="splash-water-drops">💦 🔫 💀</div>
            <h1 className="red-title">¡¡FINALIZADO!!</h1>
            <p className="ov-text" style={{ color: '#fff', fontSize: '13px' }}>
              ¡¡EMPAPADO!! <b>{splashResult.loser}</b> recibió el chorro de agua en el <b>tiro #{splashResult.chamber}</b>.
            </p>
            <button className="btn cyan cy-btn-main" onClick={startRound}>
              ↻ Nueva Ronda 🔫
            </button>
            <button className="btn ghost" onClick={() => setPhase('setup')}>
              ⚙ Cambiar Jugadores
            </button>
            <button className="btn ghost" onClick={onExit}>
              ✕ Volver al Menú
            </button>
          </div>
        </div>
      )}

      {/* Pantalla de configuración previa */}
      {phase === 'setup' ? (
        <main className="page scroll">
          <section className="panel">
            <h2 className="ov-title cyan" style={{ textAlign: 'center' }}>Ruleta Colombiana 🔫💦</h2>
            <p>La clásica ruleta de la suerte... ¡con un revólver de agua pixel art! Carga 1 tiro de agua aleatorio en el tambor de 6 tiros y pásalo entre amigos.</p>
          </section>

          <section className="panel">
            <h3>Jugadores ({players.length})</h3>
            <div className="player-list">
              {players.map((name, i) => (
                <div key={i} className="player-item">
                  <div className="player-color-dot" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                  <input
                    value={name}
                    maxLength={14}
                    onChange={(e) => updateName(i, e.target.value)}
                    aria-label={`Nombre jugador ${i + 1}`}
                  />
                  {players.length > 2 && (
                    <button className="ibtn" style={{ width: '32px', height: '32px' }} onClick={() => removePlayer(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: '6px' }}>
              <button className="btn ghost" disabled={players.length >= 8} onClick={addPlayer}>+ Jugador</button>
              <button className="btn cyan" onClick={startRound}>¡Cargar y Jugar! 🔫</button>
            </div>
          </section>
        </main>
      ) : (
        <div className="roulette-stage">
          {/* Card del turno actual */}
          <div className="turn-card">
            <div className="turn-player">
              <span>TURNO DE DISPARAR</span>
              <b style={{ color: currentColor }}>{currentPlayer}</b>
            </div>

            {/* Visualizador de las 6 recámaras */}
            <div className="cylinder-hud">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isPast = idx < chamberIndex;
                const isCurrent = idx === chamberIndex;
                return (
                  <div key={idx} className={`chamber-dot ${isPast ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                    {isPast ? '✓' : isCurrent ? '▼' : '?'}
                  </div>
                );
              })}
            </div>
          </div>

          <canvas ref={canvasRef} width={480} height={280} className="roulette-cv" />

          {/* Botón de acción para apretar el gatillo */}
          <button
            className={`btn trigger-btn ${phase === 'firing' ? 'danger' : 'cyan'}`}
            disabled={phase !== 'turn'}
            onClick={pullTrigger}
          >
            {phase === 'firing' ? '¡¡DISPARANDO...!!' : '💦 ¡Apretar Gatillo! 🔫'}
          </button>
        </div>
      )}

      {showSkins && (
        <SkinPicker
          kinds={['capy', 'ball', 'mallet']}
          settings={settings}
          onChange={onChange}
          onClose={() => setShowSkins(false)}
        />
      )}
    </div>
  );
}
