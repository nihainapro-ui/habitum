import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { LangueSite } from './routes';
import { textes } from './textes';

/* Image Open Graph — tâche 7.2, étape 3.
 *
 * 1200 × 630, en Modernist, POLICE EMBARQUÉE. Ce dernier point n'est pas un
 * raffinement : la CSP du site interdit toute origine tierce, et la promesse
 * produit interdit qu'une police soit récupérée ailleurs — y compris à la
 * construction. Le fichier est donc lu sur le disque, dans `public/fonts/`,
 * extrait de `@fontsource/archivo` par `scripts/extract-fonts.mjs`.
 *
 * Il est lu en `.woff` et non en `.woff2` : Satori, le moteur qui compose
 * l'image, ne sait pas décoder le woff2. C'est la raison d'être de la seule
 * exception de `extract-fonts.mjs`, et elle est écrite là-bas aussi.
 *
 * L'image est composée à la CONSTRUCTION, une fois par langue. Aucune fonction
 * ne tourne à l'exécution (D12).
 */

export const tailleOpenGraph = { width: 1200, height: 630 };
export const typeOpenGraph = 'image/png';

const ENCRE = '#201e1d';
const PAPIER = '#f3f2f2';
const ROUGE = '#ec3013';

/* Chemin composé de littéraux du dépôt : aucune entrée utilisateur n'atteint
   `readFile`, et le fichier est lu une fois, à la construction. */
const policeArchivo = () =>
  readFile(join(process.cwd(), 'public', 'fonts', 'Archivo-ExtraBold.woff'));

export async function imageOpenGraph(langue: LangueSite) {
  const t = textes(langue).accueil;
  const archivo = await policeArchivo();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: PAPIER,
        color: ENCRE,
        fontFamily: 'Archivo',
        padding: '64px 72px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 28, height: 28, background: ROUGE }} />
        <div style={{ fontSize: 34, letterSpacing: '-0.02em' }}>{'Habitum'}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Le filet de 2 px et le rouge en accent unique : c'est tout le
              système Modernist, et il tient en deux traits. */}
        <div style={{ height: 4, background: ENCRE, marginBottom: 40 }} />
        <div style={{ fontSize: 74, lineHeight: 1.05, letterSpacing: '-0.03em' }}>{t.titre}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: ROUGE,
          }}
        >
          {t.kicker}
        </div>
        <div style={{ fontSize: 26, color: '#605d5d' }}>{'habitum'}</div>
      </div>
    </div>,
    {
      ...tailleOpenGraph,
      fonts: [{ name: 'Archivo', data: archivo, weight: 800, style: 'normal' }],
    },
  );
}
