'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui';
import { THEMES, applyTheme, readThemeCookie, type Theme } from '@/lib/theme';
import { useStore } from '@/lib/store';

/* Bascule de thème. Le thème est posé avant la première peinture par
   `public/theme.js` ; ce composant ne fait que refléter et modifier la
   préférence — il ne la découvre pas. */
export function ThemeSwitcher() {
  const t = useTranslations('app');
  const setSetting = useStore((s) => s.setSetting);
  const [theme, setTheme] = useState<Theme>('neural');

  /* Lecture APRÈS montage : le rendu est prérendu (D12), la préférence n'existe
     que dans le navigateur. La lire au rendu produirait une divergence
     d'hydratation. */
  useEffect(() => {
    setTheme(readThemeCookie());
  }, []);

  return (
    <Segmented
      label={t('theme')}
      value={theme}
      onChange={(v) => {
        setTheme(v);
        applyTheme(v);
        void setSetting('theme', v);
      }}
      options={THEMES.map((nom) => ({ value: nom, label: t(`theme_${nom}`) }))}
    />
  );
}
