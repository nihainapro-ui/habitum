/* Bip de fin de phase — tâche 5.3.

   SYNTHÉTISÉ : aucun fichier audio, aucune requête, aucun octet à héberger.
   Web Audio produit une sinusoïde de 160 ms, ce qui suffit à dire « c'est
   fini » et ne coûte rien au chargement.

   LE PIÈGE, et il est connu : un `AudioContext` créé hors d'un geste
   utilisateur démarre SUSPENDU, et tout ce qu'on lui demande ensuite est
   silencieux — sans erreur, sans avertissement. D'où `preparerAudio()`, à
   appeler depuis un clic (démarrage du minuteur, activation du réglage), et
   jamais au montage d'un composant. */

type FabriqueAudio = typeof AudioContext;

let ctx: AudioContext | null = null;

/** L'API existe-t-elle ici ? Safari ancien la préfixe. */
function fabrique(): FabriqueAudio | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: FabriqueAudio;
    webkitAudioContext?: FabriqueAudio;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export const audioDisponible = (): boolean => fabrique() !== null;

/** Crée ou réveille le contexte audio. À APPELER DEPUIS UN GESTE. */
export function preparerAudio(): void {
  const F = fabrique();
  if (!F) return;
  try {
    ctx ??= new F();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* Certains navigateurs limitent le nombre de contextes. Le produit
       fonctionne sans son ; il ne tombe pas pour lui. */
    ctx = null;
  }
}

/** Bip franc, sans clic de coupure. Rend `false` si rien n'a pu sonner —
 *  l'appelant ne doit pas croire avoir prévenu. */
export function beep(freq = 880, ms = 160): boolean {
  if (!ctx || ctx.state !== 'running') return false;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    /* Enveloppe courte : montée en 10 ms, extinction exponentielle. Une
       coupure nette produirait un claquement. */
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
    return true;
  } catch {
    return false;
  }
}

/** Libère le contexte. Utilisé par les tests ; l'application n'en a pas
 *  besoin — un contexte audio inactif ne consomme rien. */
export function fermerAudio(): void {
  void ctx?.close().catch(() => undefined);
  ctx = null;
}
