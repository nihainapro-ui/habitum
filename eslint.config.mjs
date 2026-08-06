import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ['.next/**', 'node_modules/**', 'public/prototype/**', 'docs/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
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
