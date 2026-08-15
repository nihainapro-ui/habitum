'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('app');

  return (
    <main className="flex flex-col items-start gap-3 p-12">
      <h1 className="m-0 text-[28px] tracking-tight">{t('nf404')}</h1>
      <p className="m-0 text-[13px]" style={{ color: 'var(--mut)' }}>
        {t('nf404Sub')}
      </p>
      <Link href="/app" className="text-[13px]">
        {t('nfBack')}
      </Link>
    </main>
  );
}
