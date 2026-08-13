import { daysBetween, parseKey, today } from './date';
import type { DateKey } from './types';

/* Rappel de sauvegarde — D8.

   Les données ne vivent que dans ce navigateur. Vider son cache, changer de
   machine, ou simplement un profil de navigation nettoyé les emporte. Le
   rappel est donc un garde-fou, pas une réclame — d'où trois conditions
   strictes : il n'apparaît que s'il y a QUELQUE CHOSE à perdre, il ne
   réapparaît pas quand on l'a refusé, et il laisse un mois de répit. */

/** Délai avant de rappeler d'exporter. `NAG_DAYS` du prototype. */
export const NAG_DAYS = 30;

export interface EtatSauvegarde {
  /** Date du dernier export, ou `null` s'il n'y en a jamais eu. */
  lastExport: DateKey | null;
  /** L'utilisateur a refusé le rappel : il ne revient pas. */
  dismissed: boolean;
  /** Y a-t-il des données à perdre ? Un compte vide n'a rien à sauvegarder. */
  hasData: boolean;
}

export function shouldNagExport(etat: EtatSauvegarde, now: Date = today()): boolean {
  if (etat.dismissed || !etat.hasData) return false;

  const dernier = parseKey(etat.lastExport);
  if (!dernier) return true;
  return daysBetween(now, dernier) >= NAG_DAYS;
}
