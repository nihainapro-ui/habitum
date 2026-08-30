'use client';

import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Segmented } from '@/components/ui';
import { ViewActions } from '@/components/shell/view-actions';
import { AgendaList } from './AgendaList';
import { MonthGrid } from './MonthGrid';
import { TimeGrid } from './TimeGrid';

/* Vue « Calendrier » — 05-SPEC-VUES.md § 3.

   QUATRE modes portés : mois, semaine, jour, agenda. Le prototype en a un
   cinquième, « orbite » — une projection décorative du mois qui n'apporte
   aucune information que la grille ne donne déjà. Il n'est pas porté, et
   `05-SPEC-VUES.md`, qui n'en parlait pas, le dit désormais explicitement
   (G10 : le document qui a tort est corrigé, pas contourné).

   Sous 768 px, tous les modes retombent sur l'AGENDA (D6) : une grille de sept
   colonnes horaires sur un téléphone n'est pas une grille, c'est une bouillie.

   Le glisser-déposer sert la souris et le tactile ; le clavier passe par le
   mode déplacement de `EventBlock`, qui travaille en jours et en quarts
   d'heure plutôt qu'en pixels. */

export type ModeCalendrier = 'month' | 'week' | 'day' | 'agenda';

/** Distance avant qu'un appui devienne un glissement. Sans elle, un simple
 *  clic sur un évènement déclencherait un déplacement de trois pixels. */
const SEUIL_GLISSEMENT = 6;

export function CalendarView() {
  const t = useTranslations('app');
  const moveTask = useStore((s) => s.moveTask);

  const [mode, setMode] = useState<ModeCalendrier>('month');
  const [offset, setOffset] = useState(0);
  const [etroit, setEtroit] = useState(false);
  /* Largeur ET date se lisent après le montage. Les routes sont prérendues :
     un `matchMedia` au rendu n'existe pas côté serveur, et une grille bâtie
     sur `today()` porterait la date de la COMPILATION — l'écart se paie en
     erreur d'hydratation (#418) dès que le build et la visite ne tombent pas
     le même jour. Attendre le montage supprime aussi le battement
     « mois puis agenda » sur téléphone. */
  const [monte, setMonte] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(max-width: 767px)');
    const majeur = () => setEtroit(requete.matches);
    majeur();
    setMonte(true);
    requete.addEventListener('change', majeur);
    return () => requete.removeEventListener('change', majeur);
  }, []);

  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: SEUIL_GLISSEMENT } }),
  );

  const surDepot = (e: DragEndEvent) => {
    const taskId = e.active.data.current?.taskId as string | undefined;
    const cible = e.over?.data.current as { date?: string; time?: string } | undefined;
    if (!taskId || !cible?.date) return;
    void moveTask(taskId, cible.date, cible.time);
  };

  const effectif: ModeCalendrier = etroit ? 'agenda' : mode;

  return (
    <div className="flex flex-col gap-4">
      {etroit ? null : (
        <ViewActions>
          <Segmented<ModeCalendrier>
            label={t('calMode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: t('calMonth') },
              { value: 'week', label: t('calWeek') },
              { value: 'day', label: t('calDay') },
              { value: 'agenda', label: t('calAgenda') },
            ]}
          />
        </ViewActions>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          aria-label={t('prevPeriod')}
          className="rounded-btn grid h-[34px] w-[34px] cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setOffset(0)}
          className="rounded-btn cursor-pointer border px-3.5 py-2 font-mono text-[11.5px] tracking-[0.08em] uppercase"
          style={{
            borderColor: offset === 0 ? 'var(--line2)' : 'var(--line)',
            background: 'var(--panel2)',
            color: offset === 0 ? 'var(--txt)' : 'var(--txt2)',
          }}
        >
          {t('calToday')}
        </button>
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          aria-label={t('nextPeriod')}
          className="rounded-btn grid h-[34px] w-[34px] cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <DndContext sensors={capteurs} onDragEnd={surDepot}>
        {!monte ? (
          <div
            aria-hidden="true"
            className="rounded-panel h-[420px] border"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          />
        ) : null}
        {monte && effectif === 'month' ? <MonthGrid offset={offset} /> : null}
        {monte && effectif === 'week' ? <TimeGrid offset={offset} jours={7} /> : null}
        {monte && effectif === 'day' ? <TimeGrid offset={offset} jours={1} /> : null}
        {monte && effectif === 'agenda' ? <AgendaList offset={offset} /> : null}
      </DndContext>
    </div>
  );
}
