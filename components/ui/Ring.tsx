/* Anneau de progression, 0 à 1.

   `role="img"` + `aria-label` : un SVG sans nom accessible est annoncé
   « graphique », ce qui ne dit rien. La valeur doit être LUE, pas seulement
   vue — c'est le chiffre principal du tableau de bord. */
export function Ring({
  value,
  label,
  size = 72,
  stroke = 7,
}: {
  value: number;
  label: string;
  size?: number;
  stroke?: number;
}) {
  const borne = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const rayon = (size - stroke) / 2;
  const perimetre = 2 * Math.PI * rayon;

  return (
    <svg width={size} height={size} role="img" aria-label={label} style={{ display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={rayon}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={rayon}
        fill="none"
        stroke="var(--acc2)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={perimetre}
        strokeDashoffset={perimetre * (1 - borne)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .5s ease' }}
      />
    </svg>
  );
}
