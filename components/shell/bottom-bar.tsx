'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BOTTOM_ITEMS } from './nav-items';

/* Barre basse, sous 768 px seulement. Quatre entrées quotidiennes sous le
   pouce ; tout le reste passe par la palette ⌘K.
   Cibles de 44 px minimum : c'est le plancher tactile, pas une préférence. */

export function BottomBar({ zen }: { zen: boolean }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  if (zen) return null;

  return (
    <nav
      data-testid="bottom-bar"
      aria-label={t('quickNav')}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t md:hidden"
      style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}
    >
      {BOTTOM_ITEMS.map((item) => {
        const actif = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? 'page' : undefined}
            className="flex min-h-[52px] flex-1 items-center justify-center truncate px-2 text-xs"
            style={{ color: actif ? 'var(--txt)' : 'var(--mut)' }}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
