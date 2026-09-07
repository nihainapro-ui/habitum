'use client';

import { useTranslations } from 'next-intl';
import { champStyle, Switch } from '@/components/ui';
/* Importé directement plutôt que par le tonneau `@/components/ui`, comme dans
   `ProfileView` : `components/ui/index.ts` ne l'expose pas. */
import { Select } from '@/components/ui/select';
import { PREAVIS_NOTIF, type PreavisNotif } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';

/* Réglages fins des rappels — spec du 2026-09-07.
 *
 * MONTÉ SEULEMENT QUAND L'INTERRUPTEUR MAÎTRE EST ALLUMÉ (voir
 * `NotificationSetting`). Douze lignes de réglage au-dessus d'une permission
 * jamais demandée ne servent personne : elles donnent à croire que quelque
 * chose est armé, et elles noient le seul geste qui compte — dire oui une
 * première fois.
 *
 * Aucun calcul ici : ce composant écrit des réglages, et c'est
 * `lib/domain/notifications.ts` qui en tire les conséquences. */

/** Champ d'heure. `type="time"` plutôt qu'un menu de 96 entrées : le clavier
 *  du téléphone sait déjà saisir une heure, et il la sait mieux que nous. */
function ChampHeure({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3 py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--txt)' }}>
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-field border outline-none"
        style={{ ...champStyle, width: 'auto' }}
      />
    </label>
  );
}

export function NotificationDetails() {
  const ts = useTranslations('system');
  const s = useSettings();
  const setSetting = useStore((x) => x.setSetting);

  /* Les libellés du préavis sont dérivés de `PREAVIS_NOTIF`, jamais recopiés :
     une liste écrite deux fois finit par proposer une valeur que le calcul ne
     connaît pas (piège n°1 du CLAUDE.md, sous sa forme la plus banale). */
  const preavis = PREAVIS_NOTIF.map((m) => ({
    value: String(m),
    label: ts(`notifLead${m}`),
  }));

  const ligne = 'flex flex-col gap-2 border-t pt-3';

  return (
    /* LES 3 PX DU BOUTON-INTERRUPTEUR, absorbés ici. Le rail porte une marge
       négative de 3 px (`components/ui/Switch.tsx`) : ailleurs dans le produit,
       elle tombe dans le rembourrage du panneau. Ce bloc ajoute un niveau
       d'imbrication de plus, au-delà de ce que l'exclusion du filet de mesure
       couvre — le débordement remontait donc jusqu'ici, mesuré et bien réel.
       Trois pixels de rembourrage le reçoivent, comme le panneau reçoit les
       autres. */
    <div className="flex flex-col gap-3 px-[3px]" data-notif-details>
      <div className={ligne} style={{ borderColor: 'var(--line)' }}>
        <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
          {ts('notifSrcT')}
        </span>
        <Switch
          label={ts('notifSrcHabits')}
          checked={s.notifHabits}
          onChange={(v) => void setSetting('notifHabits', v)}
        />
        <Switch
          label={ts('notifSrcTasks')}
          checked={s.notifTasks}
          onChange={(v) => void setSetting('notifTasks', v)}
        />
        <Switch
          label={ts('notifSrcWork')}
          checked={s.notifWork}
          onChange={(v) => void setSetting('notifWork', v)}
        />
        <Switch
          label={ts('notifSrcGoals')}
          checked={s.notifGoals}
          onChange={(v) => void setSetting('notifGoals', v)}
        />
      </div>

      <div className={ligne} style={{ borderColor: 'var(--line)' }}>
        <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
          {ts('notifLeadT')}
        </span>
        {/* Un menu déroulant et non un `Segmented` : quatre libellés en toutes
            lettres — « 30 minutes avant » — poussent la rangée bien au-delà de
            390 px, et un réglage qu'on ne peut pas atteindre au doigt n'est pas
            un réglage. Le menu déroulant du système visuel ne prend, lui, que
            la largeur d'une ligne. */}
        <Select
          label={ts('notifLeadT')}
          value={String(s.notifLead)}
          options={preavis}
          onChange={(v) => void setSetting('notifLead', Number(v) as PreavisNotif)}
        />
      </div>

      <div className={ligne} style={{ borderColor: 'var(--line)' }}>
        <ChampHeure
          label={ts('notifDayHourT')}
          value={s.notifDayHour}
          onChange={(v) => void setSetting('notifDayHour', v)}
        />
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {ts('notifDayHourD')}
        </span>
      </div>

      <div className={ligne} style={{ borderColor: 'var(--line)' }}>
        <Switch
          label={ts('notifDigestT')}
          reason={ts('notifDigestD')}
          checked={s.notifDigest}
          onChange={(v) => void setSetting('notifDigest', v)}
        />
        {s.notifDigest ? (
          <ChampHeure
            label={ts('notifDigestHourT')}
            value={s.notifDigestHour}
            onChange={(v) => void setSetting('notifDigestHour', v)}
          />
        ) : null}
      </div>

      <div className={ligne} style={{ borderColor: 'var(--line)' }}>
        <Switch
          label={ts('notifQuietT')}
          reason={ts('notifQuietD')}
          checked={s.notifQuiet}
          onChange={(v) => void setSetting('notifQuiet', v)}
        />
        {s.notifQuiet ? (
          <>
            <ChampHeure
              label={ts('notifQuietFromT')}
              value={s.notifQuietFrom}
              onChange={(v) => void setSetting('notifQuietFrom', v)}
            />
            <ChampHeure
              label={ts('notifQuietToT')}
              value={s.notifQuietTo}
              onChange={(v) => void setSetting('notifQuietTo', v)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
