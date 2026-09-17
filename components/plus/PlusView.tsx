'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { focusMinutes, goalStatus, journalHistory, profilChamps, today } from '@/lib/domain';
import { useActiveProfile, useDayRatio, useProgression, useSettings, useStore } from '@/lib/store';
import { Avatar } from '@/components/profile/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PLUS_TILES } from '@/components/shell/nav-items';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Écran « Plus » — refonte mobile, PDF p. 3.

   Le tiroir latéral (douze entrées, carte de niveau, thème, langue) est
   remplacé par cet écran : une carte de profil pleine largeur, puis une
   grille de huit tuiles — icône Lucide, titre, et UNE LIGNE D'ÉTAT RÉELLE.

   « Réelle » au sens de CLAUDE.md § 3 : chaque ligne vient du store, et un
   compte vierge lit « 0 / 0 aujourd'hui », « Aucun projet », « 0 min cette
   semaine ». Aucun chiffre n'est de courtoisie. Le calendrier et les réglages
   n'ont pas de chiffre à donner : leur ligne DÉCRIT (« Mois · semaine · agenda »,
   « Neural · FR »), elle n'estime rien.

   Il est prérendu comme les douze vues : les tuiles sont fixes, seules les
   lignes d'état s'hydratent. Le vocabulaire est celui de la journée, pas du
   système (p. 17) : « Analyste · Niveau 3 », jamais « LVL 3 · ANALYSTE ».

   L'écran est rendu à toute largeur — une route l'est toujours — mais rien
   n'y mène au-dessus de 768 px : le rail porte déjà les douze vues. */

const MINUTES_PAR_HEURE = 60;

export function PlusView() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const { locale } = useLocaleSwitcher();

  const profil = useActiveProfile();
  const prog = useProgression();
  const isDemo = useStore((s) => s.isDemo);
  const settings = useSettings();
  const range = useStore((s) => s.ui.range);
  const goals = useStore((s) => s.goals);
  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const projects = useStore((s) => s.projects);
  const notes = useStore((s) => s.notes);
  const sessions = useStore((s) => s.sessions);

  const jour = useDayRatio(today());
  const objectifsEnCours = useMemo(
    () => goals.filter((g) => goalStatus(g, habits, logIndex) !== 'done').length,
    [goals, habits, logIndex],
  );
  const entreesJournal = useMemo(() => journalHistory(notes).length, [notes]);
  const focusSemaine = useMemo(() => focusMinutes(sessions, 7), [sessions]);

  const champs = profilChamps(profil);
  const nomProfil = profil?.name ?? '';
  const rang = t(`rank${prog.rankIndex}`);

  /* Une ligne d'état par tuile, indexée par route. La table est ici et non
     dans `nav-items.ts` : elle lit le store, que la table de navigation ne
     doit pas connaître. */
  const etats: Record<string, string> = {
    '/app': t('mobStDash', { done: jour.done, n: jour.scheduled }),
    '/app/calendar': t('mobStCal'),
    '/app/goals': t('mobStGoals', { n: objectifsEnCours }),
    '/app/stats': t('mobStStats', { n: range }),
    '/app/work': t('mobStWork', { n: projects.length }),
    '/app/timer':
      focusSemaine >= MINUTES_PAR_HEURE
        ? t('mobStFocusH', {
            h: Math.floor(focusSemaine / MINUTES_PAR_HEURE),
            m: String(focusSemaine % MINUTES_PAR_HEURE).padStart(2, '0'),
          })
        : t('mobStFocusM', { m: focusSemaine }),
    '/app/notes': t('mobStNotes', { n: entreesJournal }),
    '/app/settings': t('mobStSettings', {
      theme: t(`mobTheme_${settings.theme}`),
      lang: locale.toUpperCase(),
    }),
  };

  return (
    <div className="flex flex-col gap-3" data-testid="plus-view">
      {/* Carte de profil, pleine largeur. Le niveau y vit désormais — il
          siégeait dans le tiroir de navigation, où il parlait du système
          plutôt que de la journée (p. 15). La barre d'expérience est
          l'unique usage du turquoise sur cette carte : la progression. */}
      <Link
        href="/app/profile"
        aria-label={t('mobProfileOpen')}
        className="rounded-[22px] flex min-h-[64px] items-center gap-3 border px-4 py-3"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)', color: 'var(--txt)' }}
      >
        <Avatar
          glyph={profil?.glyph ?? '◎'}
          hue={profil?.hue ?? 200}
          size={44}
          label={nomProfil}
          photo={champs.photo}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[15px] leading-tight font-semibold">
            {t('mobLevelLine', { rank: rang, level: prog.level })}
          </span>
          <span
            aria-hidden="true"
            className="rounded-pill block h-1 w-full overflow-hidden"
            style={{ background: 'var(--panel2)' }}
          >
            <span
              className="rounded-pill block h-full"
              style={{ width: `${prog.pct}%`, background: 'var(--acc2)' }}
            />
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-mono text-[11px]" style={{ color: 'var(--mut)' }}>
              {t('mobXp', { into: prog.into, span: prog.span })}
            </span>
            {isDemo ? (
              <span
                className="rounded-pill px-2 py-[1px] text-[10.5px] whitespace-nowrap"
                style={{ background: 'var(--panel2)', color: 'var(--txt2)' }}
              >
                {ts('demoTag')}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--mut)', flex: 'none' }} />
      </Link>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0" data-testid="plus-grille">
        {PLUS_TILES.map((tuile) => (
          <li key={tuile.href} className="min-w-0">
            <Link
              href={tuile.href}
              className="rounded-[22px] flex min-h-[88px] flex-col gap-2 border px-4 py-3.5"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--panel)',
                color: 'var(--txt)',
              }}
            >
              <span style={{ color: 'var(--txt2)', display: 'flex' }}>
                <Icon name={tuile.icon} size={18} />
              </span>
              <span className="text-[14px] font-semibold">{t(tuile.key)}</span>
              <span className="text-[12px] leading-snug" style={{ color: 'var(--mut)' }}>
                {etats[tuile.href] ?? ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
