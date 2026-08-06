'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, defaultLocale, isLocale } from './config';

/** Bascule FR/EN depuis les réglages. Un an, pas de tracking, pas de tiers. */
export async function setLocale(next: string) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, isLocale(next) ? next : defaultLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
