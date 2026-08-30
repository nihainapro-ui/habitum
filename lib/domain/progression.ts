import type { Habit, LogIndex, Session, Task } from './types';
import { today } from './date';
import { currentStreak } from './metrics';
import { bestStreakOverall, daysBack } from './stats';

/* Progression de la coque — porté de `coreVals()` du prototype (lignes
   2872–2884 de `public/prototype/Habitum.dc.html`).
 *
 * Ce que ce module calcule : l'expérience cumulée, le niveau qu'elle atteint,
 * le rang qui nomme ce niveau, et l'INDICE affiché dans l'en-tête (« IDX »).
 *
 * POURQUOI DANS `lib/domain` et non dans le composant : CLAUDE.md § 2. Le rail
 * affiche le niveau, l'en-tête affiche l'indice, et les deux tomberaient
 * autrement dans deux composants qui recalculeraient chacun leur version.
 *
 * CE N'EST PAS UN CHIFFRE DÉCORATIF — CLAUDE.md § 3. Chaque terme vient du
 * journal réel : `dn`/`sc` sont les occurrences faites et prévues sur 120
 * jours, `bestAll` le meilleur record, et les minutes sont celles de sessions
 * ENREGISTRÉES. Un compte vierge donne donc xp = 0, niveau 1, indice 1 — pas
 * une estimation flatteuse. Le défaut E1 (génération de minutes de focus) a
 * été corrigé au lot 2 ; ne pas le réintroduire par ici.
 *
 * Les constantes (12, 40, 2, 150, 580, 12, 16) ne sont pas dérivables : ce
 * sont les coefficients du prototype, repris au chiffre près parce qu'ils
 * FONT le barème. Les changer changerait le niveau de tout le monde. */

/** Fenêtre d'observation de l'indice, en jours. Valeur du prototype. */
const FENETRE = 120;

/** Nombre de rangs. Le libellé vit dans `messages/*.json` (`app.rank0`…) :
 *  `lib/domain` ne connaît aucune langue. */
export const NB_RANGS = 7;

export interface Progression {
  /** Expérience cumulée. Sans plafond : c'est une somme, pas un score. */
  xp: number;
  /** Niveau, à partir de 1. */
  level: number;
  /** Rang atteint, de 0 à `NB_RANGS - 1`. Index, pas libellé. */
  rankIndex: number;
  /** Expérience acquise DANS le niveau courant. */
  into: number;
  /** Expérience que demande le niveau courant, de bout en bout. */
  span: number;
  /** Avancement dans le niveau, en pourcentage entier. */
  pct: number;
  /** Indice de l'en-tête, borné à [1, 999]. */
  index: number;
}

/** Progression complète. `sessions` est la liste ENTIÈRE : l'expérience se
 *  cumule sur toute la vie du compte, contrairement à l'indice qui, lui,
 *  regarde les 120 derniers jours. */
export function progression(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  sessions: readonly Session[],
  now: Date = today(),
): Progression {
  let fait = 0;
  let prevu = 0;
  for (const j of daysBack(log, habits, tasks, FENETRE, now)) {
    fait += j.done;
    prevu += j.scheduled;
  }

  const meilleurRecord = bestStreakOverall(log, habits, now);
  const meilleureSerie = habits.reduce((max, h) => Math.max(max, currentStreak(log, h, now)), 0);
  const minutes = sessions.reduce((a, s) => a + (Number(s.minutes) || 0), 0);

  const xp = fait * 12 + meilleurRecord * 40 + minutes * 2;

  /* Le niveau croît en racine carrée : les premiers coûtent peu, les suivants
     de plus en plus. `+1` parce qu'on commence au niveau 1, pas au niveau 0. */
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 150)) + 1);
  const precedent = Math.round(150 * (level - 1) ** 2);
  const requis = Math.round(150 * level ** 2);
  /* `Math.max(1, …)` : `span` est un dénominateur, il ne peut pas valoir 0. */
  const span = Math.max(1, requis - precedent);
  const into = Math.max(0, Math.min(span, xp - precedent));

  const ratio = prevu ? fait / prevu : 0;
  const index = Math.max(
    1,
    Math.min(999, Math.round(ratio * 580 + meilleureSerie * 12 + level * 16)),
  );

  return {
    xp,
    level,
    rankIndex: Math.min(NB_RANGS - 1, Math.floor((level - 1) / 2)),
    into,
    span,
    pct: Math.round((into / span) * 100),
    index,
  };
}
