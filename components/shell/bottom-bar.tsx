'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { BOTTOM_ITEMS } from './nav-items';

/* Barre basse, sous 768 px seulement — portée de `lay.bottom` et `navBot()`
   (`Habitum.dc.html`, lignes 2716 et 2539).

   Quatre entrées quotidiennes sous le pouce ; tout le reste passe par la
   palette ⌘K.

   Deux valeurs ne viennent PAS du prototype, et c'est délibéré :
   - la hauteur minimale reste à 52 px là où le prototype pose 48. Le plancher
     tactile est 44 px, les deux le passent ; on ne descend pas une cible déjà
     validée en recette pour gagner 4 px.
   - `env(safe-area-inset-bottom)` s'ajoute au bas : sans lui, la barre passe
     sous la poignée d'accueil des téléphones sans bord. */

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
      {BOTTOM_ITEMS.map((item) => {
        const actif = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? 'page' : undefined}
            className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] px-1 text-[11px]"
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
            <span className="max-w-full truncate">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
