'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { useSettings, useStore } from '@/lib/store';
import {
  audioDisponible,
  beep,
  preparerAudio,
  vibrationDisponible,
  vibrer,
} from '@/lib/features/feedback';

/* Son et vibration — tâche 5.3.

   Deux comportements différents, et c'est délibéré :

   - **Son absent** (rarissime) : interrupteur DÉSACTIVÉ avec sa raison. Web
     Audio existe partout où l'application tourne ; s'il manque, c'est une
     information, pas un détail à cacher.
   - **Vibration absente** (iOS Safari, tous les ordinateurs de bureau) :
     interrupteur MASQUÉ. C'est la règle du plan, et c'est la bonne : proposer
     de faire vibrer un ordinateur portable n'est pas une limitation à
     expliquer, c'est un réglage qui n'a pas lieu d'être.

   Activer le son PRÉPARE le contexte audio et fait entendre le bip
   immédiatement. Deux raisons dans le même geste : un `AudioContext` créé hors
   interaction reste muet (tâche 5.3), et un réglage sonore qui ne se laisse pas
   écouter au moment où on l'active ne se vérifie jamais. */

export function FeedbackSettings() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const settings = useSettings();
  const setSetting = useStore((s) => s.setSetting);

  /* Les capacités ne se lisent que dans le navigateur : le rendu statique part
     du cas le plus courant et se corrige après le montage. */
  const [son, setSon] = useState(true);
  const [vibration, setVibration] = useState(false);

  useEffect(() => {
    setSon(audioDisponible());
    setVibration(vibrationDisponible());
  }, []);

  const basculerSon = (v: boolean) => {
    if (v) {
      preparerAudio();
      beep();
    }
    void setSetting('sound', v);
  };

  const basculerVibration = (v: boolean) => {
    if (v) vibrer();
    void setSetting('vibrate', v);
  };

  return (
    <>
      <Switch
        label={t('soundLbl')}
        checked={settings.sound && son}
        disabled={!son}
        reason={son ? ts('soundHint') : ts('soundUnsupported')}
        onChange={basculerSon}
      />
      {vibration ? (
        <Switch
          label={t('vibrateLbl')}
          checked={settings.vibrate}
          reason={ts('vibrateHint')}
          onChange={basculerVibration}
        />
      ) : null}
    </>
  );
}
