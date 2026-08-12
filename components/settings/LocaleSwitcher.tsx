'use client';

import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui';
import { locales, type Locale } from '@/i18n/config';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { useStore } from '@/lib/store';

/* Bascule FR / EN.

   Sans rechargement et SANS SEGMENT D'URL : la langue est une préférence de
   profil, pas une propriété de la ressource (`i18n/config.ts`). L'URL ne
   bouge pas — un lien partagé ne transporte pas la langue de qui l'a copié. */
export function LocaleSwitcher() {
  const t = useTranslations('app');
  const { locale, setLocale } = useLocaleSwitcher();
  const setSetting = useStore((s) => s.setSetting);

  return (
    <Segmented
      label={t('language')}
      value={locale}
      onChange={(v: Locale) => {
        setLocale(v);
        void setSetting('lang', v);
      }}
      options={locales.map((code) => ({ value: code, label: t(`lang_${code}`) }))}
    />
  );
}
