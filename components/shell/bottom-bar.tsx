'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';
import { BOTTOM_ITEMS, estActif } from './nav-items';

/* Barre basse, sous 768 px seulement — refonte mobile, PDF p. 2-3.

   UNE SEULE BARRE : Aujourd'hui · Habitudes · Tâches · Plus. Le tiroir latéral
   qui doublait cette barre de douze entrées, d'une carte de niveau, du thème
   et de la langue n'existe plus ; « Plus » est l'écran qui le remplace, à un
   appui. `nav-items.ts` en tient la liste.

   La forme vient de la maquette : une pastille flottante (99 px), écartée des
   bords, dont l'entrée courante est un APLAT turquoise — la seule couleur
   d'action, réservée à l'élément sélectionné (p. 17). L'encre sur cet aplat
   est déduite du thème (`ENCRE_SUR_TEINTE`), jamais écrite en dur : dans
   `clinical` l'accent est foncé, et un `#04060d` posé dessus serait illisible.

   Ce qui ne change pas par rapport à la barre précédente, et pourquoi :
   - cibles de 52 px de haut (plancher tactile 44, validé en recette) ;
   - `env(safe-area-inset-bottom)` sous la barre — sans lui, elle passe sous la
     poignée d'accueil des téléphones sans bord ;
   - le libellé ne se tronque jamais : deux lignes au plus, serrées ;
   - le VOILE au-dessus de la barre, qui dit « ça continue en dessous » — une
     barre de progression tranchée au pixel près n'était pas estompée, elle
     était guillotinée. Il est désormais un élément FRÈRE de la barre, ancré au
     bas de l'écran : la barre flotte, le voile ne peut plus s'y accrocher. */

export function BottomBar({ zen }: { zen: boolean }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  if (zen) return null;

  return (
    <>
      <span
        aria-hidden="true"
        data-voile
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{
          height: 'calc(118px + env(safe-area-inset-bottom))',
          background:
            'linear-gradient(to top,' +
            'var(--bg) 0%,' +
            'var(--bg) 52%,' +
            'color-mix(in srgb,var(--bg) 72%,transparent) 70%,' +
            'color-mix(in srgb,var(--bg) 30%,transparent) 86%,' +
            'transparent 100%)',
        }}
      />
      <nav
        data-testid="bottom-bar"
        aria-label={t('quickNav')}
        className="rounded-pill fixed inset-x-3 z-40 flex gap-1 border p-1.5 md:hidden"
        style={{
          bottom: 'calc(10px + env(safe-area-inset-bottom))',
          borderColor: 'var(--line)',
          background: 'color-mix(in srgb,var(--bg2) 92%,transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {BOTTOM_ITEMS.map((item) => {
          /* Comparaison NORMALISÉE : l'export statique ajoute une barre finale
             au chemin (`nav-items.ts` § normaliserChemin), et aucune entrée ne
             se marquait courante dans l'APK. */
          const actif = estActif(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={actif ? 'page' : undefined}
              className="rounded-pill flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-center text-[10.5px] leading-[1.15]"
              style={{
                background: actif ? 'var(--acc2)' : 'transparent',
                /* `--txt2` et non `--mut` pour l'entrée inactive : sur le fond
                   de la pastille (`--bg2`), `--mut` tombe sous 4,5:1 dans
                   `clinical` — mesuré par axe. */
                color: actif ? ENCRE_SUR_TEINTE : 'var(--txt2)',
                fontWeight: actif ? 700 : 500,
                transition: 'background .2s,color .2s',
              }}
            >
              <span style={{ display: 'flex' }}>
                <Icon name={item.icon} size={17} />
              </span>
              <span className="line-clamp-2 max-w-full">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
