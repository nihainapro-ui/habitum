'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProgression } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';
import { MarqueHabitum } from './marque';
import { NAV_GROUPS } from './nav-items';
import { RailFooter } from './rail-footer';

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

   Sous 768 px le rail disparaît au profit de `BottomBar`, et le mode zen le
   masque entièrement. */

export function Rail({ zen }: { zen: boolean }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  const prog = useProgression();

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
      <div className="flex items-center justify-center gap-3 pt-5 pb-[18px] min-[1060px]:justify-start min-[1060px]:px-[18px]">
        <MarqueHabitum />
        <div className="hidden min-w-0 flex-col gap-0.5 min-[1060px]:flex">
          <span
            className="truncate"
            style={{ fontSize: '15.5px', fontWeight: 700, letterSpacing: '.22em' }}
          >
            Habitum
          </span>
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8.5px',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--mut)',
            }}
          >
            {t('tagline')}
          </span>
        </div>
      </div>

      {/* Carte d'expérience — dépliée seulement. Tout ce qu'elle montre vient
          du journal réel : un compte vierge affiche « LVL 1 » et une barre
          vide, jamais une progression de courtoisie (CLAUDE.md § 3). */}
      <div
        className="mx-[18px] mb-4 hidden flex-col gap-[9px] rounded-[13px] border px-[13px] py-3 min-[1060px]:flex"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '.1em',
              color: 'var(--acc2)',
            }}
          >
            {t('levelLbl')} {prog.level}
          </span>
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8.5px',
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--mut)',
            }}
          >
            {t(`rank${prog.rankIndex}`)}
          </span>
        </div>
        <div
          className="h-[5px] overflow-hidden rounded-[99px]"
          style={{ background: 'rgba(var(--glow),.14)' }}
        >
          <div
            style={{
              width: `${prog.pct}%`,
              height: '100%',
              borderRadius: '99px',
              background: 'linear-gradient(90deg,var(--acc),var(--acc2))',
              boxShadow: '0 0 14px -1px var(--acc2)',
              transition: 'width .8s cubic-bezier(.2,.8,.2,1)',
            }}
          />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--mut)' }}>
          {t('xpLine', { into: prog.into, span: prog.span })}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[3px] overflow-x-hidden overflow-y-auto px-[10px] pb-[18px] min-[1060px]:px-3">
        {NAV_GROUPS.map((groupe) => (
          <div key={groupe.key} className="flex flex-col gap-[3px]">
            <div
              className="hidden px-2 pt-[10px] pb-[7px] min-[1060px]:block"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9.5px',
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--mut)',
              }}
            >
              {t(groupe.key)}
            </div>
            {groupe.items.map((item) => (
              <EntreeRail
                key={item.href}
                href={item.href}
                libelle={t(item.key)}
                icone={item.icon}
                actif={pathname === item.href}
              />
            ))}
          </div>
        ))}
      </div>

      <RailFooter />
    </nav>
  );
}

/** Une entrée du rail. Replié, l'icône porte SEULE le sens : le libellé reste
 *  dans le nom accessible du lien, jamais retiré de l'arbre. */
function EntreeRail({
  href,
  libelle,
  icone,
  actif,
}: {
  href: string;
  libelle: string;
  icone: Parameters<typeof Icon>[0]['name'];
  actif: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      aria-label={libelle}
      title={libelle}
      className="relative flex w-full items-center justify-center gap-[11px] rounded-[11px] py-[11px] min-[1060px]:justify-start min-[1060px]:py-[9px] min-[1060px]:pr-[11px] min-[1060px]:pl-[13px]"
      style={{
        border: `1px solid ${actif ? 'color-mix(in srgb,var(--acc2) 34%,transparent)' : 'transparent'}`,
        background: actif
          ? 'linear-gradient(90deg,rgba(var(--glow),.20),rgba(var(--glow),.04))'
          : 'transparent',
        color: actif ? 'var(--txt)' : 'var(--txt2)',
        fontSize: '12.5px',
        fontWeight: actif ? 600 : 400,
        boxShadow: actif
          ? 'inset 0 1px 0 rgba(160,215,255,.12),0 8px 22px -14px rgba(var(--glow),.9)'
          : 'none',
        transition: 'background .2s,color .2s,box-shadow .2s,border-color .2s',
      }}
    >
      {/* Le filet d'état, collé au bord gauche du rail. Il ne DISPARAÎT pas
          quand l'entrée est inactive : il se rétracte à zéro, ce qui lui
          laisse une transition à jouer dans les deux sens. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-1px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2px',
          height: actif ? '20px' : '0px',
          borderRadius: '99px',
          background: 'var(--acc2)',
          boxShadow: '0 0 10px var(--acc2)',
          transition: 'height .24s cubic-bezier(.2,.8,.2,1)',
        }}
      />
      <Icon name={icone} />
      <span
        className="hidden flex-1 text-left min-[1060px]:block"
        style={{ letterSpacing: '.01em' }}
      >
        {libelle}
      </span>
    </Link>
  );
}
