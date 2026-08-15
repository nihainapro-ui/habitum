import type { Metadata } from 'next';
import { Introuvable } from '@/components/site/pages/introuvable';
import { textes } from '@/lib/site/textes';

/* 404 de la vitrine anglaise — jumelle de celle du groupe français. */

const LANGUE = 'en' as const;

export const metadata: Metadata = {
  title: textes(LANGUE).introuvable.titreOnglet,
  robots: { index: false, follow: true },
};

export default function NonTrouve() {
  return <Introuvable langue={LANGUE} />;
}
