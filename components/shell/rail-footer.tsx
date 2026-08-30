'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { THEMES, applyTheme, readThemeCookie, type Theme } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useLocaleSwitcher } from './locale-provider';

/* Pied du rail — porté de `lay.foot` (`Habitum.dc.html`, lignes 197–204).

   Deux bascules, pas deux menus : le thème et la langue tournent en boucle sur
   un clic. C'est un raccourci, pas un remplacement — le choix explicite reste
   dans les Réglages, où les trois thèmes sont visibles d'un coup.

   Replié (< 1060 px), le pied passe en COLONNE et le nom du thème disparaît :
   il ne reste que la pastille et le code de langue. C'est ce que montre
   `tests/visual/reference/01-dash.png`, en bas du rail. */

export function RailFooter() {
  const t = useTranslations('app');
  const { locale, setLocale } = useLocaleSwitcher();
  const setSetting = useStore((s) => s.setSetting);

  /* Lecture APRÈS montage : les pages sont prérendues (D12), la préférence
     n'existe que dans le navigateur. La lire au rendu divergerait à
     l'hydratation — même raison que `ThemeSwitcher`. */
  const [theme, setTheme] = useState<Theme>('neural');
  useEffect(() => {
    setTheme(readThemeCookie());
  }, []);

  const suivant = () => {
    const prochain = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'neural';
    setTheme(prochain);
    applyTheme(prochain);
    void setSetting('theme', prochain);
  };

  return (
    <div
      className="flex flex-col items-center gap-2 border-t px-[10px] py-[14px] min-[1060px]:flex-row min-[1060px]:px-4"
      style={{ borderColor: 'var(--line)' }}
    >
      <button
        type="button"
        onClick={suivant}
        aria-label={t('switchTheme')}
        title={t('switchTheme')}
        className="flex flex-1 cursor-pointer items-center gap-2 rounded-[10px] border px-[10px] py-2"
        style={{
          borderColor: 'var(--line)',
          background: 'transparent',
          color: 'var(--txt2)',
          font: 'inherit',
          fontSize: '11px',
        }}
      >
        {/* La pastille prend la couleur d'accent SECONDAIRE du thème courant :
            elle change donc d'elle-même à chaque bascule, et c'est tout ce que
            le rail replié montre du thème. */}
        <span
          aria-hidden="true"
          style={{
            width: '7px',
            height: '7px',
            flex: 'none',
            borderRadius: '50%',
            background: 'var(--acc2)',
            boxShadow: '0 0 9px var(--acc2)',
          }}
        />
        <span
          className="hidden min-[1060px]:inline"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}
        >
          {t(`theme_${theme}`)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
        aria-label={t('switchLang')}
        title={t('switchLang')}
        className="cursor-pointer rounded-[10px] border px-[11px] py-2"
        style={{
          borderColor: 'var(--line)',
          background: 'transparent',
          color: 'var(--txt2)',
          font: 'inherit',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '.08em',
        }}
      >
        {locale.toUpperCase()}
      </button>
    </div>
  );
}
