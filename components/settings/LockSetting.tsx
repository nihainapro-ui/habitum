'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { useStore } from '@/lib/store';
import { enregistrerVerrou, verrouPossible } from '@/lib/features/verrou/webauthn';

/* Verrou biométrique — spec du 2026-09-02 § Lot D.
 *
 * TROIS RÈGLES DE LA MAISON, appliquées telles quelles :
 *
 * 1. Un interrupteur désactivé DIT POURQUOI (tâche 5.4). Ici, la raison est
 *    « cet appareil n'a pas d'authentificateur » — et elle se vérifie avant
 *    d'afficher quoi que ce soit, pas au premier échec.
 * 2. Un interrupteur ne s'allume PAS avant que ce qu'il promet existe.
 *    L'enregistrement WebAuthn peut être annulé d'un geste ; tant qu'il n'a
 *    pas rendu d'identifiant, l'interrupteur reste éteint et le dit.
 * 3. L'honnêteté est affichée, pas notée dans un fichier de conception. Ce
 *    verrou est un rideau, pas un chiffrement, et l'écran l'écrit. */

export function LockSetting() {
  const t = useTranslations('system');
  const credentialId = useStore((s) => s.lockCredentialId);
  const enableLock = useStore((s) => s.enableLock);
  const disableLock = useStore((s) => s.disableLock);
  const profiles = useStore((s) => s.profiles);
  const activeProfileId = useStore((s) => s.activeProfileId);

  /* `null` = on ne sait pas encore. La question demande une réponse
     asynchrone à la plateforme ; répondre « non » en attendant ferait
     clignoter une explication fausse sur les appareils qui, eux, savent. */
  const [possible, setPossible] = useState<boolean | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let vivant = true;
    void verrouPossible().then((r) => {
      if (vivant) setPossible(r);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const basculer = async (valeur: boolean) => {
    setErreur(false);
    if (!valeur) {
      await disableLock();
      return;
    }
    try {
      const nom = profiles.find((p) => p.id === activeProfileId)?.name?.trim();
      await enableLock(await enregistrerVerrou(nom || 'Habitum'));
    } catch {
      setErreur(true);
    }
  };

  const actif = credentialId !== null;
  /* Indisponible : l'interrupteur est désactivé et explique. On ne le cache pas
     comme le curseur réticule sur écran tactile — celui-là n'a aucun sens sur
     l'appareil, celui-ci en aurait un si l'appareil savait faire. Le taire
     laisserait chercher un réglage annoncé ailleurs.

     `possible === null` — la plateforme n'a pas encore répondu — compte comme
     indisponible, et c'est une CORRECTION. Le laisser actionnable pendant
     l'attente donnait un interrupteur qui se clique et ne fait rien : la
     demande partait vers une plateforme dont on ignorait encore les capacités,
     échouait, et n'affichait qu'un message d'erreur. Un interrupteur mort
     pendant deux dixièmes de seconde reste un interrupteur mort (G3), et le
     contrôle générique de la tâche 5.4 l'attrapait par intermittence. */
  const indisponible = !actif && possible !== true;

  return (
    <div className="flex flex-col gap-2">
      {/* Le libellé de la ligne n'est pas celui du panneau : « Verrou
          biométrique » deux fois de suite ne dit rien de plus la seconde fois.
          La ligne dit ce que l'interrupteur FAIT. */}
      <Switch
        label={t('lockOnOpen')}
        reason={indisponible ? t('lockUnavailable') : t('lockD')}
        checked={actif}
        disabled={indisponible}
        onChange={(v) => void basculer(v)}
      />

      <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
        {t('lockHonest')}
      </span>

      {erreur ? (
        <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
          {t('lockErr')}
        </p>
      ) : null}
    </div>
  );
}
