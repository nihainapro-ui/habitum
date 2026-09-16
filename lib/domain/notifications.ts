import { addDays, dateKey, parseKey, startOfDay, today } from './date';
import { isDone } from './metrics';
import { isScheduled } from './schedule';
import { parseHeure, rappelsRestants } from './reminders';
import { rappelCeJour, rappelsEntite, typeRappel } from './rappels';
import { estOccurrence, occurrenceKey } from './recurrence';
import type {
  Goal,
  Habit,
  LogIndex,
  ProjectTask,
  RappelEntite,
  ReglageRappel,
  Settings,
  SousTache,
  Task,
  TypeRappel,
} from './types';

/* ============================================================================
   Rappels — QUOI rappeler, et QUAND. Cinq sources, un seul calcul.

   Spec du 2026-09-07, enrichie le 16 par le TYPE et le CALENDRIER de chaque
   rappel. Ce fichier ne connaît ni le navigateur, ni Android, ni aucune
   langue : il rend une clé de libellé et ses paramètres, et c'est la couche
   d'envoi qui traduit (`lib/features/reminders/`). C'est la règle 2 du
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

   UNE CINQUIÈME depuis le 16 septembre : **une alarme passe outre les heures
   silencieuses**. C'est tout ce qui distingue une alarme d'une notification
   du point de vue du calcul — le reste (son, insistance) est affaire de canal.
   ========================================================================= */

export const SOURCES_RAPPEL = ['habit', 'task', 'work', 'goal', 'digest'] as const;
export type SourceRappel = (typeof SOURCES_RAPPEL)[number];

export interface Rappel {
  /** Identité stable d'un rappel : `source|id|jour|heure|rang`. Elle sert au
   *  dédoublonnage côté minuteries ET à l'identifiant numérique du canal
   *  natif — la même chose reprogrammée doit retomber sur la même clé. */
  cle: string;
  source: SourceRappel;
  /** Identifiant de l'entité concernée. Vide pour le récapitulatif, qui n'en
   *  désigne aucune. */
  id: string;
  /** Instant absolu du déclenchement, en millisecondes. */
  at: number;
  /** Silencieuse, notification ou alarme. */
  type: TypeRappel;
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

/** Une tâche est-elle DUE le jour `d`, et pas encore faite ? C'est la seule
 *  question que le calendrier d'un rappel pose à sa source. */
function tacheDue(t: Task, d: Date, occurrences: ReadonlySet<string>): boolean {
  const k = dateKey(d);
  if (tacheFaite(t, k, occurrences)) return false;
  if (t.recurrence) {
    const ancre = parseKey(t.date);
    return ancre ? estOccurrence(t.recurrence, ancre, d) : false;
  }
  return t.date === k;
}

/** Les tâches à honorer un jour donné, récurrences comprises. */
const tachesDuJour = (tasks: readonly Task[], occurrences: ReadonlySet<string>, jour: Date) =>
  tasks.filter((t) => tacheDue(t, jour, occurrences));

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
        type: 'notif',
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

/** Les rappels PROPRES d'une entité pour le jour `jour`, calendrier appliqué.
 *
 *  Commun aux tâches, étapes et objectifs : pour chacun de ses réglages, on
 *  demande à la source « es-tu due tel jour ? » et le réglage répond s'il sonne
 *  aujourd'hui — le jour même, ou tant de jours avant. Le corps dit dans
 *  combien de jours tombe l'échéance quand ce n'est pas aujourd'hui. */
function rappelsPropres(
  e: RappelEntite & { id: string; name: string },
  source: SourceRappel,
  jour: Date,
  estEcheance: (d: Date) => boolean,
  corpsKey: string,
  corpsParams: Record<string, string | number> = {},
): Rappel[] {
  const k = dateKey(jour);
  const rappels: Rappel[] = [];

  rappelsEntite(e).forEach((r: ReglageRappel, index) => {
    const minutes = parseHeure(r.time);
    if (minutes === null) return;
    if (!rappelCeJour(r, jour, estEcheance)) return;

    /* Dans combien de jours l'échéance tombe-t-elle ? Le plus proche des
       « jours avant » qui correspond à une échéance réelle. */
    const avant = (r.before && r.before.length > 0 ? r.before : [0]).find((n) =>
      estEcheance(addDays(jour, n)),
    );
    const dans = avant ?? 0;

    rappels.push({
      cle: `${source}|${e.id}|${k}|${r.time}|r${index}`,
      source,
      id: e.id,
      at: jour.getTime() + minutes * 60_000,
      type: typeRappel(r),
      titre: e.name,
      corpsKey: dans > 0 ? 'notifBodyBefore' : corpsKey,
      corpsParams: dans > 0 ? { jours: dans } : corpsParams,
    });
  });

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
          cle: `habit|${r.habitId}|${k}|${r.time}|r${r.index}`,
          source: 'habit',
          id: r.habitId,
          at: r.at,
          type: r.type,
          titre: r.name,
          corpsKey: 'notifBodyHabit',
        });
      }
    }

    if (s.notifTasks) {
      for (const t of etat.tasks) {
        /* LE RÉGLAGE DE L'ENTITÉ D'ABORD. Une tâche muette le reste, même si sa
           source est allumée : le réglage le plus proche de l'objet gagne, et
           c'est le seul ordre qui ne surprend personne. */
        if (t.notify === false || t.deletedAt) continue;

        const propres = rappelsEntite(t);
        if (propres.length > 0) {
          /* Ses PROPRES rappels, avec leur calendrier — « la veille à 18 h »
             sonne la veille, même si la tâche n'est due que demain. L'heure
             choisie n'est PAS décalée du préavis : « me rappeler à 8 h » veut
             dire 8 h. */
          rappels.push(
            ...rappelsPropres(
              t,
              'task',
              jour,
              (d) => tacheDue(t, d, etat.occurrences),
              'notifBodyTask',
              { heure: t.time ?? '', minutes: 0 },
            ),
          );
          continue;
        }

        /* Sans rappel propre : la règle générale — l'heure de la tâche moins le
           préavis, le jour même. Sans heure, pas de rappel : une tâche « un jour
           dans la journée » ne peut pas sonner sans qu'on invente son heure, et
           un chiffre inventé n'a pas sa place ici (règle 3 du CLAUDE.md). */
        if (!tacheDue(t, jour, etat.occurrences)) continue;
        const minutes = t.time ? parseHeure(t.time) : null;
        if (minutes === null) continue;
        rappels.push({
          cle: `task|${t.id}|${k}|${t.time ?? ''}`,
          source: 'task',
          id: t.id,
          at: jour.getTime() + (minutes - s.notifLead) * 60_000,
          type: 'notif',
          titre: t.name,
          corpsKey: s.notifLead > 0 ? 'notifBodyTaskLead' : 'notifBodyTask',
          corpsParams: { heure: t.time ?? '', minutes: s.notifLead },
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
      for (const t of etat.projectTasks) {
        if (t.notify === false || t.status === 'done' || t.deletedAt || !t.deadline) continue;
        const echeance = t.deadline;
        const propres = rappelsEntite(t);
        if (propres.length > 0) {
          rappels.push(
            ...rappelsPropres(t, 'work', jour, (d) => dateKey(d) === echeance, 'notifBodyWork'),
          );
          continue;
        }
        if (echeance !== k) continue;
        /* L'heure générale des échéances : une étape n'en porte aucune. */
        rappels.push({
          cle: `work|${t.id}|${k}|${s.notifDayHour}`,
          source: 'work',
          id: t.id,
          at: heureVersMs(jour, s.notifDayHour, 9 * 60),
          type: 'notif',
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
      for (const g of etat.goals) {
        if (g.notify === false || g.deletedAt || !g.deadline) continue;
        const echeance = g.deadline;
        const propres = rappelsEntite(g);
        if (propres.length > 0) {
          rappels.push(
            ...rappelsPropres(g, 'goal', jour, (d) => dateKey(d) === echeance, 'notifBodyGoal'),
          );
          continue;
        }
        if (echeance !== k) continue;
        rappels.push({
          cle: `goal|${g.id}|${k}|${s.notifDayHour}`,
          source: 'goal',
          id: g.id,
          at: heureVersMs(jour, s.notifDayHour, 9 * 60),
          type: 'notif',
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
          type: 'notif',
          titre: '',
          titreKey: 'notifDigestTitle',
          corpsKey: 'notifDigestBody',
          corpsParams: { compte },
        });
      }
    }
  }

  return (
    rappels
      /* Une ALARME passe outre les heures silencieuses : c'est le sens même du
         mot. Tout le reste s'y plie. */
      .filter(
        (r) => r.at > maintenant && (r.type === 'alarm' || !dansLesHeuresSilencieuses(r.at, s)),
      )
      .sort((a, b) => a.at - b.at || a.cle.localeCompare(b.cle))
  );
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
