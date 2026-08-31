'use client';

import { useTranslations } from 'next-intl';
import { RailContenu } from './rail-contenu';

/* Rail de navigation — porté de `<aside data-side>` et de `layVals()`
   (`public/prototype/Habitum.dc.html`, lignes 110–206 et 2670–2681).

   DEUX ÉTATS, UN SEUL SEUIL. Sous 1060 px le rail est REPLIÉ : 72 px, icônes
   seules, ni libellés, ni titres de groupe, ni carte d'expérience. Au-delà il
   est déplié à 252 px. `BP_TABLET = 1060` est la valeur du prototype, et
   04-DESIGN-TOKENS.md § Palier téléphone est explicite : « ne rien changer
   au-dessus de 1060 px, c'est la référence visuelle validée ».

   POURQUOI EN CSS ET NON EN JS. Le prototype décide avec `state.vw`, une
   mesure JavaScript. Ici les pages sont PRÉRENDUES (D12) : un rail dimensionné
   après montage s'afficherait d'abord déplié, puis se replierait sous les yeux
   de l'utilisateur à chaque chargement. Les variantes `min-[1060px]:` tranchent
   avant la première peinture. ADR-0005 l'autorise explicitement — « au portage,
   Tailwind et les classes reprennent ce rôle ».

   Sous 768 px le rail disparaît au profit de `BottomBar` — qui ne porte que
   quatre entrées. Les sept autres vues passent alors par `NavDrawer`, qui
   rend LE MÊME contenu que ce rail, déplié, dans un tiroir. Le mode zen les
   masque tous les deux ; le bouton du tiroir, lui, reste dans l'en-tête, sans
   quoi le zen mobile serait une impasse. */

export function Rail({ zen }: { zen: boolean }) {
  const t = useTranslations('app');

  if (zen) return null;

  return (
    <nav
      data-testid="rail"
      aria-label={t('mainNav')}
      className="sticky top-0 z-20 hidden h-screen w-[72px] shrink-0 flex-col border-r md:flex min-[1060px]:w-[252px]"
      style={{
        borderColor: 'var(--line)',
        /* La lueur tombe du haut à gauche, là où se trouve la marque. */
        background: 'linear-gradient(190deg,rgba(var(--glow),.07),transparent 42%)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        transition: 'width .3s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <RailContenu deplie={false} />
    </nav>
  );
}
