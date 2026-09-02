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
      <div className="flex max-[399px]:flex-wrap items-center gap-3">
        {check}
        <CategoryGlyph category={category} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Pas de `break-words` ici non plus : à 360 px, sondé sur la
                ligne « Méditer », le titre débordait sa boîte de 5 px (48
                pour 43 disponibles) — assez pour que `break-words` le
                scinde visiblement (« Médit »/« er »), constaté et refusé en
                ronde de correction 1. `min-w-0` reste, seul : il n'autorise
                que le retour à la ligne normal (aux espaces, comme n'importe
                quel paragraphe), jamais la coupe DANS un mot. Le vrai
                correctif est en amont : voir le commentaire du groupe
                quantité/jauge/compteur plus bas, qui explique QUI cède la
                place et pourquoi. */}
            <span
              data-name
              className="min-w-0 text-[13.5px] font-medium"
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
                le glyphe coloré redevient ce qu'il doit être, décoratif.

                `whitespace-nowrap`, sans césure : une pastille cassée en deux
                lignes (« Habi »/« tude ») est un mot mutilé, pas une mise en
                page qui cède — la sonde de la ronde précédente avait établi
                la largeur qui manquait (59 px pour 36 disponibles) mais pas
                la bonne réponse. Le vrai coupable, et pourquoi c'est lui :
                voir le commentaire du groupe quantité/jauge/compteur plus
                bas. */}
            <span
              className="rounded-chip px-1.5 py-px text-[10.5px] font-semibold tracking-[0.04em] whitespace-nowrap"
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

        {/* Quantité + jauge + compteur, groupés : à eux trois, MOINS porteurs
            d'information que le titre ou la pastille de type — c'est donc à
            eux de céder. Même doctrine que sur les tuiles du Tableau de bord
            et des Statistiques (`DashView.tsx`, `StatsView.tsx`) : entre
            voisins d'une même rangée, celui qui porte le moins d'information
            cède sa place ; aucun mot n'est jamais scindé pour autant.

            Sondé à 360 px sur `/app/today`, avant puis après ce groupement
            (sonde en pièce jointe du rapport), tiroir déjà ancré en première
            ligne (`order-1` ci-dessous, voir plus bas) : sans ce groupe sur
            la ligne, le bloc central (titre + pastille) passe de 36 à 180 px
            pour la ligne « Lire au moins 20 pages » et de 43 à 180 px pour
            « Méditer » — largement au-dessus des 59 px que réclame la
            pastille « Habitude », le mot le plus large mesuré sur toute la
            vue. Sous 400 px (seuil déjà présent dans l'intention du
            commentaire d'origine, repris ici littéralement), ce groupe passe
            donc À LA LIGNE SUIVANTE plutôt que de forcer le titre ou la
            pastille à rétrécir sous leur propre mot. La quantité elle-même
            reste NON coupée : « 5/8 verres » EST l'information de la ligne,
            c'est sa PLACE qui change, pas son texte.

            `max-[399px]:order-2` : sans lui, le tiroir d'actions (juste après
            ce groupe dans le flux) suivrait le même retour à la ligne —
            constaté en ronde de correction 2 : un « ⋮ » esseulé sur une
            TROISIÈME ligne, à 86 px de son titre au lieu des 5 à 18 px des
            lignes correctement ancrées. Le tiroir passe donc devant ce groupe
            dans l'ORDRE VISUEL (`max-[399px]:order-1`, ci-dessous) sans
            bouger dans le DOM.

            Ce déplacement a un prix, et il faut le dire plutôt que le taire :
            l'ordre de tabulation suit le DOM, pas l'affichage. Sous 400 px,
            Tab atteint donc les boutons −/+ de ce groupe (2ᵉ ligne à l'écran)
            AVANT le tiroir « ⋮ » (1ʳᵉ ligne) — l'ordre visuel et l'ordre de
            focus divergent, exactement ce que WCAG 2.4.3 demande d'éviter, et
            qu'aucun outil automatique ne détecte. Le compromis est jugé
            étroit et acceptable — l'écart ne joue que sous 400 px, et le
            tiroir reste atteignable un Tab plus tard — mais c'est un prix
            payé, pas la preuve que l'ordre serait sans conséquence. */}
        {amount || controls || (ratio !== null && ratio !== undefined) ? (
          <div className="flex flex-none items-center gap-3 max-[399px]:order-2 max-[399px]:basis-full max-[399px]:justify-end">
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
          </div>
        ) : null}

        {/* `max-[399px]:order-1` : reste sur la première ligne (avec la case,
            le glyphe et le titre) au lieu de suivre le groupe
            quantité/jauge/compteur sur la ligne suivante — voir le
            commentaire ci-dessus, sur ce même groupe. Au-dessus de 400 px,
            aucun ordre n'est forcé : le tiroir garde sa position naturelle,
            en fin de rangée. */}
        <div className="max-[399px]:order-1">{drawer}</div>
      </div>

      {sub}
    </li>
  );
}
