import type { Metadata } from 'next';
import { Introuvable } from '@/components/site/pages/introuvable';
import { archivo } from '@/lib/fonts';
import { textes } from '@/lib/site/textes';
import '@/styles/modernist.css';

/* 404 GLOBAL — la seule réponse à une URL qui ne correspond à rien.
 *
 * Elle existe parce que la séparation en trois layouts racines (tâche 7.1) a
 * coûté le 404 du projet : sans layout racine unique, Next ne sait pas lequel
 * appliquer à une adresse inconnue, et servait sa page interne — sans attribut
 * `lang`, sans marque, sans lien de retour. Constaté après coup, en vérifiant à
 * la main ce qu'aucun test ne regardait.
 *
 * `global-not-found` est le mécanisme prévu pour exactement ce cas : il rend
 * son PROPRE document, `<html>` et `<body>` compris, sans dépendre d'un layout.
 * Il est encore derrière un drapeau (`experimental.globalNotFound`), ce qui est
 * écrit dans `next.config.mjs` avec la conduite à tenir s'il disparaît.
 *
 * Elle est rendue en FRANÇAIS, langue par défaut du produit, et propose la
 * bascule comme n'importe quelle page de vitrine : une adresse morte ne dit pas
 * quelle langue son visiteur lisait. */

const LANGUE = 'fr' as const;

export const metadata: Metadata = {
  title: textes(LANGUE).introuvable.titreOnglet,
  // Une page d'erreur n'a rien à faire dans un index.
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang={LANGUE} className={archivo.variable}>
      <body>
        <Introuvable langue={LANGUE} />
      </body>
    </html>
  );
}
