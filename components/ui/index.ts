/* Les primitives du système visuel — douze d'origine, plus trois nées de la
   refonte mobile (feuille basse, feuille de confirmation, barre de
   progression).

   Elles ne portent AUCUN métier : ni calcul, ni accès aux dépôts, ni store.
   Une primitive qui sait ce qu'est une habitude n'est plus réutilisable, et
   son test devient un test de vue. */
export { Panel } from './Panel';
export { Card } from './Card';
export { Chip } from './Chip';
export { Switch } from './Switch';
export { Field, champStyle } from './Field';
export { Segmented } from './Segmented';
export { Sheet } from './Sheet';
export { Dialog } from './Dialog';
export { FeuilleBasse } from './FeuilleBasse';
export { FeuilleConfirmation } from './FeuilleConfirmation';
export { BarreProgression } from './BarreProgression';
export { Toast } from './Toast';
export { Tooltip } from './Tooltip';
export { Ring } from './Ring';
export { Icon, CategoryGlyph, GLYPHES_CATEGORIE, COULEURS_CATEGORIE, type IconName } from './Icon';
export { ENCRE_SUR_TEINTE } from './encre';
