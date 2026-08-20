'use client';

import type { ReactNode } from 'react';
import type { Category } from '@/lib/domain';
import { CategoryGlyph, COULEURS_CATEGORIE } from '@/components/ui';

/* Les props facultatives portent `| undefined` — `exactOptionalPropertyTypes`
 * (D23). Sous ce drapeau, `x?: T` signifie « absente, ou un T », et
 * `x={undefined}` devient une erreur.
 *
 * La distinction compte là où les deux cas DIFFÈRENT : chez Radix,
 * `open={undefined}` bascule un composant en mode non contrôlé, et
 * `components/ui/Dialog.tsx` la respecte par un spread conditionnel. Elle
 * compte aussi pour les entités qui partent en base, où une clé absente et une
 * clé à `undefined` ne se relisent pas pareil — c'est pourquoi les éditeurs
 * omettent les champs vides au lieu de les poser.
 *
 * Ici, elle n'existe pas : ces composants rendent exactement la même chose
 * dans les deux cas. Déclarer `| undefined` dit donc la vérité, plutôt que de
 * forcer un spread conditionnel à chaque appel pour une différence qui n'a pas
 * de sens. */

/* Géométrie commune d'une ligne de la file d'exécution.

   Habitude et tâche partagent la même anatomie — case, glyphe, intitulé,
   étiquette, ligne d'appoint, quantité, jauge, actions. Deux implémentations
   auraient divergé au premier ajustement. Ce qui les distingue (compteurs,
   sous-listes, actions offertes) passe par les emplacements. */

export function RowShell({
  category,
  name,
  done,
  tag,
  meta,
  amount,
  ratio,
  check,
  controls,
  drawer,
  sub,
}: {
  category: Category;
  name: string;
  done: boolean;
  tag: string;
  meta?: string | undefined;
  amount?: string | undefined;
  /** Avancement 0–1, ou `null` quand la notion n'a pas de sens (oui/non). */
  ratio?: number | null | undefined;
  check: ReactNode;
  controls?: ReactNode | undefined;
  drawer: ReactNode;
  sub?: ReactNode | undefined;
}) {
  const couleur = COULEURS_CATEGORIE[category];

  return (
    /* Une ligne faite se signale par un LISERÉ, pas par un fond teinté.
       Le prototype posait `rgba(46,230,168,.06)` derrière toute la ligne :
       mesuré à l'axe, `--mut` y tombe à 4,34 — sous AA — pour les deux textes
       de la ligne. Le liseré porte la même information sans toucher au fond
       sur lequel le texte est lu. */
    <li
      data-row
      className="flex flex-col border-b border-l-2 px-3 py-3 last:border-b-0 md:px-4"
      style={{
        borderBottomColor: 'var(--line)',
        borderLeftColor: done ? 'var(--ok)' : 'transparent',
        transition: 'border-color .2s ease',
      }}
    >
      <div className="flex items-center gap-3">
        {check}
        <CategoryGlyph category={category} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-name
              className="text-[13.5px] font-medium"
              style={{
                color: done ? 'var(--mut)' : 'var(--txt)',
                textDecoration: done ? 'line-through' : 'none',
              }}
            >
              {name}
            </span>
            {/* Étiquette NEUTRE. Teintée de la couleur de catégorie comme dans
                le prototype, elle tombait à 3,95 — la couleur d'un domaine de
                vie est faite pour un glyphe de 30 px, pas pour du texte de
                10,5. La catégorie, elle, est ÉCRITE dans la ligne d'appoint :
                le glyphe coloré redevient ce qu'il doit être, décoratif. */}
            <span
              className="rounded-chip px-1.5 py-px text-[10.5px] font-semibold tracking-[0.04em]"
              style={{ color: 'var(--txt2)', background: 'var(--panel2)' }}
            >
              {tag}
            </span>
          </div>
          {meta ? (
            <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
              {meta}
            </span>
          ) : null}
        </div>

        {/* La quantité reste visible sur téléphone : « 5/8 verres » EST
            l'information de la ligne. C'est la jauge, redondante avec elle,
            qui disparaît quand la place manque. */}
        {amount ? (
          <span
            className="font-mono text-[11px] whitespace-nowrap"
            style={{ color: 'var(--txt2)' }}
          >
            {amount}
          </span>
        ) : null}

        {ratio === null || ratio === undefined ? null : (
          <span
            aria-hidden="true"
            className="rounded-pill hidden h-[5px] w-14 flex-none overflow-hidden md:block"
            style={{ background: 'var(--panel2)' }}
          >
            <span
              className="block h-full"
              style={{
                width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`,
                background: couleur,
                transition: 'width .4s ease',
              }}
            />
          </span>
        )}

        {controls}
        {drawer}
      </div>

      {sub}
    </li>
  );
}
