'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { useLocaleSwitcher } from './locale-provider';

/* En-tête : la date du jour, l'accès à la palette, le badge de démonstration
   et le mode zen. */

export function Header() {
  const t = useTranslations();
  const { locale } = useLocaleSwitcher();
  const zen = useStore((s) => s.ui.zen);
  const isDemo = useStore((s) => s.isDemo);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const toggleZen = useStore((s) => s.toggleZen);
  const declencheur = useRef<HTMLButtonElement>(null);

  /* La date se calcule APRÈS le montage, jamais au rendu.
     Les pages sont prérendues à la compilation (D12) : une date rendue côté
     serveur serait la date du BUILD — un chiffre affiché qui ne correspond à
     rien, exactement ce que CLAUDE.md § 3 interdit. */
  const [aujourdhui, setAujourdhui] = useState<string>('');
  useEffect(() => {
    setAujourdhui(
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    );
  }, [locale]);

  return (
    <header
      className="flex items-center gap-3 border-b px-4 py-3 md:px-6"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm" style={{ color: 'var(--txt2)' }}>
          {aujourdhui || ' '}
        </div>
      </div>

      {isDemo ? (
        <span
          title={t('system.demoTag')}
          className="shrink-0 rounded-full px-2 py-1 text-[11px] whitespace-nowrap"
          style={{ background: 'var(--panel2)', color: 'var(--txt2)' }}
        >
          {/* Sous 1200 px, le badge se réduit à sa marque : il ne doit pas
              voler la place du reste de l'en-tête (CHANGELOG, lot 1).

              Le libellé accessible est un TEXTE masqué, pas un `aria-label` :
              posé sur un `<span>` sans rôle, l'attribut est proscrit — les
              lecteurs d'écran l'ignorent, et le badge redevenait muet. */}
          <span className="hidden min-[1200px]:inline">{t('system.demoTag')}</span>
          <span className="min-[1200px]:hidden">
            <span aria-hidden="true">◉</span>
            <span className="sr-only">{t('system.demoTag')}</span>
          </span>
        </span>
      ) : null}

      {/* La palette rend le focus à ce bouton en le retenant à l'ouverture
          (`document.activeElement`) — rien à mémoriser ici. */}
      <button
        ref={declencheur}
        type="button"
        onClick={() => setCommandOpen(true)}
        className="shrink-0 rounded-lg border px-3 py-1.5 text-sm"
        style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
      >
        {t('app.search')}
      </button>

      <button
        type="button"
        onClick={toggleZen}
        aria-pressed={zen}
        className="shrink-0 rounded-lg border px-3 py-1.5 text-sm"
        style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
      >
        {zen ? t('app.zenOff') : t('app.zenOn')}
      </button>
    </header>
  );
}
