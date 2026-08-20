'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, Home, RotateCcw } from 'lucide-react';
import { exporterDirect } from '@/lib/features/backup';

/* Écran de reprise — tâche 5.1.

   TROIS actions, et la troisième est la plus importante : **exporter ses
   données**. Une erreur ne doit jamais mettre l'utilisateur en position de
   perdre son historique. Elle passe par `exporterDirect`, qui lit la base sans
   traverser le store : ce qui vient de tomber est le plus souvent le rendu, et
   un chemin de secours qui dépend du composant tombé n'est pas un secours.

   L'empreinte (`digest`) est affichée quand Next en fournit une. Elle ne part
   nulle part — c'est ce que l'utilisateur peut recopier dans un rapport, pas ce
   que l'application transmet (décision E). */

export function ErrorState({
  reset,
  digest,
}: {
  reset?: (() => void) | undefined;
  digest?: string | undefined;
}) {
  const ts = useTranslations('system');
  const [echecExport, setEchecExport] = useState(false);

  const exporter = async () => {
    try {
      await exporterDirect();
      setEchecExport(false);
    } catch {
      setEchecExport(true);
    }
  };

  const bouton =
    'rounded-btn flex cursor-pointer items-center gap-2 border px-4 py-2 text-[12.5px]';

  return (
    <section
      data-testid="error-state"
      role="alert"
      className="rounded-panel mx-auto flex max-w-[560px] flex-col items-start gap-3 border p-8"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <AlertTriangle size={20} aria-hidden="true" style={{ color: 'var(--warn)' }} />
      <h1 className="m-0 text-[22px] tracking-tight">{ts('errT')}</h1>
      <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
        {ts('errD')}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {reset ? (
          <button
            type="button"
            onClick={reset}
            className={bouton}
            style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
          >
            <RotateCcw size={13} aria-hidden="true" />
            {ts('errRetry')}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void exporter()}
          className={bouton}
          style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
        >
          <Download size={13} aria-hidden="true" />
          {ts('errExport')}
        </button>

        {/* Lien BRUT, pas `next/link` : le retour à l'accueil doit RECHARGER.
            Une navigation côté client repartirait du même runtime que celui qui
            vient d'échouer — et, quand l'erreur vient du segment courant, la
            frontière n'est même pas démontée : l'écran de reprise resterait
            affiché. */}
        <a
          href="/app"
          className={bouton}
          style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
        >
          <Home size={13} aria-hidden="true" />
          {ts('errHome')}
        </a>
      </div>

      {echecExport ? (
        <p className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
          {ts('expFail')}
        </p>
      ) : null}

      {digest ? (
        <p className="m-0 font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
          {digest}
        </p>
      ) : null}
    </section>
  );
}
