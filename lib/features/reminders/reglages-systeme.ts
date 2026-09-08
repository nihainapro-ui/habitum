import { estNatif } from './canal-natif';

/* Emmener l'utilisateur là où le refus se défait.
 *
 * Quand Android a mémorisé un refus de notifications, il ne réaffiche plus
 * jamais de boîte de dialogue : le seul endroit qui le défait est un écran
 * système. Lui dire « allez dans les réglages d'Android » sans l'y emmener,
 * c'est le renvoyer chercher dans une arborescence qui change à chaque
 * surcouche constructeur.
 *
 * Le plugin officiel ne sait ouvrir que l'écran des ALARMES EXACTES. Celui des
 * notifications passe par notre propre plugin, trente lignes de Java dans
 * `packaging/android` — voir `ReglagesSystemePlugin.java`. */

interface PontReglages {
  ouvrirNotifications(): Promise<void>;
}

/** Ouvre les réglages de notification d'Habitum. Rend `false` si rien n'a pu
 *  être ouvert — le navigateur, ou une surcouche sans aucun de ces écrans. */
export async function ouvrirReglagesNotifications(): Promise<boolean> {
  if (!estNatif()) return false;
  try {
    const { registerPlugin } = await import('@capacitor/core');
    const pont = registerPlugin<PontReglages>('ReglagesSysteme');
    await pont.ouvrirNotifications();
    return true;
  } catch {
    /* Plugin absent (APK plus ancien que ce code) ou écran introuvable : on
       rend `false` plutôt que de lever. L'appelant garde alors sa consigne
       écrite, qui reste vraie — elle est simplement plus longue à suivre. */
    return false;
  }
}
