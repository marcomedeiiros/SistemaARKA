import React, { useEffect, useRef } from 'react';

/**
 * Fundo animado de "fluxo de dados": faixas de partículas luminosas correndo em
 * ondas suaves (cyan → azul → roxo), com orbes de bokeh desfocados ao fundo.
 * Evoca o fluxo de informação do ERP (estoque, vendas, serviços). Roda sozinho,
 * sem interação de mouse, com mistura aditiva para dar brilho de néon.
 */
interface Particle {
  t: number;
  speed: number;
  size: number;
  off: number;
}

interface Lane {
  baseY: number;
  amp: number;
  freq: number;
  phase: number;
  dir: number;
  hue: number;
  particles: Particle[];
}

interface Bokeh {
  x: number;
  y: number;
  r: number;
  hue: number;
  vx: number;
  vy: number;
  alpha: number;
}

// Cyan e azul dominantes, roxo como acento a cara do ERP.
const STREAM_HUES = [186, 200, 214, 250, 276];

export const DataFlowBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let time = 0;
    let lanes: Lane[] = [];
    let bokeh: Bokeh[] = [];

    // Sprite de brilho por matiz, desenhado uma vez e reutilizado (rápido).
    const sprites = new Map<number, HTMLCanvasElement>();
    const sprite = (hue: number): HTMLCanvasElement => {
      const existing = sprites.get(hue);
      if (existing) return existing;
      const s = document.createElement('canvas');
      s.width = 64;
      s.height = 64;
      const c = s.getContext('2d')!;
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, `hsla(${hue}, 100%, 72%, 1)`);
      g.addColorStop(0.25, `hsla(${hue}, 100%, 62%, 0.55)`);
      g.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      sprites.set(hue, s);
      return s;
    };

    const build = () => {
      const laneCount = Math.max(4, Math.round(height / 110));
      lanes = Array.from({ length: laneCount }, (_, i) => {
        const hue = STREAM_HUES[i % STREAM_HUES.length]!;
        const baseY = ((i + 0.5) / laneCount) * height + (Math.random() * 40 - 20);
        const count = Math.max(10, Math.round(width / 26));
        const particles: Particle[] = Array.from({ length: count }, () => ({
          t: Math.random(),
          speed: 0.0006 + Math.random() * 0.0012,
          size: 3 + Math.random() * 7,
          off: Math.random() * Math.PI * 2
        }));
        return {
          baseY,
          amp: 26 + Math.random() * 46,
          freq: 1 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          dir: Math.random() > 0.35 ? 1 : -1,
          hue,
          particles
        };
      });

      bokeh = Array.from({ length: 12 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 60 + Math.random() * 150,
        hue: STREAM_HUES[Math.floor(Math.random() * STREAM_HUES.length)]!,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        alpha: 0.05 + Math.random() * 0.08
      }));
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      time += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // Orbes de bokeh (profundidade).
      for (const b of bokeh) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r) b.x = width + b.r;
        else if (b.x > width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = height + b.r;
        else if (b.y > height + b.r) b.y = -b.r;
        ctx.globalAlpha = b.alpha;
        ctx.drawImage(sprite(b.hue), b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }

      // Faixas de dados fluindo.
      for (const lane of lanes) {
        const sp = sprite(lane.hue);
        for (const p of lane.particles) {
          p.t += p.speed;
          if (p.t > 1) p.t -= 1;
          const t = lane.dir > 0 ? p.t : 1 - p.t;
          const x = t * width;
          const y =
            lane.baseY +
            Math.sin(t * lane.freq * Math.PI * 2 + lane.phase + time * 0.006 + p.off * 0.15) *
              lane.amp;
          // Some suave nas bordas.
          const edge = Math.min(1, Math.min(t, 1 - t) * 6);
          ctx.globalAlpha = 0.5 * edge;
          ctx.drawImage(sp, x - p.size, y - p.size, p.size * 2, p.size * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="login-fx-canvas" aria-hidden="true" />;
};
