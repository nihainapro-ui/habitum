import { addDays, dateKey, parseKey, startOfDay, today } from './date';
import { isDone } from './metrics';
import { isScheduled } from './schedule';
import { parseHeure, rappelsRestants } from './reminders';
import { estOccurrence, occurrenceKey } from './recurrence';
import type { Goal, Habit, LogIndex, ProjectTask, Settings, SousTache, Task } from './types';

/* ============================================================================
   Rappels — QUOI rappeler, et QUAND. Cinq sources, un seul calcul.

   Spec du 2026-09-07. Ce fichier ne connaît ni le navigateur, ni Android, ni
   aucune langue : il rend une clé de libellé et ses paramètres, et c'est la
   couche d'envoi qui traduit (`lib/features/reminders/`). C'est la règle 2 du
   CLAUDE.md, étendue à l'i18n — un texte français écrit ici serait un texte
   qu'aucune traduction ne rattrape.

   TROIS RÈGLES, HÉRITÉES DES RAPPELS D'HABITUDE et étendues aux quatre autres
   sources (voir `reminders.ts`, qui reste la source de vérité pour la
   première) :

   1. ce qui n'est pas prévu ce jour-là ne sonne pas ;
   2. ce qui est déjà fait ne sonne pas ;
   3. le passé ne se rattrape pas.

   Et une quatrième, propre au récapitulatif : **on ne sonne pas pour dire
   qu'il n'y a rien**. « Rien à faire aujourd'hui » envoyé chaque matin est le
   plus sûr moyen de faire couper les notifications.
   ========================================================================= */

export const SOURCES_RAPPEL = ['habit', 'task', 'work', 'goal', 'digest'] as const;
export type SourceRappel = (typeof SOURCES_RAPPEL)[number];

export interface Rappel {
  /** Identité stable d'un rappel : `source|id|jour|heure`. Elle sert au
   *  dédoublonnage côté minuteries ET à l'identifiant numérique du canal
   *  natif — la même chose reprogrammée doit retomber sur la même clé. */
  cle: string;
  source: SourceRappel;
  /** Identifiant de l'entité concernée. Vide pour le récapitulatif, qui n'en
   *  désigne aucune. */
  id: string;
  /** Instant absolu du déclenchement, en millisecondes. */
  at: number;
  /** CONTENU UTILISATEUR — le nom de l'entité. Il ne se traduit pas, il
   *  s'affiche tel quel. Vide pour le récapitulatif. */
  titre: string;
  /** Clé de libellé du titre, quand il n'y a pas de contenu utilisateur. */
  titreKey?: string;
  corpsKey: string;
  corpsParams?: Record<string, string | number>;
}

/** Ce que le calcul a besoin de lire. Une seule entrée : un appelant qui
 *  oublierait le journal ou les occurrences notifierait des choses faites. */
export interface EtatRappels {
  habits: readonly Habit[];
  log: LogIndex;
  tasks: readonly Task[];
  /** Occurrences accomplies, clés `taskId|YYYY-MM-DD` (G1). */
  occurrences: ReadonlySet<string>;
  projectTasks: readonly ProjectTask[];
  goals: readonly Goal[];
}

/** Horizon par défaut : la journée. Le canal natif en demande sept — il
 *  programme d'avance, l'application pouvant rester fermée des jours. */
export const HORIZON_JOURS_DEFAUT = 1;

const heureVersMs = (jour: Date, heure: string, repli: number): number => {
  const minutes = parseHeure(heure) ?? repli;
  return jour.getTime() + minutes * 60_000;
};

/** L'instant tombe-t-il dans les heures silencieuses ?
 *
 *  LE CAS QUI COMPTE EST CELUI À CHEVAL SUR MINUIT — 22 h → 7 h est le réglage
 *  qu'on pose neuf fois sur dix, et c'est celui qu'une comparaison naïve
 *  (`from <= t && t < to`) rate entièrement : elle ne silencerait rien. */
export function dansLesHeuresSilencieuses(at: number, s: Settings): boolean {
  if (!s.notifQuiet) return false;
  const debut = parseHeure(s.notifQuietFrom);
  const fin = parseHeure(s.notifQuietTo);
  if (debut === null || fin === null || debut === fin) return false;

  const d = new Date(at);
  const minutes = d.getHours() * 60 + d.getMinutes();
  return debut < fin ? minutes >= debut && minutes < fin : minutes >= debut || minutes < fin;
}

/** Une tâche est-elle accomplie CE JOUR-LÀ ?
 *
 *  Deux régimes, et les confondre notifierait des tâches faites : une tâche
 *  unique porte son accompli dans l'entité (`done`), une tâche récurrente le
 *  porte dans les occurrences — c'est fait pour CE jour, pas pour toujours. */
const tacheFaite = (t: Task, k: string, occurrences: ReadonlySet<string>): boolean =>
  t.recurrence ? occurrences.has(occurrenceKey(t.id, k)) : t.done;

/** Les tâches à honorer un jour donné, récurrences comprises. */
function tachesDuJour(
  tasks: readonly Task[],
  occurrences: ReadonlySet<string>,
  jour: Date,
): Task[] {
  const k = dateKey(jour);
  return tasks.filter((t) => {
    if (tacheFaite(t, k, occurrences)) return false;
    if (t.recurrence) {
      const ancre = parseKey(t.date);
      return ancre ? estOccurrence(t.recurrence, ancre, jour) : false;
    }
    return t.date === k;
  });
}

const workDuJour = (pt: readonly ProjectTask[], k: string): ProjectTask[] =>
  pt.filter((t) => t.deadline === k && t.status !== 'done' && !t.deletedAt);

const objectifsDuJour = (goals: readonly Goal[], k: string): Goal[] =>
  goals.filter((g) => g.deadline === k && !g.deletedAt);

/** Habitudes prévues ce jour-là et pas encore faites — pour le DÉCOMPTE du
 *  récapitulatif seulement. Les rappels d'habitude, eux, restent ceux de
 *  `rappelsRestants()` : ils dépendent des heures posées sur l'habitude, pas
 *  de l'heure du récapitulatif. */
const habitudesDuJour = (habits: readonly Habit[], log: LogIndex, jour: Date, now: Date): Habit[] =>
  habits.filter((h) => !h.archived && isScheduled(h, jour, now) && !isDone(log, h, jour, now));

/** Rappels des SOUS-ÉLÉMENTS d'une entité, pour un jour donné.
 *
 *  Une seule implémentation pour les sous-tâches d'une tâche et les
 *  sous-éléments d'une étape : ils portent le même type (`SousTache`) et
 *  obéissent aux mêmes règles. Deux fonctions jumelles auraient divergé au
 *  premier ajustement, et personne n'aurait su laquelle avait raison.
 *
 *  Quatre refus, tous délibérés : pas de date ou pas d'heure — on n'invente pas
 *  d'échéance pour pouvoir sonner ; déjà fait ; explicitement muet ; parent
 *  muet — taire une tâche doit taire ce qui la compose, sans quoi la couper ne
 *  servirait à rien. */
function rappelsSousElements<T>(
  entites: readonly T[],
  k: string,
  jour: Date,
  source: SourceRappel,
  lire: (e: T) => { id: string; parent: string; sous: readonly SousTache[]; muet: boolean },
): Rappel[] {
  const rappels: Rappel[] = [];

  for (const entite of entites) {
    const { id, parent, sous, muet } = lire(entite);
    if (muet) continue;

    sous.forEach((element, index) => {
      if (element.done || element.notify === false) return;
      if (element.date !== k || !element.time) return;
      const minutes = parseHeure(element.time);
      if (minutes === null) return;

      rappels.push({
        cle: `${source}sub|${id}#${index}|${k}|${element.time}`,
        source,
        id,
        at: jour.getTime() + minutes * 60_000,
        /* Le titre est le libellé du sous-élément, le corps nomme son parent :
           « Prendre la carte vitale » ne dit rien sans « Dentiste ». */
        titre: element.label,
        corpsKey: 'notifBodySub',
        corpsParams: { parent },
      });
    });
  }

  return rappels;
}

/** Tous les rappels à venir, toutes sources, triés par heure.
 *
 *  `horizonJours` vaut 1 (aujourd'hui) par défaut ; le canal natif demande 7.
 *  Rien n'est rendu si l'interrupteur maître est coupé : la garde est ici, une
 *  fois, et non répétée dans chaque canal. */
export function prochainsRappels(
  etat: EtatRappels,
  s: Settings,
  now: Date = today(),
  horizonJours: number = HORIZON_JOURS_DEFAUT,
): Rappel[] {
  if (!s.notifications) return [];

  const rappels: Rappel[] = [];
  const maintenant = now.getTime();

  for (let i = 0; i < Math.max(1, horizonJours); i += 1) {
    const jour = startOfDay(addDays(now, i));
    const k = dateKey(jour);

    if (s.notifHabits) {
      /* Aujourd'hui, on passe l'heure RÉELLE — ce qui est passé ne se rattrape
         pas. Les jours suivants, minuit : leurs rappels sont tous à venir. */
      /* Les habitudes MUETTES sont écartées avant le calcul, pas après : leur
         heure reste enregistrée, elle ne sonne simplement plus. */
      const parlantes = etat.habits.filter((h) => h.notify !== false);
      for (const r of rappelsRestants(parlantes, etat.log, i === 0 ? now : jour)) {
        rappels.push({
          cle: `habit|${r.habitId}|${k}|${r.time}`,
          source: 'habit',
          id: r.habitId,
          at: r.at,
          titre: r.name,
          corpsKey: 'notifBodyHabit',
        });
      }
    }

    if (s.notifTasks) {
      for (const t of tachesDuJour(etat.tasks, etat.occurrences, jour)) {
        /* LE RÉGLAGE DE L'ENTITÉ D'ABORD. Une tâche muette le reste, même si sa
           source est allumée : le réglage le plus proche de l'objet gagne, et
           c'est le seul ordre qui ne surprend personne. */
        if (t.notify === false) continue;

        /* L'HEURE PROPRE N'EST PAS DÉCALÉE DU PRÉAVIS. Quand on écrit « me
           rappeler à 8 h », on veut 8 h — pas 7 h 30. Le préavis est une règle
           par défaut appliquée à l'heure de la tâche ; une heure choisie à la
           main est déjà la réponse. */
        const propre = t.remindAt ? parseHeure(t.remindAt) : null;
        const minutes = propre ?? (t.time ? parseHeure(t.time) : null);
        /* Sans heure, pas de rappel : une tâche « un jour dans la journée » ne
           peut pas sonner sans qu'on invente son heure, et un chiffre inventé
           n'a pas sa place ici (règle 3 du CLAUDE.md). */
        if (minutes === null) continue;

        const preavis = propre === null ? s.notifLead : 0;
        rappels.push({
          cle: `task|${t.id}|${k}|${t.remindAt ?? t.time ?? ''}`,
          source: 'task',
          id: t.id,
          at: jour.getTime() + (minutes - preavis) * 60_000,
          titre: t.name,
          corpsKey: preavis > 0 ? 'notifBodyTaskLead' : 'notifBodyTask',
          corpsParams: { heure: t.time ?? '', minutes: preavis },
        });
      }

      /* SOUS-TÂCHES — elles sonnent SEULES, à leur propre date et à leur propre
         heure : « prendre la carte vitale la veille » n'a de sens que détaché de
         la tâche mère. Sans date ni heure, rien. Elles restent gouvernées par la
         source « tâches », dont elles font partie. */
      for (const r of rappelsSousElements(etat.tasks, k, jour, 'task', (t) => ({
        id: t.id,
        parent: t.name,
        sous: t.subTasks,
        muet: t.notify === false,
      }))) {
        rappels.push(r);
      }
    }

    if (s.notifWork) {
      for (const t of workDuJour(etat.projectTasks, k)) {
        if (t.notify === false) continue;
        /* L'heure propre compte ici plus qu'ailleurs : une échéance ne porte
           AUCUNE heure, et sans ce champ toutes les étapes sonneraient à la
           même minute. */
        const heure = t.remindAt || s.notifDayHour;
        rappels.push({
          cle: `work|${t.id}|${k}|${heure}`,
          source: 'work',
          id: t.id,
          at: heureVersMs(jour, heure, 9 * 60),
          titre: t.name,
          corpsKey: 'notifBodyWork',
        });
      }

      /* Sous-éléments d'étape — mêmes règles que les sous-tâches. */
      for (const r of rappelsSousElements(etat.projectTasks, k, jour, 'work', (t) => ({
        id: t.id,
        parent: t.name,
        sous: t.subItems ?? [],
        muet: t.notify === false || t.status === 'done',
      }))) {
        rappels.push(r);
      }
    }

    if (s.notifGoals) {
      for (const g of objectifsDuJour(etat.goals, k)) {
        if (g.notify === false) continue;
        const heure = g.remindAt || s.notifDayHour;
        rappels.push({
          cle: `goal|${g.id}|${k}|${heure}`,
          source: 'goal',
          id: g.id,
          at: heureVersMs(jour, heure, 9 * 60),
          titre: g.name,
          corpsKey: 'notifBodyGoal',
        });
      }
    }

    if (s.notifDigest) {
      const compte =
        habitudesDuJour(etat.habits, etat.log, jour, i === 0 ? now : jour).length +
        tachesDuJour(etat.tasks, etat.occurrences, jour).length +
        workDuJour(etat.projectTasks, k).length +
        objectifsDuJour(etat.goals, k).length;

      /* RIEN À DIRE, RIEN À SONNER. C'est la règle qui empêche le
         récapitulatif de devenir la notification qu'on apprend à ignorer. */
      if (compte > 0) {
        rappels.push({
          cle: `digest||${k}|${s.notifDigestHour}`,
          source: 'digest',
          id: '',
          at: heureVersMs(jour, s.notifDigestHour, 8 * 60),
          titre: '',
          titreKey: 'notifDigestTitle',
          corpsKey: 'notifDigestBody',
          corpsParams: { compte },
        });
      }
    }
  }

  return rappels
    .filter((r) => r.at > maintenant && !dansLesHeuresSilencieuses(r.at, s))
    .sort((a, b) => a.at - b.at || a.cle.localeCompare(b.cle));
}

/** Identifiant NUMÉRIQUE stable, dérivé de la clé.
 *
 *  Android exige un entier pour reconnaître, remplacer ou annuler une
 *  notification programmée. Le tirer au hasard donnerait un identifiant neuf à
 *  chaque reprogrammation — donc des doublons, et des annulations qui ratent
 *  leur cible. FNV-1a, ramené sur 31 bits : le plugin refuse les négatifs. */
export function identifiantNotification(cle: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < cle.length; i += 1) {
    h ^= cle.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 1 || 1;
}
