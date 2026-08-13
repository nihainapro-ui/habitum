'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { champStyle, Panel, Switch } from '@/components/ui';
import { activeHabits, bestStreakOverall, perfectDays, splitHeuresMinutes } from '@/lib/domain';
import { useFocusMinutes, useSettings, useStore } from '@/lib/store';
import { ViewHeader } from '@/components/shell/view-header';
import { Avatar } from './Avatar';

/* Vue « Profil » — 05-SPEC-VUES.md § 11.

   Les statistiques personnelles sont RÉELLES : elles viennent de `lib/domain`,
   comme partout ailleurs. Le prototype affichait un « indice cognitif » et un
   « niveau » dérivés d'une formule décorative — un chiffre qui ne mesure rien
   n'a pas sa place ici (G3). Les quatre retenus se vérifient. */

const TAILLE_MAX = 2 * 1024 * 1024;

export function ProfileView() {
  const t = useTranslations('app');
  const tp = useTranslations('profile');
  const ts = useTranslations('system');

  const profiles = useStore((s) => s.profiles);
  const activeProfileId = useStore((s) => s.activeProfileId);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const logIndex = useStore((s) => s.logIndex);
  const sessions = useStore((s) => s.sessions);

  const setActiveProfile = useStore((s) => s.setActiveProfile);
  const createProfile = useStore((s) => s.createProfile);
  const updateProfile = useStore((s) => s.updateProfile);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const importJson = useStore((s) => s.importJson);
  const setSetting = useStore((s) => s.setSetting);
  const settings = useSettings();

  const focus = useFocusMinutes(365);
  const fichier = useRef<HTMLInputElement>(null);
  const [nouveau, setNouveau] = useState('');
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [rapport, setRapport] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const actif = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const { h, m } = splitHeuresMinutes(focus);
  const membreDepuis = `${tp('since')} ${actif?.since ?? ''}`;

  const importer = async (f: File) => {
    setRapport(null);
    setErreur(null);
    if (f.size > TAILLE_MAX) {
      setErreur(ts('impTooBig'));
      return;
    }
    try {
      const r = await importJson(await f.text());
      setRapport(t('importDone', { kept: r.kept, read: r.read }));
    } catch {
      setErreur(tp('impErr'));
    }
  };

  const chiffres = [
    { cle: 'hab', libelle: tp('kHab'), valeur: String(activeHabits(habits).length) },
    { cle: 'streak', libelle: tp('kStreak'), valeur: String(bestStreakOverall(logIndex, habits)) },
    {
      cle: 'perf',
      libelle: tp('kPerf'),
      valeur: String(perfectDays(logIndex, habits, tasks, 365)),
    },
    { cle: 'focus', libelle: tp('kFocus'), valeur: `${h} h ${m}` },
    { cle: 'sess', libelle: tp('kSess'), valeur: String(sessions.length) },
  ];

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <ViewHeader titleKey="navProfile" subKey="settingsSub" />

      <Panel title={tp('identity')}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            glyph={actif?.glyph ?? '◉'}
            hue={actif?.hue ?? 188}
            label={tp('avatar')}
            size={64}
          />
          <div className="flex min-w-[220px] flex-1 flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                {tp('name')}
              </span>
              <input
                value={actif?.name ?? ''}
                onChange={(e) => actif && void updateProfile(actif.id, { name: e.target.value })}
                className="rounded-field w-full border outline-none"
                style={champStyle}
              />
            </label>
            <span className="font-mono text-[11px]" style={{ color: 'var(--mut)' }}>
              {membreDepuis}
            </span>
          </div>
        </div>
      </Panel>

      <Panel title={tp('stats')}>
        <dl className="m-0 grid grid-cols-2 gap-3 min-[1060px]:grid-cols-5">
          {chiffres.map((c) => (
            <div
              key={c.cle}
              className="rounded-field border p-3"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
            >
              <dt
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--txt2)' }}
              >
                {c.libelle}
              </dt>
              <dd
                data-testid={`stat-${c.cle}`}
                className="m-0 mt-1 font-mono text-[19px] font-bold"
              >
                {c.valeur}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title={tp('profiles')}>
        <div className="flex flex-col gap-4">
          <ul data-profiles className="m-0 flex list-none flex-col gap-2 p-0">
            {profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <Avatar glyph={p.glyph} hue={p.hue} label={tp('avatar')} size={32} />
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  {p.name || tp('newName')}
                </span>

                {p.id === actif?.id ? (
                  <span className="text-[11.5px]" style={{ color: 'var(--acc2)' }}>
                    {tp('active')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setActiveProfile(p.id)}
                    className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                    style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
                  >
                    {tp('switch')}
                  </button>
                )}

                {profiles.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setASupprimer(p.id)}
                    aria-label={`${tp('del')} ${p.name || tp('newName')}`}
                    className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                    style={{ borderColor: 'var(--line)', color: 'var(--bad)' }}
                  >
                    {tp('del')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {/* D4 — la suppression d'un profil emporte son historique : elle se
              confirme, toujours. */}
          {aSupprimer ? (
            <div
              role="alertdialog"
              aria-label={ts('pDelAsk')}
              className="rounded-field flex flex-wrap items-center gap-2 border p-3"
              style={{ borderColor: 'var(--bad)' }}
            >
              <span className="min-w-0 flex-1 text-[12px]">{ts('pDelAsk')}</span>
              <button
                type="button"
                onClick={() => {
                  void deleteProfile(aSupprimer);
                  setASupprimer(null);
                }}
                className="rounded-btn cursor-pointer border px-3 py-1.5 text-[12px]"
                style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
              >
                {ts('pDelYes')}
              </button>
              <button
                type="button"
                onClick={() => setASupprimer(null)}
                className="rounded-btn cursor-pointer border px-3 py-1.5 text-[12px]"
                style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
              >
                {ts('pDelNo')}
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <input
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              aria-label={t('newProfile')}
              placeholder={t('newProfile')}
              className="rounded-field min-w-0 flex-1 border outline-none"
              style={champStyle}
            />
            <button
              type="button"
              onClick={() => {
                void createProfile(nouveau);
                setNouveau('');
              }}
              className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px]"
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              {tp('add')}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title={tp('prefs')}>
        <div className="flex flex-col gap-4">
          <Switch
            label={tp('cursor')}
            checked={settings.customCursor}
            onChange={(v) => void setSetting('customCursor', v)}
          />

          <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            <input
              ref={fichier}
              type="file"
              accept="application/json"
              className="hidden"
              aria-label={tp('imp')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importer(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fichier.current?.click()}
              className="rounded-btn flex cursor-pointer items-center gap-2 self-start border px-4 py-2 text-[12.5px]"
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              <Upload size={13} aria-hidden="true" />
              {tp('imp')}
            </button>

            {rapport ? (
              <p role="status" className="m-0 text-[12px]" style={{ color: 'var(--acc2)' }}>
                {rapport}
              </p>
            ) : null}
            {erreur ? (
              <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
                {erreur}
              </p>
            ) : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}
