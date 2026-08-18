'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Panel, Segmented, Switch } from '@/components/ui';
import type { WeekStart } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import { clearErrorLog, readErrorLog, type ErreurJournalisee } from '@/lib/logger';
import { ViewHeader } from '@/components/shell/view-header';
import { FeedbackSettings } from './FeedbackSettings';
import { NotificationSetting } from './NotificationSetting';
import { DataSection } from './DataSection';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { AboutPanel } from './AboutPanel';

/* Vue « Paramètres » — 05-SPEC-VUES.md § 12.

   Deux corrections de fond par rapport au prototype :

   1. **`cloud` n'existe plus** (T4.4). Le réglage ne gouvernait aucun nuage :
      il décrivait la persistance locale. Ce n'est d'ailleurs pas un
      interrupteur mais un ÉTAT — désactiver l'enregistrement local reviendrait
      à proposer de perdre ses données. La ligne dit donc où vivent les
      données, elle ne prétend pas les déplacer.
   2. **Les interrupteurs non branchés sont désactivés et disent pourquoi.**
      `notif`, `sound` et `vibrate` attendent le plan 6 ; un interrupteur qui
      s'allume sans rien déclencher est un mensonge d'interface. */

export function SettingsView() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const settings = useSettings();
  const setSetting = useStore((s) => s.setSetting);
  const resetAccount = useStore((s) => s.resetAccount);

  const [confirme, setConfirme] = useState(false);

  /* Journal d'erreurs LOCAL (tâche 5.1, décision E). Il est lu ici et nulle
     part ailleurs : c'est le seul endroit où l'utilisateur peut voir ce que
     l'application a attrapé, et le seul d'où il peut l'effacer. */
  const [erreurs, setErreurs] = useState<ErreurJournalisee[]>([]);
  useEffect(() => {
    void readErrorLog().then(setErreurs);
  }, []);

  /* Composé hors du JSX, que `jsx-no-literals` garde libre de tout gabarit. */
  const origine = (e: ErreurJournalisee) => `${e.at} · ${e.where}`;

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <ViewHeader titleKey="navSettings" subKey="settingsSub" />

      <Panel title={t('appearanceSec')}>
        <div className="flex flex-col gap-5">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
              {t('weekStart')}
            </span>
            <Segmented<WeekStart>
              label={t('weekStart')}
              value={settings.weekStart}
              onChange={(v) => void setSetting('weekStart', v)}
              options={[
                { value: 'mon', label: t('weekMon') },
                { value: 'sun', label: t('weekSun') },
              ]}
            />
          </div>
        </div>
      </Panel>

      <Panel title={t('notifications')}>
        <div className="flex flex-col">
          <NotificationSetting />
          <FeedbackSettings />
          <Switch
            label={t('confettiLbl')}
            checked={settings.confetti}
            onChange={(v) => void setSetting('confetti', v)}
          />
        </div>
      </Panel>

      <Panel title={t('dataSec')}>
        <div className="flex flex-col gap-4">
          <DataSection />

          <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            <span className="text-[13px]">{t('resetT')}</span>
            <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
              {t('resetD')}
            </span>

            {/* Confirmation en DEUX TEMPS : le premier bouton n'efface rien,
                il ne fait qu'ouvrir la question. */}
            {confirme ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void resetAccount();
                    setConfirme(false);
                  }}
                  className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px]"
                  style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
                >
                  {t('resetYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirme(false)}
                  className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px]"
                  style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
                >
                  {ts('pDelNo')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirme(true)}
                className="rounded-btn cursor-pointer self-start border px-4 py-2 text-[12.5px]"
                style={{ borderColor: 'var(--line)', color: 'var(--bad)' }}
              >
                {t('reset')}
              </button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title={ts('errLogT')}>
        <div className="flex flex-col gap-3">
          <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
            {ts('errLogHint')}
          </span>

          {erreurs.length === 0 ? (
            <span
              data-testid="empty-state"
              className="text-[12.5px]"
              style={{ color: 'var(--mut)' }}
            >
              {ts('errLogEmpty')}
            </span>
          ) : (
            <>
              <ul data-error-log className="m-0 flex list-none flex-col gap-2 p-0">
                {erreurs.map((e) => (
                  <li key={`${e.at}-${e.message}`} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
                      {origine(e)}
                    </span>
                    <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                      {e.message}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  void clearErrorLog().then(() => setErreurs([]));
                }}
                className="rounded-btn cursor-pointer self-start border px-4 py-2 text-[12.5px]"
                style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
              >
                {ts('errLogClear')}
              </button>
            </>
          )}
        </div>
      </Panel>

      {/* Tâche 8.8 — remplace un panneau qui affichait « Habitum 2.4 · Web »,
          une chaîne écrite en dur, jamais mise à jour, et FAUSSE : le dépôt en
          est à la version de `package.json`. Un numéro de version inventé est
          un chiffre fabriqué au sens de CLAUDE.md § 3, et il est pire qu'absent
          — il fait diagnostiquer la mauvaise version. */}
      <AboutPanel />
    </div>
  );
}
