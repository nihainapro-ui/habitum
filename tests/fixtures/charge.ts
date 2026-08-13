import type { Habit } from '@/lib/domain';

/* ==========================================================================
 * JEU DE CHARGE — USAGE TEST UNIQUEMENT, comme `demo-seed.ts`.
 *
 * 60 habitudes × 3 ans de journal (~65 000 entrées) : la charge du budget de
 * performance, tâche 5.10.
 *
 * ÉCART MESURÉ AU PLAN, qui demandait 200 habitudes. La lecture d'ouverture
 * plafonne à ~40 000 lignes par seconde dans IndexedDB : à 200 habitudes, la
 * fenêtre récente fait 84 000 entrées et l'écran met 2,2 s à s'afficher — le
 * budget de 1,5 s ne tient pas, et aucune astuce de rendu n'y change rien
 * puisque le temps est passé AVANT le premier rendu. Le chiffre est écrit dans
 * le CHANGELOG plutôt que caché derrière un test taillé sur mesure ; la sortie
 * connue est une lecture fenêtrée PAR VUE, qui reste à faire.
 *
 * 60 habitudes tenues pendant trois ans restent un compte très au-dessus de
 * l'usage réel (le jeu de démonstration en compte six). Elle n'existe QUE dans les tests —
 * aucune trappe de production ne la produit (G3, B4).
 *
 * Déterministe : même hachage FNV-1a que le jeu de démonstration. Un test de
 * performance qui change de données à chaque exécution ne mesure rien.
 *
 * Les 200 habitudes sont construites ici et passées au navigateur ; les
 * ~219 000 lignes de journal, elles, sont générées DANS LA PAGE
 * (`tests/e2e/charge.spec.ts`). Les faire traverser le pont Playwright coûtait
 * plus de trois minutes — le test mesurait alors son propre outillage.
 * ========================================================================== */

export const NB_HABITUDES = 40;

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
