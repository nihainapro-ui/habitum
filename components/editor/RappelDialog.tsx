'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlarmClock, Bell, BellOff } from 'lucide-react';
import { Dialog } from '@/components/ui';
import {
  addDays,
  startOfWeek,
  today,
  TYPES_RAPPEL,
  typeRappel,
  type ReglageRappel,
  type TypeRappel,
} from '@/lib/domain';
import { DayPicker, TextInput } from './fields';

/* Dialogue d'UN rappel — heure, type, calendrier. Spec du 2026-09-16.
 *
 * Un seul dialogue pour les quatre éditeurs. Ce qui change d'une entité à
 * l'autre, c'est le CALENDRIER qu'on lui propose : « certains jours de la
 * semaine » a un sens pour ce qui revient (habitude, tâche récurrente),
 * « jours avant » pour ce qui a une échéance (tâche datée, étape, objectif).
 * L'appelant dit lesquels ; le dialogue ne devine pas.
 *
 * Le type est un `Segmented` à trois positions avec icône — le dessin de
 * l'application dont l'utilisateur a montré la capture, et surtout un groupe
 * radio annoncé comme tel. Le calendrier est une liste de boutons radio
 * natifs : trois lignes verticales, un seul choix, lisible d'un coup. */

export type CalendrierRappel = 'days' | 'before';

/** Les « jours avant » proposés. 0 = le jour même, 1 = la veille. Sept
 *  suffit : au-delà, ce n'est plus un rappel, c'est un plan. */
const JOURS_AVANT = [0, 1, 2, 3, 7] as const;

const ICONES: Record<TypeRappel, typeof Bell> = { silent: BellOff, notif: Bell, alarm: AlarmClock };

export function RappelDialog({
  open,
  initial,
  calendriers,
  onClose,
  onSave,
}: {
  open: boolean;
  /** `null` = nouveau rappel. */
  initial: ReglageRappel | null;
  calendriers: readonly CalendrierRappel[];
  onClose: () => void;
  onSave: (r: ReglageRappel) => void;
}) {
  const t = useTranslations('editor');
  const locale = useLocale();

  const [time, setTime] = useState('12:00');
  const [type, setType] = useState<TypeRappel>('notif');
  const [mode, setMode] = useState<'always' | CalendrierRappel>('always');
  const [days, setDays] = useState<number[]>([]);
  const [before, setBefore] = useState<number[]>([1]);

  /* Rechargé à CHAQUE ouverture : le dialogue sert à tous les rappels de
     l'éditeur, l'état du précédent ne doit pas déteindre sur le suivant. */
  useEffect(() => {
    if (!open) return;
    setTime(initial?.time ?? '12:00');
    setType(initial ? typeRappel(initial) : 'notif');
    setDays(initial?.days ?? []);
    setBefore(initial?.before && initial.before.length > 0 ? initial.before : [1]);
    setMode(
      initial?.days && initial.days.length > 0
        ? 'days'
        : initial?.before && initial.before.length > 0
          ? 'before'
          : 'always',
    );
  }, [open, initial]);

  /* Noms courts des jours, lundi en tête — la convention de `Habit.days`. */
  const nomsJours = useMemo(() => {
    const lundi = startOfWeek(today(), 'mon');
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(lundi, i)));
  }, [locale]);

  const libelleAvant = (n: number): string =>
    n === 0 ? t('remSameDay') : n === 1 ? t('remEve') : t('remNDays', { n });

  const confirmer = () => {
    onSave({
      time,
      type,
      ...(mode === 'days' ? { days } : {}),
      ...(mode === 'before' ? { before } : {}),
    });
    onClose();
  };

  const radio = (valeur: 'always' | CalendrierRappel, libelle: string) => (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[13px]">
      <input
        type="radio"
        name="calendrier-rappel"
        value={valeur}
        checked={mode === valeur}
        onChange={() => setMode(valeur)}
        className="h-4 w-4"
        style={{ accentColor: 'var(--acc2)' }}
      />
      {libelle}
    </label>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={initial ? t('remEdit') : t('remDialogNew')}
      description={t('remDialogD')}
    >
      <div className="flex flex-col gap-4" data-rappel-dialog>
        <TextInput label={t('fRemindAt')} type="time" value={time} onChange={setTime} />

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 p-0 text-[12px]" style={{ color: 'var(--txt2)' }}>
            {t('remType')}
          </legend>
          <div role="radiogroup" aria-label={t('remType')} className="grid grid-cols-3 gap-1.5">
            {TYPES_RAPPEL.map((valeur) => {
              const Icone = ICONES[valeur];
              const actif = valeur === type;
              return (
                <button
                  key={valeur}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setType(valeur)}
                  className="rounded-btn flex cursor-pointer flex-col items-center gap-1.5 border px-2 py-3 text-[12px]"
                  style={{
                    borderColor: actif ? 'var(--acc2)' : 'var(--line)',
                    background: actif ? 'var(--panel2)' : 'transparent',
                    color: actif ? 'var(--acc2)' : 'var(--txt2)',
                  }}
                >
                  <Icone size={18} aria-hidden="true" />
                  {t(`remType_${valeur}`)}
                </button>
              );
            })}
          </div>
          {type === 'alarm' ? (
            <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
              {t('remAlarmHint')}
            </span>
          ) : null}
        </fieldset>

        <fieldset className="m-0 flex flex-col border-0 p-0">
          <legend className="mb-1 p-0 text-[12px]" style={{ color: 'var(--txt2)' }}>
            {t('remCal')}
          </legend>
          {radio('always', t('remAlways'))}
          {calendriers.includes('days') ? radio('days', t('remDays')) : null}
          {calendriers.includes('before') ? radio('before', t('remBefore')) : null}

          {mode === 'days' ? (
            <div className="pt-2">
              <DayPicker label={t('remDays')} value={days} names={nomsJours} onChange={setDays} />
            </div>
          ) : null}

          {mode === 'before' ? (
            <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label={t('remBefore')}>
              {JOURS_AVANT.map((n) => {
                const actif = before.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    role="checkbox"
                    aria-checked={actif}
                    onClick={() =>
                      setBefore(
                        actif
                          ? before.filter((x) => x !== n)
                          : [...before, n].sort((a, b) => b - a),
                      )
                    }
                    className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                    style={{
                      borderColor: actif ? 'var(--acc2)' : 'var(--line)',
                      background: actif ? 'var(--panel2)' : 'transparent',
                      color: actif ? 'var(--txt)' : 'var(--txt2)',
                    }}
                  >
                    {libelleAvant(n)}
                  </button>
                );
              })}
            </div>
          ) : null}
        </fieldset>

        <div
          className="flex justify-end gap-2 border-t pt-3"
          style={{ borderColor: 'var(--line)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {t('remCancel')}
          </button>
          <button
            type="button"
            onClick={confirmer}
            /* Un calendrier vide n'est pas un calendrier : « certains jours »
               sans aucun jour, ou « jours avant » sans aucun, ne sonnerait
               jamais sans le dire. On refuse de confirmer plutôt que d'écrire
               un rappel muet. */
            disabled={
              (mode === 'days' && days.length === 0) || (mode === 'before' && before.length === 0)
            }
            className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            style={{ borderColor: 'var(--acc)', color: 'var(--acc)' }}
          >
            {t('remConfirm')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
