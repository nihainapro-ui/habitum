'use client';

import { useTranslations } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { useStore } from '@/lib/store';

/* Premier écran : la langue.

   Elle vient en premier parce que tout le reste du parcours s'affiche dedans.
   Ce sont deux BOUTONS et non un sélecteur : à ce moment-là, l'utilisateur n'a
   encore rien à régler, il a une question à trancher. */

export function StepLang({ onNext }: { onNext: () => void }) {
  const t = useTranslations('app');
  const { locale, setLocale } = useLocaleSwitcher();
  const setSetting = useStore((s) => s.setSetting);

  const choisir = (code: Locale) => {
    setLocale(code);
    void setSetting('lang', code);
    onNext();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choisir(code)}
          aria-pressed={locale === code}
          className="rounded-btn cursor-pointer border px-5 py-2.5 text-[13px]"
          style={{
            borderColor: locale === code ? 'var(--acc2)' : 'var(--line)',
            color: locale === code ? 'var(--txt)' : 'var(--txt2)',
          }}
        >
          {t(`lang_${code}`)}
        </button>
      ))}
    </div>
  );
}
