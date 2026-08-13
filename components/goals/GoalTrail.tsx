'use client';

import { useTranslations } from 'next-intl';
import type { PointCourbe } from '@/lib/domain';

/* Courbe d'avancement — SVG maison, aucune dépendance.

   Le tracé est décoratif au sens strict : le pourcentage courant est déjà
   écrit à côté, en toutes lettres. D'où `role="img"` et un nom accessible qui
   dit l'essentiel plutôt qu'une liste de points illisible à l'oreille. */

const L = 240;
const H = 44;

export function GoalTrail({ points, percent }: { points: PointCourbe[]; percent: number }) {
  const t = useTranslations('app');
  if (points.length < 2) return null;

  const pas = L / (points.length - 1);
  const y = (p: number) => H - 2 - (Math.max(0, Math.min(100, p)) / 100) * (H - 4);

  const trace = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * pas} ${y(p.percent)}`).join(' ');
  const aire = `${trace} L ${L} ${H} L 0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label={`${t('objTrail')} : ${percent} %`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <path d={aire} fill="color-mix(in srgb, var(--acc2) 14%, transparent)" />
      <path
        d={trace}
        fill="none"
        stroke="var(--acc2)"
        strokeWidth={1.6}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
