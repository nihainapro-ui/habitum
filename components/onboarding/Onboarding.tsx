'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { StepHabits, type Suggestion } from './StepHabits';
import { StepLang } from './StepLang';
import { StepTheme } from './StepTheme';

/* Parcours d'accueil — tâche 5.5, corrige B4.

   Trois écrans : langue, thème, trois habitudes suggérées. Le bouton principal
   du dernier écran mène à un COMPTE VIERGE — c'est le chemin par défaut, et
   c'est ce que corrige B4 : un utilisateur réel qui reçoit l'historique de
   démonstration ne fait plus confiance à un seul chiffre du produit.

   Il n'y a pas de bouton « passer ». Le parcours fait trois clics, dont deux
   qui règlent la langue et le thème — passer reviendrait à choisir à sa place. */

const ETAPES = ['lang', 'theme', 'habits'] as const;

export function Onboarding() {
  const t = useTranslations('app');
  const router = useRouter();
  const createHabit = useStore((s) => s.createHabit);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const loadDemo = useStore((s) => s.loadDemo);

  const [etape, setEtape] = useState(0);
  const suivante = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));

  const terminer = async (choisies: Suggestion[]) => {
    for (const s of choisies) {
      await createHabit({
        name: t(s.cle),
        category: s.category,
        goal: {
          kind: s.kind,
          target: s.target,
          step: 1,
          unit: s.unite ? t(s.unite) : '',
        },
        mode: 'dow',
        days: [0, 1, 2, 3, 4, 5, 6],
        subItems: [],
        reminders: [],
        archived: false,
        note: '',
      });
    }
    await completeOnboarding();
    router.replace('/app');
  };

  const demonstration = async () => {
    await loadDemo();
    router.replace('/app');
  };

  const cle = ETAPES[etape] ?? 'lang';
  /* Composé hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const avancement = `${etape + 1}/${ETAPES.length}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.18em]" style={{ color: 'var(--mut)' }}>
          {avancement}
        </span>
        <h1 className="m-0 text-[28px] tracking-tight">{t(`ob_${cle}_T`)}</h1>
        <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
          {t(`ob_${cle}_D`)}
        </p>
      </div>

      {cle === 'lang' ? <StepLang onNext={suivante} /> : null}
      {cle === 'theme' ? <StepTheme onNext={suivante} /> : null}
      {cle === 'habits' ? (
        <StepHabits
          onFinish={(choisies) => void terminer(choisies)}
          onDemo={() => void demonstration()}
        />
      ) : null}
    </main>
  );
}
