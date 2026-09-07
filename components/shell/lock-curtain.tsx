'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Fingerprint } from 'lucide-react';
import { useStore } from '@/lib/store';
import { verifierVerrou } from '@/lib/features/verrou/webauthn';

/* Rideau du verrou biométrique — spec du 2026-09-02 § Lot D.
 *
 * IL REMPLACE LA COQUE, il ne la recouvre pas. Un voile posé par-dessus
 * laisserait le contenu dans le DOM : lisible au lecteur d'écran, lisible dans
 * l'inspecteur, copiable en trois gestes. Ce serait un rideau peint sur une
 * vitre. Ici, rien de ce qu'il protège n'est rendu.
 *
 * Ce que ce rideau NE FAIT PAS, et que l'écran de réglage dit en toutes
 * lettres : chiffrer. Les données restent dans IndexedDB. Le rideau arrête un
 * regard par-dessus l'épaule ; il n'arrête pas quelqu'un qui sait ouvrir un
 * navigateur. Le prétendre serait pire que de ne rien poser. */

export function LockCurtain() {
  const t = useTranslations('system');
  const credentialId = useStore((s) => s.lockCredentialId);
  const unlockApp = useStore((s) => s.unlockApp);
  const [erreur, setErreur] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);

  const demander = async () => {
    if (!credentialId || enCours) return;
    setErreur(false);
    setEnCours(true);
    try {
      await verifierVerrou(credentialId);
      unlockApp();
    } catch {
      setErreur(true);
      /* Le focus revient sur le bouton : après un refus, la seule chose à
         faire est de recommencer, et il ne faut pas avoir à la chercher. */
      bouton.current?.focus();
    } finally {
      setEnCours(false);
    }
  };

  /* AUCUNE demande automatique, et c'est un choix.
     `navigator.credentials.get()` sans geste de l'utilisateur est refusé par
     plusieurs navigateurs — la demande partirait pour échouer, et le rideau
     s'ouvrirait sur un message d'erreur que personne n'a provoqué. Le bouton
     prend donc le focus : une frappe suffit, et le geste existe. */
  useEffect(() => {
    bouton.current?.focus();
  }, []);

  return (
    <div
      data-verrou
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{ background: 'var(--bg)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('lockedT')}
        className="rounded-panel flex w-full max-w-[420px] flex-col items-center gap-4 border p-6 text-center"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <Fingerprint size={32} aria-hidden="true" style={{ color: 'var(--acc2)' }} />
        <h1 className="m-0 text-[17px] font-bold">{t('lockedT')}</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
          {t('lockedD')}
        </p>

        <button
          ref={bouton}
          type="button"
          onClick={() => void demander()}
          disabled={enCours}
          className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px]"
          style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
        >
          {t('lockedBtn')}
        </button>

        {erreur ? (
          <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
            {t('lockedErr')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
