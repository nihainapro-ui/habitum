/* Vibration — tâche 5.3.

   `navigator.vibrate` n'existe pas sur iOS Safari, et n'y existera pas. La
   règle du plan est explicite et vaut mieux qu'un repli : l'interrupteur est
   MASQUÉ là où l'API est absente. Un interrupteur affiché puis inopérant est
   pire qu'un interrupteur absent — il fait douter du reste. */

interface NavigateurVibrant {
  vibrate: (motif: number | number[]) => boolean;
}

const navigateur = (): NavigateurVibrant | null => {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as Navigator & Partial<NavigateurVibrant>;
  return typeof n.vibrate === 'function' ? (n as NavigateurVibrant) : null;
};

export const vibrationDisponible = (): boolean => navigateur() !== null;

/** Motif de fin de phase : deux impulsions brèves séparées d'un silence. */
export const MOTIF_FIN = [120, 80, 120] as const;

/** Fait vibrer l'appareil. Rend `false` si l'API est absente ou refuse —
 *  certains navigateurs l'exigent après une interaction. */
export function vibrer(motif: number | readonly number[] = MOTIF_FIN): boolean {
  const n = navigateur();
  if (!n) return false;
  try {
    return n.vibrate(Array.isArray(motif) ? [...(motif as readonly number[])] : (motif as number));
  } catch {
    return false;
  }
}
