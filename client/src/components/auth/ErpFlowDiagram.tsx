import React from 'react';

/**
 * Diagrama do ERP no fundo do login: os módulos (estoque, vendas, logística,
 * serviços e dados) ligados por trilhas de néon ao núcleo "ERP" hexagonal.
 * Pulsos de luz percorrem as trilhas mostrando o processamento em andamento.
 *
 * É SVG (não canvas) para o traço ficar nítido em qualquer densidade de tela; a
 * animação é toda declarativa via SMIL/CSS, sem custo de JS por quadro. Fica
 * atrás do card de login e com opacidade baixa, para não competir com o
 * formulário.
 */

/** Trilhas: cada uma sai de um módulo e chega ao núcleo hexagonal central. */
const TRACKS: { d: string; hue: number; dur: string; delay: string }[] = [
  // Esquerda: vendas (gráfico) e estoque (caixas)
  { d: 'M 130 190 H 300 Q 330 190 340 230 H 545', hue: 186, dur: '4.2s', delay: '0s' },
  { d: 'M 150 330 H 290 Q 325 330 335 300 H 545', hue: 200, dur: '5s', delay: '-1.4s' },
  { d: 'M 210 430 H 300 Q 340 430 350 330 H 545', hue: 276, dur: '5.6s', delay: '-2.6s' },
  // Direita: logística (caminhão), serviços (headset) e dados (database)
  { d: 'M 1170 165 H 1010 Q 975 165 965 230 H 775', hue: 186, dur: '4.6s', delay: '-0.8s' },
  { d: 'M 1150 300 H 1000 Q 968 300 960 285 H 775', hue: 214, dur: '5.2s', delay: '-2s' },
  { d: 'M 1120 420 H 1000 Q 962 420 952 330 H 775', hue: 276, dur: '6s', delay: '-3.2s' }
];

export const ErpFlowDiagram: React.FC = () => (
  <svg
    className="login-diagram"
    viewBox="0 0 1300 560"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <filter id="erpGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="hexStroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(186, 100%, 62%)" />
        <stop offset="100%" stopColor="hsl(276, 100%, 68%)" />
      </linearGradient>
    </defs>

    <g filter="url(#erpGlow)">
      {/* Trilhas + pulso viajando em cada uma */}
      {TRACKS.map((track, i) => (
        <g key={i}>
          <path
            d={track.d}
            fill="none"
            stroke={`hsl(${track.hue}, 90%, 60%)`}
            strokeWidth={1.5}
            strokeOpacity={0.32}
            strokeLinecap="round"
          />
          <circle r={3.2} fill={`hsl(${track.hue}, 100%, 74%)`}>
            <animateMotion
              path={track.d}
              dur={track.dur}
              begin={track.delay}
              repeatCount="indefinite"
              rotate="auto"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
              dur={track.dur}
              begin={track.delay}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}

      {/* ── Núcleo ERP: hexágono girando devagar ── */}
      <g transform="translate(660 275)">
        <polygon
          points="0,-74 64,-37 64,37 0,74 -64,37 -64,-37"
          fill="none"
          stroke="url(#hexStroke)"
          strokeWidth={2}
          strokeOpacity={0.75}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="46s"
            repeatCount="indefinite"
          />
        </polygon>
        <polygon
          points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
          fill="none"
          stroke="hsl(200, 100%, 65%)"
          strokeWidth={1}
          strokeOpacity={0.35}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360"
            to="0"
            dur="34s"
            repeatCount="indefinite"
          />
        </polygon>
        <text
          x={0}
          y={9}
          textAnchor="middle"
          className="login-diagram-erp"
          fill="hsl(190, 100%, 80%)"
        >
          ERP
          <animate
            attributeName="opacity"
            values="0.75;1;0.75"
            dur="3.6s"
            repeatCount="indefinite"
          />
        </text>
      </g>

      {/* ── Vendas: barras ascendentes + linha de tendência ── */}
      <g stroke="hsl(186, 95%, 65%)" strokeOpacity={0.6} fill="none" strokeWidth={2}>
        <rect x={70} y={175} width={13} height={34} rx={2} />
        <rect x={90} y={158} width={13} height={51} rx={2} />
        <rect x={110} y={138} width={13} height={71} rx={2} />
        <path d="M 68 168 L 96 146 L 120 122" strokeWidth={1.6} strokeOpacity={0.5} />
        <path d="M 112 126 L 122 120 L 120 132" strokeWidth={1.6} strokeOpacity={0.5} />
      </g>

      {/* ── Estoque: caixas conectadas ── */}
      <g stroke="hsl(200, 95%, 68%)" strokeOpacity={0.55} fill="none" strokeWidth={1.8}>
        <rect x={96} y={306} width={30} height={26} rx={3} />
        <path d="M 96 314 H 126" strokeOpacity={0.32} />
        <rect x={150} y={296} width={26} height={22} rx={3} strokeOpacity={0.4} />
        <path d="M 126 320 H 150" strokeOpacity={0.3} />
      </g>

      {/* ── Estoque (empilhado): três caixas ── */}
      <g stroke="hsl(276, 95%, 72%)" strokeOpacity={0.5} fill="none" strokeWidth={1.8}>
        <rect x={152} y={408} width={28} height={24} rx={3} />
        <rect x={186} y={408} width={28} height={24} rx={3} strokeOpacity={0.36} />
        <rect x={169} y={380} width={28} height={24} rx={3} strokeOpacity={0.3} />
      </g>

      {/* ── Logística: caminhão de entrega ── */}
      <g stroke="hsl(186, 95%, 66%)" strokeOpacity={0.58} fill="none" strokeWidth={1.9}>
        <rect x={1178} y={140} width={54} height={34} rx={3} />
        <path d="M 1232 152 H 1252 L 1264 166 V 174 H 1232 Z" />
        <circle cx={1196} cy={182} r={7} />
        <circle cx={1248} cy={182} r={7} />
        <path d="M 1140 148 H 1168 M 1150 160 H 1168 M 1132 172 H 1168" strokeOpacity={0.34} />
      </g>

      {/* ── Serviços: atendimento com headset ── */}
      <g stroke="hsl(214, 95%, 70%)" strokeOpacity={0.55} fill="none" strokeWidth={1.9}>
        <circle cx={1172} cy={292} r={13} />
        <path d="M 1155 292 a 17 17 0 0 1 34 0" />
        <path d="M 1155 292 v 10 a 5 5 0 0 0 5 5" strokeOpacity={0.4} />
        <path d="M 1152 322 a 24 14 0 0 1 40 0" strokeOpacity={0.4} />
      </g>

      {/* ── Dados: cilindros de banco de dados + nós ── */}
      <g stroke="hsl(276, 95%, 72%)" strokeOpacity={0.55} fill="none" strokeWidth={1.9}>
        <ellipse cx={1160} cy={404} rx={26} ry={9} />
        <path d="M 1134 404 v 18 a 26 9 0 0 0 52 0 v -18" />
        <path d="M 1134 422 v 18 a 26 9 0 0 0 52 0 v -18" strokeOpacity={0.4} />
        <circle cx={1218} cy={398} r={3.4} strokeOpacity={0.5} />
        <circle cx={1240} cy={424} r={3.4} strokeOpacity={0.42} />
        <path d="M 1186 408 L 1216 399 M 1220 402 L 1238 421" strokeOpacity={0.3} strokeWidth={1.3} />
      </g>
    </g>
  </svg>
);
