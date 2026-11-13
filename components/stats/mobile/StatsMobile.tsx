'use client';

import { useMemo, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Range } from '@/lib/store';
import {
  BarreProgression,
  CategoryGlyph,
  COULEURS_CATEGORIE,
  Ring,
  Segmented,
} from '@/components/ui';
import { EmptyState } from '@/components/shell/empty-state';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { FENETRES, useStatistiques } from '../donnees';
import { Heatmap } from '../Heatmap';

/* Vue « Statistiques » sur TÉLÉPHONE — refonte mobile, P3 lot 2
   (`docs/handoff/10-ECARTS-P3-MOBILE.md` § 4).

   Les mêmes chiffres que le bureau, par le même crochet (`../donnees`) ; rien
   n'est retiré — quatrième indicateur Focus, carte de chaleur, répartition par
   catégorie, histogramme du mois civil. Ce qui change est la FORME :

   - la période se choisit sur des segments de 44 px, pleine largeur ;
   - les quatre indicateurs sont des LIENS vers l'écran qui les explique ;
   - l'histogramme du mois se LIT AU DOIGT. Sur le bureau la valeur d'un jour
     se lit au survol (`title`), et un doigt ne survole pas : sans cela,
     l'histogramme n'était qu'une silhouette. On touche le graphique, ou on
     avance jour par jour avec deux boutons ; le jour lu s'écrit en toutes
     lettres ;
   - le tableau « Par habitude » devient une liste : barre + taux, puis série,
     record et cumul en clair. Un tableau de cinq colonnes ne tient pas dans
     360 px sans défiler de côté.

   CE QUE LE PDF DESSINE ET QU'ON N'AFFICHE PAS (règle 3, document d'écarts
   § 2) : « ▲ +6 pts » — aucun calcul de variation n'existe —, le porteur du
   record, et le « — » sous trois jours. */

/* Hors du JSX : `jsx-no-literals` y interdit jusqu'à un caractère. */
const CHEVRON_GAUCHE = '‹';
const CHEVRON_DROIT = '›';

const DESTINATIONS = {
  score: '/app/habits',
  parfaits: '/app/calendar',
  record: '/app/habits',
  focus: '/app/timer',
} as const;

export function StatsMobile() {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const { locale } = useLocaleSwitcher();
  const {
    aucuneHabitude,
    range,
    setRange,
    score,
    parfaits,
    record,
    focusTexte,
    classement,
    parts,
    mois,
  } = useStatistiques();

  const [jourChoisi, setJourChoisi] = useState<string | null>(null);

  const moisLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date()),
    [locale],
  );
  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  if (aucuneHabitude) {
    return (
      <div className="flex flex-col gap-3" data-testid="stats-mobile">
        <EmptyState titleKey="system.emStatsT" bodyKey="system.emStatsD" />
      </div>
    );
  }

  /* Composés hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const pourcentage = (n: number) => `${n} %`;

  /** Ce qu'un jour du mois dit, en une phrase — le nom du bouton ET la ligne
   *  affichée dessous sont la même chaîne : ce qu'on entend est ce qu'on lit. */
  const phraseJour = (j: (typeof mois)[number]): string => {
    const date = jourLong.format(j.date);
    if (j.future) return t('mobStatDayFuture', { date });
    if (j.scheduled === 0) return t('mobStatDayNone', { date });
    return t('mobStatDay', { date, done: j.done, scheduled: j.scheduled });
  };

  const indicateurs = [
    {
      cle: 'score',
      valeur: pourcentage(score),
      libelle: t('overallScore'),
      couleur: 'var(--acc2)',
    },
    { cle: 'parfaits', valeur: String(parfaits), libelle: t('perfectDays'), couleur: 'var(--ok)' },
    { cle: 'record', valeur: String(record), libelle: t('colBest'), couleur: 'var(--warn)' },
    { cle: 'focus', valeur: focusTexte, libelle: t('focusTime'), couleur: 'var(--acc)' },
  ] as const;

  const indexChoisi = mois.findIndex((j) => j.key === jourChoisi);
  const choisi = indexChoisi < 0 ? undefined : mois[indexChoisi];

  /** Le jour sous le doigt : la position horizontale, rapportée à la largeur. */
  const viser = (e: PointerEvent<HTMLDivElement>): void => {
    const cadre = e.currentTarget.getBoundingClientRect();
    if (cadre.width <= 0) return;
    const i = Math.floor(((e.clientX - cadre.left) / cadre.width) * mois.length);
    const jour = mois[Math.min(mois.length - 1, Math.max(0, i))];
    if (jour) setJourChoisi(jour.key);
  };

  /** Un jour avant, un jour après. Sans jour lu, on part d'AUJOURD'HUI — le
   *  dernier jour qui ne soit pas à venir : c'est celui qu'on vient consulter. */
  const pas = (sens: 1 | -1): void => {
    const depart =
      indexChoisi >= 0 ? indexChoisi + sens : Math.max(0, mois.filter((j) => !j.future).length - 1);
    const jour = mois[Math.min(mois.length - 1, Math.max(0, depart))];
    if (jour) setJourChoisi(jour.key);
  };

  const fleche =
    'rounded-pill grid h-11 w-11 flex-none cursor-pointer place-items-center border text-[16px]';
  const styleFleche = (inerte: boolean) => ({
    borderColor: 'var(--line)',
    background: 'var(--panel2)',
    color: 'var(--txt)',
    opacity: inerte ? 0.4 : 1,
  });

  const carte = 'rounded-[22px] border';
  const styleCarte = { borderColor: 'var(--line)', background: 'var(--panel)' };
  const surTitre = 'font-mono text-[9.5px] tracking-[0.16em] uppercase';

  return (
    <div className="flex flex-col gap-3" data-testid="stats-mobile">
      <Segmented<string>
        fill
        label={t('mobStatPeriod')}
        value={String(range)}
        onChange={(v) => setRange(Number(v) as Range)}
        options={FENETRES.map((f) => ({ value: String(f), label: t('mobStatDays', { n: f }) }))}
      />

      <section className={`${carte} flex flex-col items-center gap-4 p-4`} style={styleCarte}>
        <div className="relative grid h-[132px] w-[132px] flex-none place-items-center">
          <Ring
            value={score / 100}
            label={`${t('habitScore')} : ${score} %`}
            size={132}
            stroke={9}
          />
          <span className="absolute flex flex-col items-center">
            <span data-testid="score" className="font-mono text-[30px] leading-none font-bold">
              {score}
            </span>
            {/* Même corps que le bureau : à 9,5 px le libellé sortait de l'anneau. */}
            <span
              className="mt-1 font-mono text-[8.5px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {t('habitScore')}
            </span>
          </span>
        </div>

        <ul className="m-0 grid w-full list-none grid-cols-2 gap-2 p-0">
          {indicateurs.map((i) => (
            <li key={i.cle}>
              <Link
                href={DESTINATIONS[i.cle]}
                data-kpi={i.cle}
                aria-label={t('mobStatOpen', { label: i.libelle, value: i.valeur })}
                className="rounded-field flex min-h-[64px] flex-col justify-center gap-1 border px-3 py-2 no-underline"
                style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
              >
                <span className={surTitre} style={{ color: 'var(--txt2)' }}>
                  {i.libelle}
                </span>
                <span
                  data-testid={`kpi-${i.cle}`}
                  className="font-mono text-[20px] leading-none font-bold whitespace-nowrap"
                  style={{ color: i.couleur }}
                >
                  {i.valeur}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${carte} flex flex-col gap-3 p-4`} style={styleCarte}>
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="m-0 text-[13.5px] font-semibold">{t('monthProgress')}</h2>
          <span className="text-[11.5px]" style={{ color: 'var(--txt2)' }}>
            {moisLabel}
          </span>
        </header>

        {/* LE GRAPHIQUE SE TOUCHE N'IMPORTE OÙ : la colonne sous le doigt est le
            jour lu, et on peut glisser. Trente et une barres dans 320 px font
            des colonnes de 9 px — un bouton par barre, comme prévu d'abord,
            échouait à la règle des cibles de 24 px (WCAG 2.2, `target-size`).
            Le clavier et les lecteurs d'écran passent par les deux boutons de
            44 px ci-dessous : le graphique lui-même est décoratif pour eux, et
            la phrase du jour est annoncée (`role="status"`). */}
        <div
          data-mois
          aria-hidden="true"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            viser(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === 'touch') viser(e);
          }}
          className="flex h-[120px] cursor-pointer touch-pan-y items-end gap-[2px]"
        >
          {mois.map((j) => (
            <span
              key={j.key}
              data-jour={j.key}
              data-actif={j.key === jourChoisi ? '' : undefined}
              className="block min-w-0 flex-1 rounded-t-[3px]"
              style={{
                height: `${Math.max(3, Math.round((j.future ? 0 : j.ratio) * 112))}px`,
                background: j.future
                  ? 'var(--panel2)'
                  : j.ratio >= 0.8
                    ? 'var(--ok)'
                    : j.ratio >= 0.4
                      ? 'color-mix(in srgb, var(--ok) 55%, var(--panel2))'
                      : 'var(--bad)',
                outline: j.key === jourChoisi ? '2px solid var(--txt)' : 'none',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('mobStatPrev')}
            disabled={indexChoisi === 0}
            onClick={() => pas(-1)}
            className={fleche}
            style={styleFleche(indexChoisi === 0)}
          >
            <span aria-hidden="true">{CHEVRON_GAUCHE}</span>
          </button>
          <p
            role="status"
            data-testid="jour-choisi"
            className="m-0 min-w-0 flex-1 text-center text-[12.5px]"
            style={{ color: choisi ? 'var(--txt)' : 'var(--mut)' }}
          >
            {choisi ? phraseJour(choisi) : t('mobStatPick')}
          </p>
          <button
            type="button"
            aria-label={t('mobStatNext')}
            disabled={indexChoisi === mois.length - 1}
            onClick={() => pas(1)}
            className={fleche}
            style={styleFleche(indexChoisi === mois.length - 1)}
          >
            <span aria-hidden="true">{CHEVRON_DROIT}</span>
          </button>
        </div>
      </section>

      <Heatmap />

      <section className={`${carte} overflow-hidden`} style={styleCarte}>
        <h2 className="m-0 px-4 pt-4 pb-1 text-[13.5px] font-semibold">{t('perHabit')}</h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {classement.map((l) => {
            const meta = [
              t('mobStatMeta', { streak: l.streak, best: l.best }),
              l.total ? t('mobStatTotal', { total: `${l.total} ${l.habit.goal.unit}`.trim() }) : '',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li
                key={l.habit.id}
                data-score-row
                className="flex flex-col gap-1.5 border-b px-4 py-3 last:border-b-0"
                style={{ borderBottomColor: 'var(--line)' }}
              >
                <span className="flex items-center gap-2.5">
                  <CategoryGlyph category={l.habit.category} size={26} />
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-medium">
                    {l.habit.name}
                  </span>
                  <span
                    data-testid="pct"
                    className="flex-none font-mono text-[14px] font-bold"
                    style={{ color: 'var(--txt)' }}
                  >
                    {pourcentage(l.pct)}
                  </span>
                </span>
                <BarreProgression ratio={l.pct / 100} hauteur={4} />
                <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
                  {meta}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${carte} flex flex-col gap-3 p-4`} style={styleCarte}>
        <h2 className="m-0 text-[13.5px] font-semibold">{t('byCategory')}</h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {parts.map((p) => (
            <li key={p.category} className="flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2 text-[13px]">
                <span className="flex-1">{tc(p.category)}</span>
                <span className="font-mono text-[12px]" style={{ color: 'var(--txt2)' }}>
                  {pourcentage(p.pct)}
                </span>
              </span>
              <BarreProgression
                ratio={p.pct / 100}
                couleur={COULEURS_CATEGORIE[p.category]}
                hauteur={6}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
