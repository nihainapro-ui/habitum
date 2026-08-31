'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { BOTTOM_ITEMS, estActif } from './nav-items';

/* Barre basse, sous 768 px seulement — portée de `lay.bottom` et `navBot()`
   (`Habitum.dc.html`, lignes 2716 et 2539).

   Quatre entrées quotidiennes sous le pouce ; tout le reste passe par la
   palette ⌘K.

   Deux valeurs ne viennent PAS du prototype, et c'est délibéré :
   - la hauteur minimale reste à 52 px là où le prototype pose 48. Le plancher
     tactile est 44 px, les deux le passent ; on ne descend pas une cible déjà
     validée en recette pour gagner 4 px.
   - `env(safe-area-inset-bottom)` s'ajoute au bas : sans lui, la barre passe
     sous la poignée d'accueil des téléphones sans bord.

   LE LIBELLÉ NE SE TRONQUE PLUS. `truncate` rendait « Tableau de b… » sur un
   écran de 360 px — un mot coupé au milieu ne nomme plus rien. Il passe
   maintenant sur deux lignes au plus, serrées ; la cible reste à 52 px, où
   deux lignes de 10,5 px tiennent (17 px d'icône + 4 de gouttière + 26).

   LE VOILE. La barre est opaque à 88 % et porte un filet net : le contenu qui
   passe dessous n'était pas estompé, il était GUILLOTINÉ — une barre de
   progression tranchée en deux au pixel près. Le voile est la rampe d'accès :
   48 px au-dessus de la barre, où le fond remonte de rien à tout.

   Il n'est pas décoratif, il DIT quelque chose : « ça continue en dessous ».
   Un dégradé linéaire aurait donné une bande visible — l'œil lit la rupture de
   pente. Les quatre arrêts approchent une courbe : opaque vite, transparent
   lentement. Et il est ANCRÉ à la barre (`bottom:100%` sur un enfant absolu),
   jamais à une hauteur recopiée : la barre grandit avec la zone sûre, le voile
   la suit sans qu'un nombre soit à tenir à jour à deux endroits. */

export function BottomBar({ zen }: { zen: boolean }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  if (zen) return null;

  return (
    <nav
      data-testid="bottom-bar"
      aria-label={t('quickNav')}
      className="fixed inset-x-0 bottom-0 z-40 flex gap-[2px] border-t px-[10px] pt-2 md:hidden"
      style={{
        borderColor: 'var(--line)',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        background: 'color-mix(in srgb,var(--bg) 88%,transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Le voile, hors du flux et hors du pointeur. Il se colle au bord haut de
          la barre quelle que soit la hauteur de celle-ci — la zone sûre grandit,
          il suit, sans nombre à tenir à jour à deux endroits.

          LE « + 1px » N'EST PAS UN AJUSTEMENT AU JUGÉ. La boîte de
          positionnement d'un enfant absolu est la boîte de REMPLISSAGE, qui
          commence sous la bordure ; `bottom:100%` posait donc le voile 1 px
          trop bas, et son extrémité opaque — un enfant peint par-dessus la
          bordure du parent — EFFAÇAIT le filet du haut. La barre perdait son
          arête et flottait sur un fond qui venait justement de s'estomper. Le
          voile s'arrête maintenant au ras du filet : le contenu se dissout, la
          bordure tranche. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+1px)] h-12"
        style={{
          background:
            'linear-gradient(to top,' +
            'var(--bg) 0%,' +
            'color-mix(in srgb,var(--bg) 72%,transparent) 34%,' +
            'color-mix(in srgb,var(--bg) 30%,transparent) 64%,' +
            'transparent 100%)',
        }}
      />

      {BOTTOM_ITEMS.map((item) => {
        /* Comparaison NORMALISÉE : l'export statique ajoute une barre finale
           au chemin (`nav-items.ts` § normaliserChemin), et aucune entrée ne se
           marquait courante dans l'APK. */
        const actif = estActif(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? 'page' : undefined}
            className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] px-0.5 text-center text-[10.5px] leading-[1.15]"
            style={{
              border: `1px solid ${actif ? 'color-mix(in srgb,var(--acc2) 34%,transparent)' : 'transparent'}`,
              background: actif ? 'rgba(var(--glow),.18)' : 'transparent',
              /* LE LIBELLÉ EN `--txt`, PAS EN `--acc2`. Le prototype met
                 l'accent sur les deux ; il tient dans `neural` et `plasma`,
                 dont les accents sont fluorescents, et tombe à **3,87:1** dans
                 `clinical`, dont les accents sont foncés — sous le seuil AA de
                 4,5 pour du texte. Mesuré par axe, un nœud sur chaque vue.
                 L'accent reste porté par l'icône, la bordure et le fond : à
                 3,87 elle passe le seuil de 3:1 des éléments NON textuels. */
              color: actif ? 'var(--txt)' : 'var(--mut)',
              transition: 'background .2s,color .2s',
            }}
          >
            <span style={{ color: actif ? 'var(--acc2)' : 'inherit', display: 'flex' }}>
              <Icon name={item.icon} size={17} />
            </span>
            <span className="line-clamp-2 max-w-full">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
