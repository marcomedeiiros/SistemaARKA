import React, { useEffect, useRef } from 'react';

/**
 * Fundo animado com tema de estoque (armazém).
 *
 * Caixas/engradados caem do alto e se empilham em colunas, como um estoque
 * sendo abastecido; de tempos em tempos a caixa do topo "sai" (expedição),
 * abrindo espaço para novas entradas. É o fluxo de entrada/saída do estoque,
 * rodando sozinho, na paleta do ERP. Sem interação de mouse.
 */
interface Box {
  hue: number;
  y: number;
  alpha: number;
  index: number;
  leaving: boolean;
}

interface Column {
  x: number;
  boxes: Box[];
  timer: number;
}

// Paleta alinhada ao ERP de estoque: azul, índigo, ciano, teal e verde.
const PALETTE = [222, 246, 200, 172, 152];
const BOX_W = 30;
const BOX_H = 20;
const GAP = 5;
const COL_GAP = 26;

export const StockBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let baseY = 0;
    let maxPerCol = 0;
    let columns: Column[] = [];

    const pickHue = () => PALETTE[Math.floor(Math.random() * PALETTE.length)]! + Math.random() * 14 - 7;

    const build = () => {
      const step = BOX_W + COL_GAP;
      const count = Math.max(1, Math.floor(width / step));
      const offset = (width - (count * step - COL_GAP)) / 2;
      baseY = height - 26;
      maxPerCol = Math.max(3, Math.floor((height * 0.6) / (BOX_H + GAP)));

      columns = Array.from({ length: count }, (_, i) => {
        const initial = Math.floor(Math.random() * Math.min(maxPerCol, 6));
        const boxes: Box[] = [];
        for (let k = 0; k < initial; k++) {
          boxes.push({
            hue: pickHue(),
            y: baseY - (k + 1) * (BOX_H + GAP),
            alpha: 1,
            index: k,
            leaving: false
          });
        }
        return { x: offset + i * step, boxes, timer: Math.floor(Math.random() * 80) };
      });
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

    const settledCount = (col: Column) =>
      col.boxes.reduce((n, b) => n + (b.leaving ? 0 : 1), 0);

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, width, height);

      // Chão do armazém.
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 2);
      ctx.lineTo(width, baseY + 2);
      ctx.stroke();

      for (const col of columns) {
        // Decide entrada (empilha) ou saída (expede a caixa do topo).
        col.timer -= 1;
        if (col.timer <= 0) {
          col.timer = 45 + Math.random() * 100;
          const sc = settledCount(col);
          if (sc < maxPerCol && Math.random() < 0.62) {
            col.boxes.push({
              hue: pickHue(),
              y: -BOX_H - Math.random() * 120,
              alpha: 1,
              index: sc,
              leaving: false
            });
          } else if (sc > 0) {
            for (let i = col.boxes.length - 1; i >= 0; i--) {
              if (!col.boxes[i]!.leaving) {
                col.boxes[i]!.leaving = true;
                break;
              }
            }
          }
        }

        for (let i = col.boxes.length - 1; i >= 0; i--) {
          const b = col.boxes[i]!;
          if (b.leaving) {
            const targetY = -BOX_H - 40;
            b.y += (targetY - b.y) * 0.14;
            b.alpha -= 0.028;
            if (b.alpha <= 0) {
              col.boxes.splice(i, 1);
              continue;
            }
          } else {
            const settledY = baseY - (b.index + 1) * (BOX_H + GAP);
            b.y += (settledY - b.y) * 0.16;
          }

          const a = Math.max(0, b.alpha);
          const x = col.x;

          // Corpo da caixa.
          ctx.globalAlpha = a;
          ctx.fillStyle = `hsla(${b.hue}, 65%, 52%, 0.22)`;
          roundRect(x, b.y, BOX_W, BOX_H, 4);
          ctx.fill();

          // Contorno.
          ctx.strokeStyle = `hsla(${b.hue}, 82%, 66%, 0.6)`;
          ctx.lineWidth = 1.4;
          roundRect(x, b.y, BOX_W, BOX_H, 4);
          ctx.stroke();

          // Fita central (cara de engradado).
          ctx.strokeStyle = `hsla(${b.hue}, 82%, 74%, 0.35)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + BOX_W / 2, b.y + 2);
          ctx.lineTo(x + BOX_W / 2, b.y + BOX_H - 2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="stock-bg-canvas" aria-hidden="true" />;
};
