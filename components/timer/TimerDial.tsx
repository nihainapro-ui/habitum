'use client';

import type { TimerPhase } from '@/lib/domain';

/* Cadran du minuteur.

   Un seul SVG, pas d'animation CSS pilotée par une durée : la position de
   l'aiguille est TOUJOURS déduite du temps réel. Une transition CSS de 25
   minutes se désynchroniserait au premier changement d'onglet. */

const TAILLE = 220;
const EPAISSEUR = 10;

export function TimerDial({
  ratio,
  phase,
  label,
  children,
}: {
  ratio: number;
  phase: TimerPhase;
  label: string;
  children: React.ReactNode;
}) {
  const rayon = (TAILLE - EPAISSEUR) / 2;
  const perimetre = 2 * Math.PI * rayon;
  const couleur = phase === 'focus' ? 'var(--acc)' : 'var(--ok)';

  return (
    <div className="relative grid place-items-center" style={{ width: TAILLE, height: TAILLE }}>
      <svg width={TAILLE} height={TAILLE} role="img" aria-label={label}>
        <circle
          cx={TAILLE / 2}
          cy={TAILLE / 2}
          r={rayon}
          fill="none"
          stroke="var(--panel2)"
          strokeWidth={EPAISSEUR}
        />
        <circle
          cx={TAILLE / 2}
          cy={TAILLE / 2}
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth={EPAISSEUR}
          strokeLinecap="round"
          strokeDasharray={perimetre}
          strokeDashoffset={perimetre * (1 - Math.max(0, Math.min(1, ratio)))}
          transform={`rotate(-90 ${TAILLE / 2} ${TAILLE / 2})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">{children}</div>
    </div>
  );
}
