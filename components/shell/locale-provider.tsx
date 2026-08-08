'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/client-locale';

/* La langue est appliquée CÔTÉ CLIENT (D12, ADR-0007).

   Le serveur rend toujours la langue par défaut — c'est ce qui permet aux douze
   routes d'être statiques. À l'hydratation, ce composant lit le cookie et, si
   la préférence diffère, charge les libellés correspondants et bascule sans
   rechargement. La seconde langue n'entre dans le bundle que si elle sert. */

type Messages = AbstractIntlMessages;

interface LocaleContexte {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

const Contexte = createContext<LocaleContexte>({ locale: defaultLocale, setLocale: () => {} });

/** Langue courante et bascule. Le sélecteur de langue (phase 3) s'y branche. */
export const useLocaleSwitcher = (): LocaleContexte => useContext(Contexte);

async function chargerMessages(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default as Messages;
}

export function LocaleProvider({
  defaultMessages,
  children,
}: {
  defaultMessages: Messages;
  children: ReactNode;
}) {
  const [locale, setLocaleEtat] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(defaultMessages);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      writeLocaleCookie(next);
      void chargerMessages(next).then((m) => {
        setMessages(m);
        setLocaleEtat(next);
      });
    },
    [locale],
  );

  /* Première hydratation : la préférence peut différer de ce que le serveur a
     rendu. On la rattrape ici, une seule fois. */
  useEffect(() => {
    const voulue = readLocaleCookie();
    if (voulue === defaultLocale) return;
    let annule = false;
    void chargerMessages(voulue).then((m) => {
      if (annule) return;
      setMessages(m);
      setLocaleEtat(voulue);
    });
    return () => {
      annule = true;
    };
  }, []);

  /* L'attribut `lang` doit suivre : les lecteurs d'écran changent de voix
     dessus, et c'est la seule chose qui le leur dit. */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const valeur = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  /* Le serveur prérend en UTC pour être déterministe (`i18n/request.ts`). Le
     fuseau réel n'existe que dans le navigateur : on l'applique après le
     montage, sinon le rendu client et le rendu serveur divergeraient. */
  const [timeZone, setTimeZone] = useState('UTC');
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);

  return (
    <Contexte.Provider value={valeur}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </Contexte.Provider>
  );
}
