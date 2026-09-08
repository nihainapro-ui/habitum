'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { TextInput } from './fields';

/* Rappel PROPRE à une entité — spec du 2026-09-07.
 *
 * Un composant, quatre éditeurs. Écrit une fois parce que les quatre posent
 * exactement la même question, et qu'une copie par éditeur aurait divergé au
 * premier ajustement — le libellé d'un côté, la règle de l'autre.
 *
 * L'HEURE VIDE N'EST PAS UNE ABSENCE DE RÉGLAGE, c'est le réglage par défaut :
 * l'entité suit les réglages généraux. Le champ le dit sous lui, parce qu'un
 * champ d'heure vide dans un formulaire se lit spontanément comme un oubli.
 *
 * Le champ d'heure DISPARAÎT quand le rappel est coupé : demander à quelle
 * heure ne pas sonner n'a pas de sens. */

export function RappelChamps({
  notify,
  remindAt,
  onNotify,
  onRemindAt,
  /** Ce que l'heure vide veut dire ICI — l'heure de la tâche moins le préavis,
   *  ou l'heure générale des échéances. Les deux ne se disent pas pareil. */
  aide,
}: {
  notify: boolean;
  remindAt: string;
  onNotify: (v: boolean) => void;
  onRemindAt: (v: string) => void;
  aide: string;
}) {
  const t = useTranslations('editor');

  return (
    <div className="flex flex-col gap-2">
      <Switch label={t('fNotify')} checked={notify} onChange={onNotify} />

      {notify ? (
        <>
          <TextInput label={t('fRemindAt')} type="time" value={remindAt} onChange={onRemindAt} />
          <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {aide}
          </span>
        </>
      ) : null}
    </div>
  );
}
