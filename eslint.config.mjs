import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    // `next-env.d.ts` est régénéré par `next build` avec une référence
    // triple-slash vers .next/types/ : il est déjà dans .gitignore et n'a pas à
    // être linté. Sans cette exclusion, le lint local passe au rouge dès qu'on
    // a construit une fois, alors que la CI reste verte sur checkout propre (D18).
    ignores: ['.next/**', 'node_modules/**', 'public/prototype/**', 'docs/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
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
    // Le moteur métier reste pur : ni React, ni Next, ni persistance.
    files: ['lib/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*', '@/lib/storage', '@/lib/storage/*'],
              message: 'lib/domain doit rester pur — aucun import de React, Next ou persistance.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
