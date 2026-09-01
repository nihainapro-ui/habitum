import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Bloc } from '@/lib/site/contenu/types';

/* La politique de confidentialité doit décrire CE DÉPLOIEMENT, pas le produit
   en général.
 *
 * POURQUOI CE TEST EXISTE. La section « Synchronisation » est ajoutée par un
 * `...(syncDisponible() ? SYNC_FR : [])` — une ligne facile à écrire de
 * travers, et dont l'erreur ne se verrait dans aucune autre suite : la page
 * s'affiche parfaitement dans les deux cas, elle ment simplement dans l'un
 * d'eux. Or les deux mensonges possibles coûtent cher, en sens inverse :
 * annoncer un relais qui n'existe pas inquiète pour rien, et taire un relais
 * qui existe est exactement ce qu'une politique de confidentialité ne doit
 * jamais faire.
 *
 * `resetModules` est indispensable : la variable est lue à l'évaluation du
 * module, une seule fois. Sans réinitialisation, le second cas relirait le
 * tableau construit pour le premier. */

async function chargerPolitique(url: string | undefined) {
  vi.resetModules();
  if (url === undefined) delete process.env.NEXT_PUBLIC_SYNC_URL;
  else process.env.NEXT_PUBLIC_SYNC_URL = url;
  const { CONFIDENTIALITE } = await import('@/lib/site/contenu/legal');
  return CONFIDENTIALITE;
}

const titres = (blocs: readonly Bloc[]) => blocs.flatMap((b) => (b.t === 'h2' ? [b.x] : []));

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SYNC_URL;
  vi.resetModules();
});

describe('section « Synchronisation » de la politique', () => {
  it('est ABSENTE quand aucun relais n’est configuré', async () => {
    const politique = await chargerPolitique(undefined);

    expect(titres(politique.fr)).not.toContain('Synchronisation entre appareils');
    expect(titres(politique.en)).not.toContain('Sync between devices');
  });

  it('est PRÉSENTE quand un relais est configuré, dans les deux langues', async () => {
    const politique = await chargerPolitique('https://relais.exemple');

    /* Les deux langues ensemble : une section ajoutée d'un seul côté
       laisserait une page anglaise silencieuse sur un envoi bien réel. */
    expect(titres(politique.fr)).toContain('Synchronisation entre appareils');
    expect(titres(politique.en)).toContain('Sync between devices');
  });

  it('dit les trois choses qui engagent, quand elle est là', async () => {
    const politique = await chargerPolitique('https://relais.exemple');
    const texte = JSON.stringify(politique.fr);

    /* Ce ne sont pas des tournures à préserver mot pour mot, mais trois faits
       sans lesquels la section ne vaut rien : que c'est facultatif, que le
       relais ne peut pas lire, et que le code perdu l'est pour tout le monde.
       Un futur remaniement du texte qui en laisserait tomber un doit échouer
       ici plutôt que de passer inaperçu. */
    expect(texte).toContain('désactivée par défaut');
    expect(texte).toContain('ne peut pas lire');
    expect(texte).toContain('récupérable par personne');
  });
});
