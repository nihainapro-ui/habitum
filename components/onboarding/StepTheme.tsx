'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { applyTheme, defaultTheme, readThemeCookie, THEMES, type Theme } from '@/lib/theme';
import { useStore } from '@/lib/store';

/* Deuxième écran : le thème.

   Il s'applique IMMÉDIATEMENT au clic — c'est un choix qui se juge à l'œil, pas
   à son nom. La préférence part dans le cookie (lu avant la première peinture)
   et dans les réglages, comme partout ailleurs. */

export function StepTheme({ onNext }: { onNext: () => void }) {
  const t = useTranslations('app');
  const setSetting = useStore((s) => s.setSetting);

  /* Lu APRÈS montage : la préférence n'existe que dans le navigateur, et la
     lire au rendu ferait diverger l'hydratation (même règle qu'ailleurs). */
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  useEffect(() => {
    setTheme(readThemeCookie());
  }, []);

  const choisir = (choisi: Theme) => {
    setTheme(choisi);
    applyTheme(choisi);
    void setSetting('theme', choisi);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {THEMES.map((nom) => (
          <button
            key={nom}
            type="button"
            onClick={() => choisir(nom)}
            aria-pressed={theme === nom}
            className="rounded-btn cursor-pointer border px-5 py-2.5 text-[13px]"
            style={{
              borderColor: theme === nom ? 'var(--acc2)' : 'var(--line)',
              color: theme === nom ? 'var(--txt)' : 'var(--txt2)',
            }}
          >
            {t(`theme_${nom}`)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="rounded-btn cursor-pointer self-start border-0 px-5 py-2.5 text-[13px] font-bold"
        style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))', color: '#04060d' }}
      >
        {t('obNext')}
      </button>
    </div>
  );
}
