'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { champStyle, Panel, Switch } from '@/components/ui';
/* Importé directement plutôt que par le tonneau `@/components/ui` : le
   périmètre de cette correction n'autorise pas `components/ui/index.ts`. */
import { Select } from '@/components/ui/select';
import { useCurseurPossible } from '@/components/shell/reticle-cursor';
import {
  activeHabits,
  bestStreakOverall,
  perfectDays,
  profilChamps,
  splitHeuresMinutes,
} from '@/lib/domain';
import { ErreurPhoto, reduirePhoto, TYPES_PHOTO_ACCEPTES } from '@/lib/features/profil/photo';
import { useFocusMinutes, useSettings, useStore } from '@/lib/store';
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
  const curseurPossible = useCurseurPossible();
  const fichier = useRef<HTMLInputElement>(null);
  const fichierPhoto = useRef<HTMLInputElement>(null);
  const [nouveau, setNouveau] = useState('');
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [rapport, setRapport] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);

  const actif = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  /* Les trois champs du lot D passent TOUS par là — leur absence n'est défaite
     nulle part ailleurs, pas même « juste pour cet affichage ». */
  const champs = profilChamps(actif);
  const { h, m } = splitHeuresMinutes(focus);
  /* Les six fonctions viennent du catalogue de libellés — un tableau, comme
     dans le prototype : les traduire, ce n’est pas les recopier. */
  const fonctions = tp.raw('roles') as string[];
  const membreDepuis = `${tp('since')} ${actif?.since ?? ''}`;

  /* La réduction est locale et peut échouer de deux façons qui ne se corrigent
     pas pareil : un fichier qui n'est pas une image (l'utilisateur en choisit un
     autre) et un navigateur qui ne sait pas encoder (il n'y peut rien). Le
     message le dit. */
  const choisirPhoto = async (f: File) => {
    setErreurPhoto(null);
    if (!actif) return;
    try {
      await updateProfile(actif.id, { photo: await reduirePhoto(f) });
    } catch (e) {
      setErreurPhoto(
        e instanceof ErreurPhoto && e.genre === 'impossible'
          ? tp('photoErrHeavy')
          : tp('photoErrRead'),
      );
    }
  };

  /* Retirer, c'est écrire une chaîne vide — pas effacer le champ. La
     synchronisation transporte l'entité telle quelle : un champ effacé ne se
     distinguerait pas d'un champ jamais écrit, et l'autre appareil garderait
     la photo. Voir `profilChamps()`. */
  const retirerPhoto = () => {
    setErreurPhoto(null);
    if (actif) void updateProfile(actif.id, { photo: '' });
  };

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
      <Panel title={tp('identity')}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Photo ou avatar génératif — lot D. L'avatar reste le DÉFAUT : il
              se dessine, il ne se télécharge pas, et il ne demande rien à
              personne. La photo est un choix, jamais une case à remplir. */}
          <div className="flex flex-none flex-col items-center gap-2">
            <Avatar
              glyph={actif?.glyph ?? '◉'}
              hue={actif?.hue ?? 188}
              label={tp('avatar')}
              size={64}
              photo={champs.photo}
            />
            <input
              ref={fichierPhoto}
              type="file"
              accept={TYPES_PHOTO_ACCEPTES}
              className="hidden"
              aria-label={tp('photo')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void choisirPhoto(f);
                /* Remis à zéro : sans cela, rechoisir LE MÊME fichier après
                   l'avoir retiré ne déclencherait aucun événement. */
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => fichierPhoto.current?.click()}
                className="rounded-btn flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-[11.5px]"
                style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
              >
                <ImageIcon size={12} aria-hidden="true" />
                {champs.photo ? tp('photoReplace') : tp('photoChange')}
              </button>
              {champs.photo ? (
                <button
                  type="button"
                  onClick={retirerPhoto}
                  aria-label={tp('photoRemove')}
                  className="rounded-btn flex cursor-pointer items-center border px-2.5 py-1.5 text-[11.5px]"
                  style={{ borderColor: 'var(--line)', color: 'var(--bad)' }}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
          {/* 05-SPEC-VUES.md § 11 : nom, IDENTIFIANT, FONCTION, membre depuis.
              Les deux du milieu manquaient — `handle` et `role` existent dans le
              modèle depuis la phase 1, et rien ne les exposait. */}
          <div className="flex min-w-[220px] flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
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

              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                  {tp('handle')}
                </span>
                <input
                  value={actif?.handle ?? ''}
                  onChange={(e) =>
                    actif && void updateProfile(actif.id, { handle: e.target.value })
                  }
                  className="rounded-field w-full border outline-none"
                  style={champStyle}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                {tp('role')}
              </span>
              <Select
                label={tp('role')}
                value={String(actif?.role ?? 0)}
                options={fonctions.map((nom, i) => ({ value: String(i), label: nom }))}
                onChange={(v) => actif && void updateProfile(actif.id, { role: Number(v) })}
              />
            </label>

            {/* Adresse et poste — lot D. Champs LIBRES : rien n'est vérifié,
                rien n'est envoyé, rien n'identifie. La phrase qui suit le dit,
                parce qu'un champ « adresse électronique » dans un produit sans
                compte demande une explication, pas une supposition. */}
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                  {tp('email')}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={champs.email}
                  onChange={(e) => actif && void updateProfile(actif.id, { email: e.target.value })}
                  className="rounded-field w-full border outline-none"
                  style={champStyle}
                />
              </label>

              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
                  {tp('metier')}
                </span>
                <input
                  value={champs.metier}
                  onChange={(e) =>
                    actif && void updateProfile(actif.id, { metier: e.target.value })
                  }
                  className="rounded-field w-full border outline-none"
                  style={champStyle}
                />
              </label>
            </div>

            <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
              {tp('localOnly')}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
              {tp('photoHint')}
            </span>

            {erreurPhoto ? (
              <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
                {erreurPhoto}
              </p>
            ) : null}

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
                <Avatar
                  glyph={p.glyph}
                  hue={p.hue}
                  label={tp('avatar')}
                  size={32}
                  photo={profilChamps(p).photo}
                />
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
          {/* Sur pointeur grossier, la ligne est ABSENTE — pas grisée. Un
              interrupteur désactivé doit dire pourquoi (tâche 5.4) ; un réglage
              qui n'a aucun sens sur l'appareil n'a rien à expliquer, il n'a
              rien à faire là. */}
          {curseurPossible ? (
            <Switch
              label={tp('cursor')}
              reason={tp('cursorHint')}
              checked={settings.customCursor}
              onChange={(v) => void setSetting('customCursor', v)}
            />
          ) : null}

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
