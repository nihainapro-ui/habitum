import { deriverCles } from '@/lib/sync';

/* Rend l'identifiant d'espace d'un code — pour vérifier, depuis un test, ce
   que contient réellement le relais.

   Un cache, et c'est toute la raison de ce fichier : PBKDF2 à 600 000
   itérations coûte ~0,3 s, trois tests demandent le même espace, et une
   dérivation par test ajouterait une seconde au fichier pour rien. */
const connus = new Map<string, string>();

export async function cles(code: string): Promise<string> {
  const deja = connus.get(code);
  if (deja) return deja;
  const { espace } = await deriverCles(code);
  connus.set(code, espace);
  return espace;
}
