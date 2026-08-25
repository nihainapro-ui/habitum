/* Import PAR DÉFAUT, pas nommé. Le build du 25 août 2026 avertissait :
   « Should not import the named export 'version' from default-exporting module
   (only default export is available soon) ». C'est un avertissement aujourd'hui
   et une rupture demain — un JSON n'expose proprement que son export par
   défaut. Corrigé avant que ça casse, pas après. */
import paquet from '@/package.json';
import { DB_VERSION } from '@/lib/storage/keys';

/* ============================================================================
   Identité de la version servie — tâche 8.8.

   Ce que ça rend possible : un rapport d'anomalie EXPLOITABLE. Sans compte et
   sans télémétrie, la seule chose qu'on saura d'un incident est ce que la
   personne aura bien voulu recopier. « Ça ne marche pas » n'est pas un rapport ;
   « v1.0.0, schéma 1, construit le 17 août » en est un — il dit quelle version
   du code, et surtout quelle version de SCHÉMA, ce qui est la seule question
   qui compte quand des données ont disparu (docs/RUNBOOK.md § 3).

   Les trois valeurs viennent de trois sources différentes, et aucune n'est
   recopiée à la main :

   - la version applicative est celle de `package.json`, celle que `git tag`
     suit ;
   - la version de schéma est `DB_VERSION`, celle que Dexie ouvre réellement ;
   - la date de construction est figée À LA COMPILATION par
     `NEXT_PUBLIC_BUILD_DATE` (voir `next.config.mjs`). Elle n'est PAS
     `new Date()` : les pages sont prérendues, une date évaluée au rendu serait
     celle du build de toute façon côté serveur, et celle de l'ouverture côté
     client — deux valeurs différentes pour le même écran, donc un chiffre
     fabriqué au sens de CLAUDE.md § 3.
   ========================================================================= */

export interface Version {
  /** Version applicative — `package.json`, suivie par les tags Git. */
  app: string;
  /** Version du schéma Dexie réellement ouvert. */
  schema: number;
  /** Date de construction, ISO, ou `null` si la variable n'a pas été posée. */
  builtAt: string | null;
}

/* `?? null` plutôt qu'une valeur de repli inventée : une date de construction
   absente doit se voir comme absente. Afficher la date du jour à la place
   serait exactement le chiffre fabriqué qu'on s'interdit. */
export const VERSION: Version = {
  app: paquet.version,
  schema: DB_VERSION,
  builtAt: process.env.NEXT_PUBLIC_BUILD_DATE ?? null,
};
