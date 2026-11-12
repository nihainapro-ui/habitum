'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, Plus, Search } from 'lucide-react';
import { addDays, today } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';
import { useLocaleSwitcher } from './locale-provider';
import { enteteMobile, estActif, itemActif } from './nav-items';
import { FeuilleCreation } from './feuille-creation';
import { FeuilleDate } from './feuille-date';

/* En-tête MOBILE — sous 768 px seulement. Refonte mobile, PDF p. 2 :
   « L'en-tête garde trois éléments : titre, une action contextuelle (date ou
   recherche), le « + ». Le sous-titre disparaît ; les ambiances (XP, thème,
   langue) rejoignent Profil et Réglages. »

   Huit éléments sur 360 px — menu, point d'état, titre, sur-titre tronqué,
   losange, calendrier, recherche, « + » — deviennent trois. L'en-tête de
   bureau (`header.tsx`) n'a pas bougé : les deux sont rendus et c'est le CSS
   (`md:hidden` / `hidden md:flex`) qui tranche, avant la première peinture,
   parce que les pages sont prérendues (D12).

   Sur Aujourd'hui, LE TITRE EST LA DATE du jour affiché (p. 5), et l'appuyer
   ramène à aujourd'hui. Cette date dépend de l'horloge : elle n'est rendue
   qu'après montage, comme le bandeau — le prérendu porterait sinon la date de
   la compilation, et React signalerait l'écart (#418). D'ici là, l'en-tête
   affiche le nom de la vue.

   Le badge de démonstration n'est plus ici : il vit dans la carte de profil de
   « Plus » et dans Profil (p. 15). L'en-tête d'un écran de 360 px n'a pas la
   place d'un losange que personne ne comprend. */

export function HeaderMobile() {
  const t = useTranslations();
  const pathname = usePathname() ?? '';
  const { locale } = useLocaleSwitcher();
  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const openEditor = useStore((s) => s.openEditor);
  const [choix, setChoix] = useState(false);
  const [dateOuverte, setDateOuverte] = useState(false);
  const boutonDate = useRef<HTMLButtonElement>(null);
  const boutonPlus = useRef<HTMLButtonElement>(null);
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const item = itemActif(pathname);
  const entete = enteteMobile(item?.href);
  const surAujourdhui = estActif(pathname, '/app/today');

  const formatDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }),
    [locale],
  );
  const titreDate = useMemo(() => {
    if (!monte) return null;
    const brut = formatDate.format(addDays(today(), day));
    return brut.charAt(0).toUpperCase() + brut.slice(1);
  }, [monte, formatDate, day]);

  const titre = item ? t(`app.${item.key}`) : 'Habitum';
  /* Composé hors du JSX (`jsx-no-literals`) : le nom de la vue, puis la date. */
  const prefixeVue = `${titre} · `;

  const surPlus = () => {
    if (entete.plus === 'habit') openEditor({ kind: 'habit', id: null });
    else if (entete.plus === 'task') openEditor({ kind: 'task', id: null });
    else setChoix(true);
  };

  const BOUTON = 'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-pill border';

  return (
    <header
      data-testid="header-mobile"
      className="sticky top-0 z-[18] flex items-center gap-2 px-4 pb-2.5 md:hidden"
      style={{
        paddingTop: 'calc(10px + env(safe-area-inset-top))',
        background:
          'linear-gradient(180deg,color-mix(in srgb,var(--bg) 92%,transparent),color-mix(in srgb,var(--bg) 70%,transparent))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <h1
        className="m-0 min-w-0 flex-1 truncate text-[19px] leading-tight"
        style={{ fontWeight: 600, letterSpacing: '-.3px' }}
      >
        {surAujourdhui && titreDate ? (
          <>
            {/* Le NOM de la vue reste dans le nom accessible du titre : la
                région annoncée, la recette et un lecteur d'écran cherchent
                « Aujourd'hui », pas une date. */}
            <span className="sr-only">{prefixeVue}</span>
            <button
              type="button"
              onClick={() => setDay(0)}
              aria-label={day === 0 ? undefined : t('app.mobBackToday')}
              title={day === 0 ? undefined : t('app.mobBackToday')}
              className="m-0 max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-inherit"
              style={{ font: 'inherit', color: day === 0 ? 'var(--txt)' : 'var(--acc2)' }}
            >
              {titreDate}
            </button>
          </>
        ) : (
          titre
        )}
      </h1>

      {entete.action === 'date' ? (
        <button
          type="button"
          ref={boutonDate}
          onClick={() => setDateOuverte(true)}
          aria-label={t('app.openMonth')}
          aria-haspopup="dialog"
          title={t('app.openMonth')}
          className={BOUTON}
          style={{
            borderColor: 'var(--line)',
            background: 'var(--panel2)',
            color: 'var(--txt2)',
          }}
        >
          <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}

      {entete.action === 'search' ? (
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label={t('app.search')}
          className={BOUTON}
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
        >
          <Search size={17} strokeWidth={1.9} aria-hidden="true" />
        </button>
      ) : null}

      {entete.plus ? (
        <button
          type="button"
          ref={boutonPlus}
          onClick={surPlus}
          aria-label={t('app.newItem')}
          aria-haspopup={entete.plus === 'choice' ? 'dialog' : undefined}
          className={BOUTON}
          style={{ borderColor: 'var(--acc2)', background: 'var(--acc2)', color: ENCRE_SUR_TEINTE }}
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}

      <FeuilleCreation open={choix} onOpenChange={setChoix} retourFocus={boutonPlus} />
      <FeuilleDate open={dateOuverte} onOpenChange={setDateOuverte} retourFocus={boutonDate} />
    </header>
  );
}
