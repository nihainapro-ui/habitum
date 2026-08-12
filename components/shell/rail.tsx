'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NAV_GROUPS } from './nav-items';

/* Rail de navigation, trois groupes du prototype : Espace / Suivi / Focus.
   Masqué sous 768 px, où la barre basse prend le relais, et masqué en mode zen.
   Les icônes Lucide arrivent avec le système visuel (phase 3, tâche 3.6). */

export function Rail({ zen }: { zen: boolean }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  if (zen) return null;

  return (
    <nav
      data-testid="rail"
      aria-label={t('mainNav')}
      className="hidden w-[228px] shrink-0 flex-col gap-1 overflow-y-auto border-r px-3 py-6 md:flex"
      style={{ borderColor: 'var(--line)' }}
    >
      <strong className="mb-4 px-2 text-lg tracking-tight">Habitum</strong>

      {NAV_GROUPS.map((groupe) => (
        <div key={groupe.key} className="flex flex-col gap-0.5">
          <div
            className="mt-3 mb-1 px-2 text-[11px] tracking-[0.14em] uppercase"
            style={{ color: 'var(--mut)' }}
          >
            {t(groupe.key)}
          </div>
          {groupe.items.map((item) => {
            const actif = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={actif ? 'page' : undefined}
                className="truncate rounded-lg px-2.5 py-2 text-sm"
                style={{
                  color: actif ? 'var(--txt)' : 'var(--mut)',
                  background: actif ? 'var(--panel2)' : 'transparent',
                }}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
