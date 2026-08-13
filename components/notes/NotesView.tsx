'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { champStyle, Panel } from '@/components/ui';
import { dateKey, today, type Note } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { ViewHeader } from '@/components/shell/view-header';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { MoodPicker } from './MoodPicker';

/* Vue « Notes » — 05-SPEC-VUES.md § 10.

   G3, verrouillé au lot 2 du prototype : `journalSeed()` fabriquait un texte
   pour les jours sans entrée. Un jour sans note est VIDE, et l'historique ne
   liste que ce que l'utilisateur a réellement écrit. */

/** Délai avant enregistrement automatique du journal. Assez court pour qu'on
 *  ne perde rien en quittant la vue, assez long pour ne pas écrire à chaque
 *  frappe. */
const DELAI_SAUVEGARDE = 600;

export function NotesView() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const { locale } = useLocaleSwitcher();

  const notes = useStore((s) => s.notes);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);
  const saveJournal = useStore((s) => s.saveJournal);

  const jour = dateKey(today());
  const journal = notes.find((n) => n.kind === 'journal' && n.date === jour);

  const [texte, setTexte] = useState('');
  const [recherche, setRecherche] = useState('');
  const [enregistre, setEnregistre] = useState(false);
  /* Tant que l'utilisateur n'a rien tapé, la zone SUIT la note en base :
     l'hydratation arrive après le premier rendu, et sans cela une entrée
     existante resterait invisible. Dès la première frappe, c'est l'inverse —
     une écriture venue du store ne doit plus écraser ce qu'on est en train
     d'écrire. */
  const [modifie, setModifie] = useState(false);

  useEffect(() => {
    if (!modifie) setTexte(journal?.body ?? '');
  }, [journal?.body, modifie]);

  useEffect(() => {
    if (!modifie) return;
    const minuterie = setTimeout(() => {
      void saveJournal(jour, texte, journal?.mood);
      setEnregistre(true);
    }, DELAI_SAUVEGARDE);
    return () => clearTimeout(minuterie);
  }, [texte, modifie, jour, journal?.mood, saveJournal]);

  const formatJour = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  );

  const historique = useMemo(
    () =>
      notes
        .filter((n): n is Note & { date: string } => n.kind === 'journal' && Boolean(n.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [notes],
  );

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return null;
    return notes.filter((n) => n.body.toLowerCase().includes(q));
  }, [notes, recherche]);

  const notesHabitude = notes.filter((n) => n.kind === 'habit' && n.body.trim());
  const nomHabitude = (id?: string) => habits.find((h) => h.id === id)?.name ?? '';
  const sessionsRecentes = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader titleKey="navNotes" subKey="notesSub" />

      <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={t('journal')}
            actions={
              enregistre ? (
                <span
                  role="status"
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--acc2)' }}
                >
                  {t('saved')}
                </span>
              ) : null
            }
          >
            <div className="flex flex-col gap-3">
              <textarea
                value={texte}
                onChange={(e) => {
                  setEnregistre(false);
                  setModifie(true);
                  setTexte(e.target.value);
                }}
                aria-label={t('journal')}
                placeholder={t('notePlaceholder')}
                className="rounded-field min-h-[160px] w-full resize-y border outline-none"
                style={champStyle}
              />
              <MoodPicker
                value={journal?.mood}
                onChange={(n) => void saveJournal(jour, texte, n)}
              />
            </div>
          </Panel>

          <Panel title={t('history')} padding={0}>
            {historique.length === 0 ? (
              <p
                className="m-0 px-4 py-8 text-center text-[12.5px]"
                style={{ color: 'var(--mut)' }}
              >
                {ts('emNotesD')}
              </p>
            ) : (
              <ul data-history className="m-0 flex list-none flex-col p-0">
                {historique.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
                      {formatJour.format(new Date(`${n.date}T12:00:00`))}
                    </span>
                    <span className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
                      {n.body}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title={t('notesSearch')} padding={14}>
            <div className="flex flex-col gap-3">
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label={t('notesSearch')}
                placeholder={t('notesSearch')}
                className="rounded-field w-full border outline-none"
                style={champStyle}
              />
              {resultats === null ? null : resultats.length === 0 ? (
                <p className="m-0 text-[12px]" style={{ color: 'var(--mut)' }}>
                  {t('notesNoHits')}
                </p>
              ) : (
                <ul data-hits className="m-0 flex list-none flex-col gap-2 p-0">
                  {resultats.map((n) => (
                    <li key={n.id} className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
                      {n.body}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <Panel title={t('habitNotes')} padding={14}>
            {notesHabitude.length === 0 ? (
              <p className="m-0 text-[12.5px]" style={{ color: 'var(--mut)' }}>
                {t('noNote')}
              </p>
            ) : (
              <ul data-habit-notes className="m-0 flex list-none flex-col gap-3 p-0">
                {notesHabitude.map((n) => (
                  <li key={n.id} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
                      {nomHabitude(n.habitId)}
                    </span>
                    <span className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
                      {n.body}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('sessions')} padding={14}>
            {sessionsRecentes.length === 0 ? (
              <p className="m-0 text-[12.5px]" style={{ color: 'var(--mut)' }}>
                {t('noSessions')}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {sessionsRecentes.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate">{s.label || t('focusTime')}</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--txt2)' }}>
                      {s.minutes}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
