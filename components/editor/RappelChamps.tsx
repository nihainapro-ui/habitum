'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlarmClock, Bell, BellOff, Pencil, Plus, X } from 'lucide-react';
import { Switch } from '@/components/ui';
import { typeRappel, type ReglageRappel, type TypeRappel } from '@/lib/domain';
import { RappelDialog, type CalendrierRappel } from './RappelDialog';

/* Rappels PROPRES à une entité — spec du 2026-09-07, refondue le 16.
 *
 * Un composant, quatre éditeurs. Écrit une fois parce que les quatre posent
 * exactement la même question, et qu'une copie par éditeur aurait divergé au
 * premier ajustement — le libellé d'un côté, la règle de l'autre.
 *
 * Il tient l'interrupteur « me rappeler », la LISTE des rappels — chacun avec
 * son heure, son type et son calendrier — et ouvre le dialogue qui en règle un.
 * La liste vide n'est pas une absence de réglage : c'est « je suis les
 * réglages généraux », et la ligne d'aide le dit sous elle, parce qu'une liste
 * vide dans un formulaire se lit spontanément comme un oubli.
 *
 * La liste DISPARAÎT quand le rappel est coupé : régler l'heure de ce qui ne
 * sonnera pas n'a pas de sens. */

const ICONES: Record<TypeRappel, typeof Bell> = { silent: BellOff, notif: Bell, alarm: AlarmClock };

export function RappelChamps({
  notify,
  rappels,
  onNotify,
  onRappels,
  calendriers,
  /** Ce que la liste vide veut dire ICI — l'heure de la tâche moins le
   *  préavis, ou l'heure générale des échéances. Les deux ne se disent pas
   *  pareil. Vide pour une habitude, qui n'a pas de règle générale. */
  aide,
}: {
  notify: boolean;
  rappels: readonly ReglageRappel[];
  onNotify: (v: boolean) => void;
  onRappels: (v: ReglageRappel[]) => void;
  calendriers: readonly CalendrierRappel[];
  aide?: string;
}) {
  const t = useTranslations('editor');
  /* `null` = fermé ; `-1` = nouveau ; sinon l'indice du rappel modifié. */
  const [ouvert, setOuvert] = useState<number | null>(null);

  const resume = (r: ReglageRappel): string => {
    if (r.days && r.days.length > 0) return t('remSumDays', { n: r.days.length });
    if (r.before && r.before.length > 0) return t('remSumBefore', { liste: r.before.join(', ') });
    return t('remAlways');
  };

  return (
    <div className="flex flex-col gap-2" data-rappels>
      <Switch label={t('fNotify')} checked={notify} onChange={onNotify} />

      {notify ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {rappels.map((r, i) => {
              const Icone = ICONES[typeRappel(r)];
              return (
                <li
                  key={`${r.time}-${i}`}
                  className="rounded-field flex items-center gap-2 border px-3 py-2"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                >
                  <Icone size={14} aria-hidden="true" style={{ color: 'var(--acc2)' }} />
                  <span className="font-mono text-[13px]">{r.time}</span>
                  <span
                    className="min-w-0 flex-1 truncate text-[11.5px]"
                    style={{ color: 'var(--txt2)' }}
                  >
                    {t(`remType_${typeRappel(r)}`)}
                    {' · '}
                    {resume(r)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOuvert(i)}
                    aria-label={`${t('remEdit')} ${i + 1}`}
                    className="rounded-btn-sm grid h-8 w-8 flex-none cursor-pointer place-items-center border"
                    style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRappels(rappels.filter((_, j) => j !== i))}
                    aria-label={`${t('remDelete')} ${i + 1}`}
                    className="rounded-btn-sm grid h-8 w-8 flex-none cursor-pointer place-items-center border"
                    style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setOuvert(-1)}
            className="rounded-btn flex cursor-pointer items-center gap-2 self-start border px-3 py-1.5 text-[12px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            <Plus size={12} aria-hidden="true" />
            {t('addRem')}
          </button>

          {rappels.length === 0 && aide ? (
            <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
              {aide}
            </span>
          ) : null}
        </>
      ) : null}

      <RappelDialog
        open={ouvert !== null}
        initial={ouvert !== null && ouvert >= 0 ? (rappels[ouvert] ?? null) : null}
        calendriers={calendriers}
        onClose={() => setOuvert(null)}
        onSave={(r) =>
          onRappels(
            ouvert !== null && ouvert >= 0
              ? rappels.map((x, j) => (j === ouvert ? r : x))
              : [...rappels, r],
          )
        }
      />
    </div>
  );
}
