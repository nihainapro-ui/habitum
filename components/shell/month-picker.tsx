'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dateKey, daysBetween, monthGrid, startOfWeek, today } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { Dialog } from '@/components/ui';

/* Le calendrier mensuel de l'en-tête — spec du 2026-09-02, lot C.

   IL N'AFFICHE AUCUNE PASTILLE D'ACTIVITÉ, et c'est une décision : les
   calculer demanderait l'état de chaque jour du mois à l'ouverture, alors que
   ce que l'utilisateur vient chercher ici est la NAVIGATION — « aller voir un
   autre jour, vite ». À réévaluer sur usage, pas avant.

   AUCUN CALCUL DE GRILLE N'EST ÉCRIT ICI. `monthGrid()` vit dans
   `lib/domain/calendar.ts` avec ses tests (42 cases toujours, premier jour selon
   la préférence de début de semaine) — la vue ne fait que dessiner ce qu'elle
   rend. C'est la règle 2 du CLAUDE.md, et c'est aussi ce qui fait que la grille
   du dialogue et celle de la vue Calendrier ne peuvent pas diverger.

   Le dialogue vient du système visuel (`components/ui/dialog.tsx`, Radix) :
   fermeture par Échap, piège de focus et retour du focus au déclencheur sont
   fournis, pas réécrits. */

export function MonthPicker({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();

  /* L'état vit ICI et non dans l'en-tête : le dialogue est le seul à en avoir
     besoin, et le garder auprès de son déclencheur laisse Radix apparier les
     deux — c'est ce qui rend le focus au bouton après Échap, sans une ligne de
     code de notre part. */
  const [ouvert, setOuvert] = useState(false);
  const [offset, setOffset] = useState(0);
  const router = useRouter();
  const setDay = useStore((s) => s.setDay);
  const jour = useStore((s) => s.ui.day);

  /* `ui.day` est un DÉCALAGE EN JOURS, pas une date — c'est le choix du
     prototype (`state.day`), et il garde la vue juste au passage de minuit :
     une date figée deviendrait « hier » sans que rien ne bouge à l'écran.
     `daysBetween` vit dans le domaine ; le décalage ne se recalcule pas ici. */
  const choisir = (date: Date) => {
    setDay(daysBetween(date, today()));
    setOuvert(false);
    router.push('/app/today');
  };

  /* Le jour actuellement affiché par le produit — pas forcément aujourd'hui —
     et sa clé, pour distinguer sa case de celle du jour courant dans la
     grille (constat 5 de la revue finale). */
  const jourAffiche = useMemo(() => addDays(today(), jour), [jour]);
  const jourAfficheKey = useMemo(() => dateKey(jourAffiche), [jourAffiche]);

  /* Écart en mois entre le jour affiché et aujourd'hui, pour ouvrir le
     dialogue sur SON mois plutôt que sur le mois courant. Ni `date.ts` ni
     `calendar.ts` n'exposent cet écart : `recurrence.ts` a une version privée
     (`moisEntre`) mais elle ne sert que sa propre règle de récurrence, non
     exportée, et de portée différente. Deux entiers soustraits ne justifient
     pas de faire descendre trois lignes de plus dans le domaine. */
  const decalageMois = useMemo(
    () =>
      (jourAffiche.getFullYear() - today().getFullYear()) * 12 +
      (jourAffiche.getMonth() - today().getMonth()),
    [jourAffiche],
  );

  /* À CHAQUE OUVERTURE, la grille se replace sur le mois du jour affiché — pas
     sur le mois courant figé à `0`. Sans cela, `offset` gardait aussi la
     valeur laissée par la navigation précédente : Échap en juillet, puis
     rouvrir, montrait encore juillet plutôt que le mois du jour affiché. */
  const gererOuverture = (v: boolean) => {
    setOuvert(v);
    if (v) setOffset(decalageMois);
  };

  const cases = useMemo(() => monthGrid(offset, weekStart), [offset, weekStart]);

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const debut = startOfWeek(today(), weekStart);
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(debut, i)));
  }, [locale, weekStart]);

  const titreMois = useMemo(() => {
    /* Le mois affiché se LIT dans la grille plutôt que de se recalculer :
       toute case `inMonth` appartient par construction au mois demandé.
       Refaire ici l'ancrage de `monthGrid` (`new Date(y, m + offset, 1)`)
       ferait vivre la même formule à deux endroits, et le titre pourrait un
       jour désigner un autre mois que la grille sous les yeux du lecteur. */
    const ancre = cases.find((c) => c.inMonth) ?? cases[0];
    return ancre
      ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(ancre.date)
      : '';
  }, [cases, locale]);

  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  const nav = 'grid h-[30px] w-[30px] place-items-center rounded-btn-sm border cursor-pointer';

  return (
    <Dialog
      open={ouvert}
      onOpenChange={gererOuverture}
      title={t('pickDay')}
      description={t('pickDayHint')}
      trigger={trigger}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            aria-label={t('prevPeriod')}
            className={nav}
            style={{
              borderColor: 'var(--line)',
              background: 'var(--panel2)',
              color: 'var(--txt2)',
            }}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>

          {/* Le mois occupe le centre et peut céder : c'est le seul élément de
              la rangée dont la largeur dépend de la langue (« septembre 2026 »
              contre « May 2026 »). `aria-live` annonce le changement : sans
              lui, cliquer ← ou → laisse le focus sur la flèche et un lecteur
              d'écran n'apprend jamais que la grille a changé de mois
              (constat 4 de la revue finale). */}
          <span
            aria-live="polite"
            className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold"
          >
            {titreMois}
          </span>

          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            aria-label={t('nextPeriod')}
            className={nav}
            style={{
              borderColor: 'var(--line)',
              background: 'var(--panel2)',
              color: 'var(--txt2)',
            }}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setOffset(0)}
            className="rounded-btn-sm flex-none cursor-pointer border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase"
            style={{
              borderColor: offset === 0 ? 'var(--line2)' : 'var(--line)',
              background: 'var(--panel2)',
              color: offset === 0 ? 'var(--txt)' : 'var(--txt2)',
            }}
          >
            {t('calToday')}
          </button>
        </div>

        <div className="grid grid-cols-7">
          {nomsJours.map((nom) => (
            <span
              key={nom}
              className="px-1 py-1 text-center font-mono text-[9px] tracking-[0.12em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {nom}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cases.map((c) => {
            /* Le jour COURANT (aujourd'hui) et le jour SÉLECTIONNÉ (celui que
               le produit affiche, `ui.day`) sont deux choses différentes dès
               que l'un des deux quitte le mois de l'autre — les confondre a
               longtemps caché que l'ouverture ignorait `ui.day` (constat 5).
               Aujourd'hui garde sa case pleine (`isToday`) même quand il n'est
               pas sélectionné ; le jour sélectionné, quand ce n'est pas le
               même, reçoit une bordure pleine distincte plutôt qu'un fond, en
               jetons de thème — jamais une couleur en dur, ce serait illisible
               dans `clinical`. */
            const estSelectionne = !c.isToday && c.key === jourAfficheKey;
            return (
              <button
                key={c.key}
                type="button"
                data-jour={c.key}
                onClick={() => choisir(c.date)}
                /* Le nom accessible est la date LONGUE, pas le seul quantième :
                   « 6 » quarante-deux fois ne désigne rien à l'oreille. */
                aria-label={jourLong.format(c.date)}
                aria-current={c.isToday ? 'date' : undefined}
                className="rounded-btn-sm grid h-8 cursor-pointer place-items-center border text-[12px]"
                style={{
                  borderColor: c.isToday
                    ? 'var(--acc2)'
                    : estSelectionne
                      ? 'var(--acc)'
                      : 'transparent',
                  borderWidth: estSelectionne ? '2px' : '1px',
                  background: c.isToday ? 'rgba(var(--glow),.18)' : 'transparent',
                  /* Les jours des mois voisins complètent la grille sans se faire
                     passer pour le mois affiché. Ils restent CLIQUABLES : refuser
                     le 31 juillet depuis la grille d'août serait un cul-de-sac. */
                  color: c.inMonth ? 'var(--txt)' : 'var(--mut)',
                }}
              >
                {c.date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
