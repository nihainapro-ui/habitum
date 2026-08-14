import type { Habit } from '@/lib/domain';

/* ==========================================================================
 * JEU DE CHARGE — USAGE TEST UNIQUEMENT, comme `demo-seed.ts`.
 *
 * 200 habitudes × 3 ans de journal — 219 000 entrées, la charge exacte du plan
 * (tâche 5.10). Elle n'existe QUE dans les tests : aucune trappe de production
 * ne la produit (G3, B4).
 *
 * Elle est SEMÉE ligne à ligne dans la table `logs`, sans instantané : le test
 * mesure donc les deux ouvertures qui comptent — la première, qui reconstruit,
 * et les suivantes, qui sont celles que l'utilisateur vit tous les jours.
 *
 * MESURE (13 août 2026, build de production, Chromium) : ouverture 881 ms,
 * interaction 43 ms. Les deux budgets du plan sont tenus à l'échelle du plan.
 *
 * Déterministe : même hachage FNV-1a que le jeu de démonstration. Un test de
 * performance qui change de données à chaque exécution ne mesure rien.
 *
 * Les habitudes sont construites ici et passées au navigateur ; les 219 000
 * lignes de journal, elles, sont générées DANS LA PAGE
 * (`tests/e2e/charge.spec.ts`). Les faire traverser le pont Playwright coûtait
 * plusieurs minutes — le test mesurait alors son propre outillage.
 * ========================================================================== */

export const NB_HABITUDES = 200;

/* La PROFONDEUR du plan est conservée : trois ans. C'est elle qui éprouve
   l'ouverture en deux temps — la fenêtre récente lit 420 jours sur 1 095, et
   le reste arrive en fond. */
export const NB_JOURS = 365 * 3;

const ISO = '2026-08-05T00:00:00.000Z';

const CATEGORIES = ['health', 'sport', 'mind', 'work', 'study', 'home'] as const;

export const habitudesDeCharge = (): Habit[] =>
  Array.from({ length: NB_HABITUDES }, (_, i) => ({
    id: `c${i}`,
    name: `Habitude de charge ${i + 1}`,
    category: CATEGORIES[i % CATEGORIES.length]!,
    goal: { kind: 'check' as const, target: 1, step: 1, unit: '' },
    mode: 'dow' as const,
    days: [0, 1, 2, 3, 4, 5, 6],
    subItems: [],
    reminders: [],
    archived: false,
    note: '',
    createdAt: ISO,
    updatedAt: ISO,
  }));
