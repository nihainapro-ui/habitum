'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, dateKey, daysBetween, semaineDe, today } from '@/lib/domain';
import { useDayRatios, useSettings, useStore } from '@/lib/store';
import { useGlissement } from '@/lib/features/mobile/glissement';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Bandeau de la semaine — refonte mobile, PDF p. 5.

   « Observé — bandeau de dates coupé (« JEU. 17 » à moitié). Ici : 7 jours
   entiers. » Sept cellules ÉGALES, la semaine qui contient le jour affiché,
   du premier jour de semaine choisi dans les réglages. Rien ne défile, rien
   n'est tronqué : sept cellules de 44 px et six fentes tiennent dans 358 px.

   La semaine SUIT le jour affiché : glisser le bandeau change de semaine
   (±7 jours), appuyer sur un jour recharge la liste, appuyer sur le titre de
   l'en-tête revient à aujourd'hui. Au clavier, les flèches gauche et droite
   déplacent le jour d'un cran — et donc de semaine en semaine à ses bords.

   Le trait sous le chiffre porte l'avancement de la journée ; il n'est pas
   seul à le dire, la liste le dit en toutes lettres. Rendu après montage,
   comme l'ancien bandeau : le prérendu porterait sinon la date du build. */

export function SemaineStrip() {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);
  const { weekStart } = useSettings();
  const racine = useRef<HTMLDivElement>(null);

  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const jours = useMemo(
    () => (monte ? semaineDe(addDays(today(), day), weekStart) : []),
    [monte, day, weekStart],
  );
  const ratios = useDayRatios(jours);

  const jourCourt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  /* Lecture du décalage COURANT dans le store, jamais dans la fermeture :
     cinq flèches pressées avant le rendu suivant liraient toutes le même
     `day`, et n'avanceraient que d'un jour. */
  const decaler = (n: number) => setDay(useStore.getState().ui.day + n);

  const glissement = useGlissement({
    onGauche: () => decaler(7),
    onDroite: () => decaler(-7),
  });

  /* Après un déplacement au clavier, le focus suit le jour courant : sans
     cela, il resterait sur une cellule qui n'est plus celle qu'on lit. */
  useEffect(() => {
    const boite = racine.current;
    if (!boite || !boite.contains(document.activeElement)) return;
    boite.querySelector<HTMLButtonElement>('[aria-current="date"]')?.focus();
  }, [day]);

  const surTouche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      decaler(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      decaler(1);
    }
  };

  if (!monte) {
    return (
      <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="rounded-field block h-[62px] border"
            style={{ borderColor: 'var(--line)' }}
          />
        ))}
      </div>
    );
  }

  const aujourdhui = today();
  const cleAffichee = dateKey(addDays(aujourdhui, day));

  return (
    <div
      ref={racine}
      role="group"
      aria-label={t('mobWeek')}
      data-testid="semaine-strip"
      className="grid grid-cols-7 gap-1.5"
      onKeyDown={surTouche}
      {...glissement.proprietes}
    >
      {jours.map((d, i) => {
        const cle = dateKey(d);
        const actif = cle === cleAffichee;
        const futur = d > aujourdhui;
        const ratio = ratios[i] ?? 0;
        const decalage = daysBetween(d, aujourdhui);
        return (
          <button
            key={cle}
            type="button"
            data-jour={cle}
            onClick={() => setDay(decalage)}
            aria-current={actif ? 'date' : undefined}
            aria-label={jourLong.format(d)}
            tabIndex={actif ? 0 : -1}
            className="rounded-field flex min-h-[62px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 border px-0 py-1.5"
            style={{
              borderColor: actif ? 'var(--acc2)' : 'var(--line)',
              background: actif ? 'var(--panel2)' : 'transparent',
              /* Le jour courant se reconnaît à sa BORDURE turquoise ; son texte
                 reste `--txt` — `--acc2` sur `--panel2` tombe à 4,46 dans
                 `clinical`, sous AA pour 9,5 px (mesuré par axe). */
              color: actif ? 'var(--txt)' : futur ? 'var(--mut)' : 'var(--txt2)',
            }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase">
              {jourCourt.format(d).replace('.', '')}
            </span>
            <span
              className="font-mono text-[16px] font-semibold"
              style={{ color: actif ? 'var(--txt)' : undefined }}
            >
              {d.getDate()}
            </span>
            <span
              aria-hidden="true"
              className="rounded-pill block h-[3px] w-4"
              style={{
                background: ratio > 0 ? 'var(--ok)' : 'var(--line)',
                opacity: ratio > 0 ? 0.35 + ratio * 0.65 : 1,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
