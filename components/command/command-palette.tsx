'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { piegerFocus } from '@/lib/keyboard/shortcuts';
import { NAV_ITEMS } from '@/components/shell/nav-items';
import { dateKey, today } from '@/lib/domain';

/* Palette ⌘K.

   Cherche dans les habitudes, les tâches, les objectifs et la liste de
   courses, et propose toujours en dernier la création rapide d'une tâche —
   comportement du prototype : une recherche infructueuse doit rester une
   action possible, pas un cul-de-sac.

   Accessibilité : `role="dialog"`, `aria-modal`, piège de focus, et surtout
   `Escape` REND LE FOCUS au déclencheur. Une modale qui se ferme en laissant
   le focus sur `<body>` renvoie un utilisateur au clavier tout en haut du
   document. */

interface Resultat {
  id: string;
  libelle: string;
  detail: string;
  activer: () => void | Promise<void>;
}

export function CommandPalette() {
  const t = useTranslations('app');
  const router = useRouter();

  const ouverte = useStore((s) => s.ui.commandOpen);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const shopping = useStore((s) => s.shopping);
  const createTask = useStore((s) => s.createTask);

  const [requete, setRequete] = useState('');
  const [selection, setSelection] = useState(0);
  const boite = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const declencheur = useRef<Element | null>(null);

  const fermer = () => setCommandOpen(false);

  const resultats = useMemo<Resultat[]>(() => {
    const q = requete.trim().toLowerCase();
    const liste: Resultat[] = [];

    if (q) {
      const correspond = (texte: string) => texte.toLowerCase().includes(q);

      for (const h of habits.filter((x) => correspond(x.name))) {
        liste.push({
          id: `h:${h.id}`,
          libelle: h.name,
          detail: t('navHabits'),
          activer: () => router.push('/app/habits'),
        });
      }
      for (const x of tasks.filter((x) => correspond(x.name))) {
        liste.push({
          id: `t:${x.id}`,
          libelle: x.name,
          detail: t('navTasks'),
          activer: () => router.push('/app/tasks'),
        });
      }
      for (const g of goals.filter((x) => correspond(x.name))) {
        liste.push({
          id: `g:${g.id}`,
          libelle: g.name,
          detail: t('navGoals'),
          activer: () => router.push('/app/goals'),
        });
      }
      for (const a of shopping.filter((x) => correspond(x.label))) {
        liste.push({
          id: `s:${a.id}`,
          libelle: a.label,
          detail: t('navTasks'),
          activer: () => router.push('/app/tasks'),
        });
      }
    } else {
      for (const item of NAV_ITEMS) {
        liste.push({
          id: `n:${item.href}`,
          libelle: t(item.key),
          detail: t('mainNav'),
          activer: () => router.push(item.href),
        });
      }
    }

    if (q) {
      liste.push({
        id: 'creer',
        libelle: t('cmdCreateTask', { name: requete.trim() }),
        detail: t('navTasks'),
        activer: async () => {
          await createTask({
            name: requete.trim(),
            category: 'work',
            date: dateKey(today()),
            duration: 60,
            priority: 2,
            done: false,
            subTasks: [],
            note: '',
          });
        },
      });
    }

    return liste;
  }, [requete, habits, tasks, goals, shopping, t, router, createTask]);

  useEffect(() => {
    setSelection(0);
  }, [requete]);

  useEffect(() => {
    if (!ouverte) return;
    declencheur.current = document.activeElement;
    setRequete('');
    setSelection(0);
    champ.current?.focus();
  }, [ouverte]);

  const rendreLeFocus = () => {
    const cible = declencheur.current;
    if (cible instanceof HTMLElement) cible.focus();
  };

  const activerSelection = async () => {
    const choix = resultats[selection];
    if (!choix) return;
    await choix.activer();
    fermer();
    rendreLeFocus();
  };

  /* Le clavier est écouté sur le DOCUMENT, en phase de capture, tant que la
     palette est ouverte — et non sur la boîte de dialogue.

     La différence n'est pas cosmétique : un piège de focus posé sur la boîte
     cesse de fonctionner dès que le focus en sort une fois, puisque plus aucun
     évènement ne lui parvient. Il ne rattrape alors plus jamais rien. En
     capture sur le document, `Tab` est repris quoi qu'il arrive. */
  useEffect(() => {
    if (!ouverte) return;

    const surFrappe = (e: KeyboardEvent) => {
      if (piegerFocus(e, boite.current)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fermer();
        rendreLeFocus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelection((i) => Math.min(i + 1, resultats.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelection((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        void activerSelection();
      }
    };

    document.addEventListener('keydown', surFrappe, true);
    return () => document.removeEventListener('keydown', surFrappe, true);
  });

  if (!ouverte) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: 'rgba(2,4,10,.62)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          fermer();
          rendreLeFocus();
        }
      }}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-label={t('cmdTitle')}
        className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
      >
        <input
          ref={champ}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-resultats"
          aria-label={t('cmdPlaceholder')}
          placeholder={t('cmdPlaceholder')}
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          className="border-b bg-transparent px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--line)', color: 'var(--txt)' }}
        />

        <ul id="palette-resultats" role="listbox" className="max-h-[46vh] overflow-y-auto">
          {resultats.length === 0 ? (
            <li className="px-4 py-6 text-sm" style={{ color: 'var(--mut)' }}>
              {t('cmdEmpty')}
            </li>
          ) : (
            resultats.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === selection}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setSelection(i)}
                  onClick={() => void activerSelection()}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm"
                  style={{
                    background: i === selection ? 'var(--panel2)' : 'transparent',
                    color: i === selection ? 'var(--txt)' : 'var(--txt2)',
                  }}
                >
                  <span className="truncate">{r.libelle}</span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--mut)' }}>
                    {r.detail}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
