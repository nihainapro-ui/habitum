/* Les étiquettes de règles axe, déclarées UNE SEULE FOIS.

   WCAG 2.2 en plus de 2.1 — et `wcag22aa` n'est pas décoratif : c'est lui qui
   apporte `target-size` (§ 2.5.8), la règle de taille des cibles. `a11y.spec.ts`
   s'arrête à `wcag2aa` ; l'étendre est l'essentiel de ce que la tâche 8.3
   ajoutait côté outil.

   ELLES VIVENT ICI, ET PAS DANS UN FICHIER DE TEST, depuis le lot C. Le contrôle
   d'accessibilité du dialogue du mois (`shell.spec.ts`) devait s'aligner sur
   celui d'`a11y-approfondie.spec.ts` ; l'importer de là aurait été le geste
   naturel, mais Playwright REFUSE qu'un fichier de test en importe un autre
   (« test file should not import test file ») — il chargerait deux fois les
   tests du fichier importé. Recopier la liste, à l'inverse, aurait laissé deux
   étiquetages diverger en silence : le jour où l'un gagne `wcag23aa`, l'autre
   continuerait de dire qu'il vérifie la même chose. Un module d'aide tranche
   les deux problèmes à la fois. */
export const ETIQUETTES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;
