import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    // `next-env.d.ts` est régénéré par `next build` avec une référence
    // triple-slash vers .next/types/ : il est déjà dans .gitignore et n'a pas à
    // être linté. Sans cette exclusion, le lint local passe au rouge dès qu'on
    // a construit une fois, alors que la CI reste verte sur checkout propre (D18).
    /* `public/sw.js` est le service worker COMPILÉ par Serwist à chaque build
       (tâche 5.7). Le source est `app/sw.ts`, lui bien linté ; linter la sortie
       minifiée d'un outil tiers ne dit rien sur notre code et fait échouer
       `verify` sur des motifs qu'on ne peut pas corriger. */
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/prototype/**',
      'public/sw.js',
      'docs/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
  {
    /* Analyse de sécurité statique — remplace CodeQL, indisponible sur un dépôt
       privé en plan gratuit. eslint-plugin-security (Apache-2.0) couvre ce qui
       compte réellement ici : `eval`, `new Function`, `child_process`, les
       expressions régulières construites dynamiquement, la lecture de fichier
       par chemin non littéral. Il tourne dans `npm run lint`, donc dans
       `verify`, donc en CI sur chaque push et chaque PR — là où CodeQL aurait
       tourné, et plus tôt.

       Ce qu'il ne remplace pas : l'analyse de flux inter-procédurale de CodeQL.
       C'est écrit dans SECURITY.md plutôt que sous-entendu. */
    files: ['**/*.{js,mjs,ts,tsx}'],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      /* Ce qui compte vraiment, en ERREUR : le lint est dans `verify`, donc un
         de ces motifs arrête la livraison au lieu de la commenter. */
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-child-process': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      /* `detect-object-injection` signale TOUT accès `objet[clé]`. Le produit
         en est fait — index de journal, sélecteurs, libellés. Gardée active,
         elle produirait des centaines d'avertissements et apprendrait à
         ignorer le rouge. Le risque qu'elle vise (pollution de prototype) est
         traité à sa vraie place : la validation zod de l'importeur, et le test
         dédié de la tâche 7.6. */
      'security/detect-object-injection': 'off',
    },
  },
  {
    /* Outillage local : `scripts/` et `tests/` lisent des chemins et composent
       des expressions régulières à partir de constantes DU DÉPÔT, jamais d'une
       entrée utilisateur — il n'y a pas d'attaquant à l'autre bout d'un script
       de build. Laisser ces deux règles crier ici noierait les vrais signaux
       du code applicatif, où elles restent en erreur. */
    files: ['scripts/**/*.{js,mjs,ts}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
  {
    // Convention du dépôt : un identifiant préfixé `_` est délibérément
    // inutilisé. Cas d'usage : un paramètre conservé pour la stabilité d'une
    // signature publique alors que l'implémentation ne le lit plus — voir
    // `isScheduled(h, d, _now)` après la correction de D16.
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    /* D6 — 311 clés traduites et symétriques, aucune atteignable : les libellés
       étaient écrits en français dans le JSX. Cette règle rend la rechute
       impossible.

       `app/(app)/dev/**` est exclu : la galerie des primitives n'est pas un
       écran produit, ses libellés sont des noms de composants. */
    files: ['app/**/*.tsx', 'components/**/*.tsx'],
    ignores: ['app/(app)/dev/**'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          /* Ponctuation, symboles et NOM DU PRODUIT : rien de tout cela ne se
             traduit. « Habitum » est une marque, pas un libellé. */
          allowedStrings: ['Habitum', '·', '—', '–', '/', ':', '%', '✕', '◉', '←', '→'],
          ignoreProps: true,
        },
      ],
    },
  },
  {
    // Le moteur métier reste pur : ni React, ni Next, ni persistance.
    files: ['lib/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'next',
                'next/*',
                '@/lib/storage',
                '@/lib/storage/*',
                '@/lib/data',
                '@/lib/data/*',
                'dexie',
              ],
              message: 'lib/domain doit rester pur — aucun import de React, Next ou persistance.',
            },
          ],
        },
      ],
    },
  },
  {
    // Le store passe par les DÉPÔTS, jamais par la base directement, et jamais
    // par localStorage : c'est la fabrique de dépôt qui garantit `updatedAt` et
    // la suppression logique. Une tranche qui écrit dans Dexie contourne tout ça.
    files: ['lib/store/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['dexie', '@/lib/data/db', '@/lib/storage', '@/lib/storage/*'],
              message: 'Le store passe par les dépôts de lib/data, jamais par la base.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'La persistance passe par lib/data — jamais localStorage depuis le store.',
        },
      ],
    },
  },
  {
    // La persistance peut dépendre du domaine ; jamais l'inverse (bloqué au-dessus),
    // et jamais de React dans la couche de données : elle ne rend rien.
    files: ['lib/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message: 'lib/data reste sans React — la persistance ne rend rien.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
