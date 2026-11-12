'use client';

/* Barre de progression — PDF p. 17 : « 3–6 px + texte n/N ».

   Une jauge seule est une couleur seule : le texte `n/N` est donc porté par
   l'appelant, à côté, et la barre elle-même reste `aria-hidden`. Elle se borne
   à [0, 1] — une valeur qui dépasse la cible (`count` au-delà de sa cible)
   remplit la barre, elle ne la déborde pas. */
export function BarreProgression({
  ratio,
  couleur = 'var(--acc2)',
  hauteur = 3,
}: {
  ratio: number;
  couleur?: string;
  hauteur?: 3 | 4 | 5 | 6;
}) {
  const part = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <span
      aria-hidden="true"
      className="rounded-pill block w-full overflow-hidden"
      style={{ height: hauteur, background: 'var(--panel2)' }}
    >
      <span
        className="rounded-pill block h-full"
        style={{ width: `${part}%`, background: couleur, transition: 'width .25s ease' }}
      />
    </span>
  );
}
