'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { daysBack, startOfWeek, today } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';

/* Carte de chaleur — 182 jours en colonnes de semaines sur grand écran,
   91 sous 768 px.

   Décision déjà instruite (`09-PLAN-AMELIORATION.md`, tâche B7) : 182 cellules
   restent en DOM. Le `<canvas>` ne se justifie qu'au-delà de 400 — et il coûte
   l'accessibilité, la sélection et l'infobulle native. Ne pas sur-optimiser.

   TÂCHE 8.4 — la carte SE RÉORGANISE, elle ne défile plus. C'était le dernier
   point responsive ouvert depuis l'audit du prototype. Vingt-six colonnes de
   14 px demandent 364 px ; il en reste environ 320 dans le panneau à 390 px de
   large. La carte débordait donc, et son cadre `overflow-x: auto` absorbait le
   débordement — la page ne débordait pas, et le contrôle des quatre paliers ne
   voyait rien. Ce qui restait, c'était la moitié droite de six mois
   d'historique atteignable par un geste horizontal, et par lui seul : hors de
   portée pour qui n'a ni souris ni doigt.

   Treize semaines tiennent (13 × 14 = 182 px). On montre donc MOINS, et on le
   DIT — l'intitulé passe à « 3 derniers mois ». Annoncer six mois au-dessus de
   trois serait un chiffre fabriqué (CLAUDE.md § 3).

   Le choix se fait sur `matchMedia`, après montage : les pages sont prérendues
   (D12), il n'y a pas de largeur d'écran à la compilation. Le premier rendu
   part donc sur la version large, puis se corrige — un écart d'une frame sur
   un panneau qui attend de toute façon l'hydratation pour avoir des données. */

const JOURS_LARGE = 182;
const JOURS_ETROIT = 91;

/** Palier du produit — celui du rail et de la barre basse (`md` de Tailwind). */
const PALIER_ETROIT = '(max-width: 767px)';

/** Nombre de jours à afficher, selon la place disponible. */
function useFenetre(): number {
  const [etroit, setEtroit] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PALIER_ETROIT);
    const suivre = () => setEtroit(mq.matches);
    suivre();
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, []);

  return etroit ? JOURS_ETROIT : JOURS_LARGE;
}

/** Cinq paliers d'intensité, comme le prototype. Le premier est « rien de
 *  prévu » : il se distingue de « prévu, rien de fait » par sa BORDURE, pas
 *  seulement par sa teinte. */
function ton(ratio: number, prevu: number): { background: string; borderColor: string } {
  if (prevu === 0) return { background: 'transparent', borderColor: 'var(--line)' };
  if (ratio <= 0) return { background: 'var(--panel2)', borderColor: 'var(--line2)' };
  if (ratio < 0.4)
    return {
      background: 'color-mix(in srgb, var(--ok) 28%, transparent)',
      borderColor: 'transparent',
    };
  if (ratio < 0.8)
    return {
      background: 'color-mix(in srgb, var(--ok) 58%, transparent)',
      borderColor: 'transparent',
    };
  return { background: 'var(--ok)', borderColor: 'transparent' };
}

export function Heatmap() {
  const t = useTranslations('app');
  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const { weekStart } = useSettings();
  const fenetre = useFenetre();

  const semaines = useMemo(() => {
    const jours = daysBack(logIndex, habits, tasks, fenetre);
    /* On aligne la première colonne sur le début de semaine : sans cela, les
       lignes ne correspondraient à aucun jour fixe et la carte ne se lirait
       plus horizontalement. */
    const debut = startOfWeek(jours[0]?.date ?? today(), weekStart);
    const decalage = Math.round(((jours[0]?.date.getTime() ?? 0) - debut.getTime()) / 86_400_000);

    const cellules: (typeof jours)[number][] = Array.from({ length: decalage }).concat(
      jours,
    ) as (typeof jours)[number][];

    const colonnes: (typeof jours)[number][][] = [];
    for (let i = 0; i < cellules.length; i += 7) colonnes.push(cellules.slice(i, i + 7));
    return colonnes;
  }, [logIndex, habits, tasks, weekStart, fenetre]);

  return (
    <section
      className="rounded-panel border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      aria-label={t('activity')}
    >
      <header className="mb-3 flex items-baseline gap-2">
        <h2 className="m-0 text-[13px] font-semibold">{t('activity')}</h2>
        <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
          {/* L'intitulé suit la fenêtre RÉELLEMENT affichée. */}
          {fenetre === JOURS_LARGE ? t('activitySub') : t('activitySub3')}
        </span>
      </header>

      {/* Plus de `overflow-x-auto` : la carte tient dans son cadre aux quatre
          paliers, donc le cadre n'a plus rien à absorber. Le rétablir
          masquerait à nouveau un débordement au lieu de le corriger. */}
      <div className="pb-1">
        <div data-heatmap className="flex gap-[3px]">
          {semaines.map((colonne, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {colonne.map((jour, j) =>
                jour ? (
                  <span
                    key={jour.key}
                    data-cell
                    title={`${jour.key} · ${jour.done}/${jour.scheduled}`}
                    className="block h-[11px] w-[11px] flex-none rounded-[3px] border"
                    style={ton(jour.ratio, jour.scheduled)}
                  />
                ) : (
                  <span key={`vide-${i}-${j}`} className="block h-[11px] w-[11px]" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-2 text-[10px]"
        style={{ color: 'var(--txt2)' }}
        aria-hidden="true"
      >
        <span>{t('less')}</span>
        {[0, 0.3, 0.6, 1].map((r) => (
          <span
            key={r}
            className="block h-[11px] w-[11px] rounded-[3px] border"
            style={ton(r, 1)}
          />
        ))}
        <span>{t('more')}</span>
      </div>
    </section>
  );
}
