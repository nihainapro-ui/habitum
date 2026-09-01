import { syncDisponible } from '@/lib/sync/config';
import { CONTACT, DEPOT, HEBERGEUR, LANGUE_PAR_DEFAUT, type LangueSite } from '../routes';
import type { Bloc, ParLangue } from './types';

/* Confidentialité et mentions légales — tâche 7.6, lève D27 (partie publique).
 *
 * « C'EST L'ARGUMENT COMMERCIAL N° 1 — il doit être écrit et exact. » Le plan a
 * raison, et cela impose une contrainte inhabituelle : cette page ne doit
 * affirmer que ce que le produit fait réellement, y compris quand c'est moins
 * flatteur. D'où trois passages que personne n'écrirait pour vendre :
 *
 *   — le cookie `habitum.lang` est nommé, ainsi que sa durée ;
 *   — les journaux techniques de l'hébergeur sont mentionnés, parce qu'ils
 *     existent : nous ne les exploitons pas, nous ne pouvons pas dire qu'ils
 *     n'existent pas ;
 *   — le stockage local est présenté avec sa contrepartie — vider son
 *     navigateur efface tout.
 *
 * LA SECTION « SYNCHRONISATION » EST CONDITIONNELLE, et c'est le même
 * principe poussé d'un cran. Elle n'apparaît que si le déploiement a été
 * configuré avec un relais (`NEXT_PUBLIC_SYNC_URL`). Décrire un relais qui
 * n'existe pas sur cette installation serait exactement le genre
 * d'approximation que cette page refuse — dans un sens comme dans l'autre :
 * annoncer un envoi qui n'a pas lieu inquiète pour rien, taire un envoi qui a
 * lieu est bien pire. La variable étant lue à la compilation, la page
 * prérendue dit la vérité de SON déploiement.
 *
 * L'hébergeur et le contact viennent de `routes.ts`, pas d'une chaîne recopiée :
 * la décision C (tâche 7.9) peut encore changer l'hébergeur, et une page
 * opposable qui nomme le mauvais hébergeur est un problème, pas une coquille.
 */

const DATE_MAJ = '2026-08-15';

/** Date affichée, dans la langue de la page. */
export const dateLongue = (iso: string, langue: LangueSite): string => {
  const [a, m, j] = iso.split('-').map(Number);
  /* Formatage figé : `Intl` dépend du fuseau et de l'ICU embarqué, et ces
     pages sont prérendues sur la machine de construction. Un mois écrit à la
     main est déterministe. */
  const MOIS: Record<LangueSite, readonly string[]> = {
    fr: [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ],
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };
  const mois = MOIS[langue][(m ?? 1) - 1] ?? '';
  return langue === 'fr' ? `${j} ${mois} ${a}` : `${j} ${mois} ${a}`;
};

export const MISE_A_JOUR = DATE_MAJ;

/* Section « Synchronisation », rendue UNIQUEMENT si le déploiement a un relais.
   Les deux langues sont construites par la même fonction : le test de
   structure (`tests/unit/site-contenu.test.ts`) exige que FR et EN aient la
   même forme, et deux tableaux écrits à la main auraient divergé au premier
   ajout. */
const SYNC_FR: readonly Bloc[] = [
  { t: 'h2', x: 'Synchronisation entre appareils' },
  {
    t: 'p',
    x: 'La synchronisation est facultative et désactivée par défaut. Tant que vous ne l’avez pas activée, aucune requête ne quitte votre appareil — c’est vérifiable dans l’onglet « Réseau » de votre navigateur. L’activer ne demande ni compte, ni adresse électronique, ni mot de passe : un code de vingt caractères, engendré sur votre appareil, suffit à appairer deux installations.',
  },
  {
    t: 'p',
    x: 'Ce code est la seule clé. Il ne quitte jamais vos appareils : il n’est ni transmis au relais, ni déposé sur le site, ni connu de l’éditeur. Vos données sont chiffrées avec lui sur votre appareil AVANT de partir, et déchiffrées seulement à l’arrivée sur l’autre appareil. Le relais reçoit des octets qu’il ne peut pas lire, et il n’existe aucun moyen de les lui faire lire — perdu, le code n’est récupérable par personne, l’éditeur compris.',
  },
  {
    t: 'ul',
    x: [
      'Le relais ne voit ni vos habitudes, ni vos notes, ni vos horaires : il ne voit que du chiffré, un identifiant d’espace dérivé de votre code, et une date de modification.',
      'Cet identifiant d’espace n’est rattaché à aucun compte ni à aucune identité. Il est dérivé du code par une fonction à sens unique : il ne permet pas de remonter au code, ni à vous.',
      'Aucune adresse électronique, aucun nom, aucun profil n’est transmis, parce qu’il n’en existe aucun dans le produit.',
      'Vous pouvez désappairer un appareil à tout moment depuis les réglages. Il cesse alors d’envoyer et de recevoir, et les données déjà présentes sur lui restent : désappairer n’efface rien.',
      'Synchroniser n’est pas sauvegarder. Ce que vous supprimez sur un appareil est supprimé sur tous : l’export reste votre seule copie de secours.',
    ],
  },
];

const SYNC_EN: readonly Bloc[] = [
  { t: 'h2', x: 'Sync between devices' },
  {
    t: 'p',
    x: 'Sync is optional and off by default. Until you turn it on, no request leaves your device — you can confirm that in your browser’s Network tab. Turning it on requires no account, no email address and no password: a twenty-character code, generated on your device, is enough to pair two installations.',
  },
  {
    t: 'p',
    x: 'That code is the only key. It never leaves your devices: it is not sent to the relay, not stored on the site, and not known to the publisher. Your data is encrypted with it on your device BEFORE it leaves, and decrypted only once it reaches the other device. The relay receives bytes it cannot read, and there is no way to make it read them — lose the code and nobody can recover it, the publisher included.',
  },
  {
    t: 'ul',
    x: [
      'The relay sees neither your habits, nor your notes, nor your schedule: it sees ciphertext, a space identifier derived from your code, and a modification date.',
      'That space identifier is tied to no account and no identity. It is derived from the code by a one-way function: it leads back neither to the code nor to you.',
      'No email address, no name and no profile is transmitted, because none exists in the product.',
      'You can unpair a device at any time from the settings. It then stops sending and receiving, and the data already on it stays: unpairing erases nothing.',
      'Sync is not backup. Whatever you delete on one device is deleted on all of them: export remains your only safety copy.',
    ],
  },
];

const confidentialiteFr: readonly Bloc[] = [
  {
    t: 'p',
    x: `Habitum ne collecte aucune donnée personnelle. Il n’y a ni compte, ni profil serveur, ni traqueur, ni régie publicitaire. Cette page décrit exactement ce que le produit fait de vos données, et ce que l’hébergement du site implique malgré tout. Dernière mise à jour : ${dateLongue(DATE_MAJ, 'fr')}.`,
  },
  { t: 'h2', x: 'Ce qui est collecté' },
  {
    t: 'p',
    x: 'Rien. Aucune inscription n’est demandée, aucune adresse électronique n’est saisie, aucun identifiant n’est attribué. Tant que la synchronisation n’est pas activée, l’application ne transmet vos données à aucun destinataire : les pages sont statiques et le traitement se fait entièrement dans votre navigateur. Si vous appairez deux appareils, ce qui transite est chiffré sur l’appareil avant de partir — la section consacrée à la synchronisation le détaille.',
  },
  { t: 'h2', x: 'Où vivent vos données' },
  {
    t: 'p',
    x: 'Vos habitudes, tâches, objectifs, notes, sessions de minuteur et préférences sont écrites dans le stockage local de votre navigateur — la base IndexedDB de l’appareil que vous utilisez. Elles ne sont pas chiffrées : quiconque a accès à votre session sur cet appareil y a accès. Sur un poste partagé, un profil de navigateur distinct est la seule protection réellement efficace.',
  },
  {
    t: 'ul',
    x: [
      'Vous pouvez tout exporter à tout moment, dans un fichier JSON lisible, sans rien demander à personne.',
      'Vous pouvez tout supprimer depuis les réglages, en un geste, sans délai et sans confirmation par courriel.',
      'Vider les données de site de votre navigateur efface également tout, définitivement. C’est la contrepartie du stockage local, et elle est réelle.',
      'Une copie de secours est prise automatiquement avant chaque import et avant chaque réinitialisation. Elle reste elle aussi sur votre appareil.',
    ],
  },
  ...(syncDisponible() ? SYNC_FR : []),
  { t: 'h2', x: 'Cookies et traceurs' },
  {
    t: 'p',
    x: 'Un seul cookie est déposé, et il est déposé par le site lui-même : « habitum.lang », qui mémorise votre choix de langue. Il contient la valeur « fr » ou « en », il ne contient aucun identifiant, il expire au bout d’un an et il n’est jamais transmis à un tiers. Il relève de la préférence exprimée par l’utilisateur, et ne requiert donc pas de consentement préalable.',
  },
  {
    t: 'p',
    x: 'Il n’y a aucun autre cookie, aucun pixel de suivi, aucun script tiers, aucune police distante et aucune mesure d’audience — ni sur l’application, ni sur cette vitrine. La politique de sécurité de contenu servie par le site interdit techniquement toute origine tierce, et une suite de tests automatisée échoue si une seule requête sortante réapparaît.',
  },
  { t: 'h2', x: 'Hébergement et journaux techniques' },
  {
    t: 'p',
    x: `Le site est hébergé par ${HEBERGEUR.nom}, en région ${HEBERGEUR.region} (${HEBERGEUR.zone}, Union européenne). Comme tout hébergeur, il enregistre des journaux techniques de connexion — adresse IP, horodatage, ressource demandée — nécessaires au fonctionnement et à la sécurité du service. Ces journaux appartiennent à l’hébergeur, relèvent de sa propre politique, et ne sont ni consultés, ni exploités, ni recoupés par l’éditeur d’Habitum.`,
  },
  {
    t: 'p',
    x: 'C’est la seule donnée vous concernant qui existe en dehors de votre appareil, et elle existe pour toute page web que vous consultez, quelle qu’elle soit. La mentionner ici plutôt que de l’omettre est ce qui rend le reste de cette page crédible.',
  },
  { t: 'h2', x: 'Notifications et permissions' },
  {
    t: 'p',
    x: 'Si vous activez les rappels, le navigateur vous demande l’autorisation d’afficher des notifications — au moment où vous cliquez, jamais au chargement. Ces notifications sont produites localement, par votre appareil, à partir de vos propres réglages. Aucun serveur ne les déclenche et aucun jeton d’identification n’est transmis à un service de notification.',
  },
  { t: 'h2', x: 'Vos droits' },
  {
    t: 'p',
    x: 'Le règlement général sur la protection des données s’applique à un traitement de données personnelles. Aucun traitement de ce type n’ayant lieu, les droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité sont sans objet : il n’existe aucun fichier dont demander l’extrait, et personne à qui le demander.',
  },
  {
    t: 'p',
    x: `Ce qui existe en revanche, ce sont les gestes équivalents, exécutés par vous et sans intermédiaire : l’export produit la portabilité, la suppression produit l’effacement, et l’un comme l’autre sont immédiats. Pour toute question sur cette politique, le canal de contact est indiqué dans les mentions légales : ${CONTACT}.`,
  },
  { t: 'h2', x: 'Modification de cette politique' },
  {
    t: 'p',
    x: `Toute modification sera datée sur cette page. L’historique complet de ses versions est public, comme le reste du code : ${DEPOT}. Une politique de confidentialité dont on peut lire les révisions est une politique qu’on peut vérifier.`,
  },
];

const confidentialiteEn: readonly Bloc[] = [
  {
    t: 'p',
    x: `Habitum collects no personal data. There is no account, no server-side profile, no tracker and no ad network. This page describes exactly what the product does with your data, and what hosting the site nevertheless implies. Last updated: ${dateLongue(DATE_MAJ, 'en')}.`,
  },
  { t: 'h2', x: 'What is collected' },
  {
    t: 'p',
    x: 'Nothing. No sign-up is required, no email address is entered, no identifier is assigned. As long as sync is off, the app transmits your data to no recipient: the pages are static and all processing happens inside your browser. If you pair two devices, whatever travels is encrypted on the device before it leaves — the section on sync spells this out.',
  },
  { t: 'h2', x: 'Where your data lives' },
  {
    t: 'p',
    x: 'Your habits, tasks, goals, notes, timer sessions and preferences are written to your browser’s local storage — the IndexedDB database of the device you are using. They are not encrypted: anyone with access to your session on that device has access to them. On a shared machine, a separate browser profile is the only genuinely effective protection.',
  },
  {
    t: 'ul',
    x: [
      'You can export everything at any time, as readable JSON, without asking anyone.',
      'You can delete everything from the settings, in one gesture, with no delay and no email confirmation.',
      'Clearing your browser’s site data also erases everything, permanently. That is the price of local storage, and it is real.',
      'A backup is taken automatically before every import and every reset. It too stays on your device.',
    ],
  },
  ...(syncDisponible() ? SYNC_EN : []),
  { t: 'h2', x: 'Cookies and trackers' },
  {
    t: 'p',
    x: 'One cookie is set, and it is set by the site itself: “habitum.lang”, which remembers your language choice. It holds the value “fr” or “en”, contains no identifier, expires after one year and is never sent to a third party. It records a preference you expressed, and therefore requires no prior consent.',
  },
  {
    t: 'p',
    x: 'There is no other cookie, no tracking pixel, no third-party script, no remote font and no analytics — neither in the app nor on this site. The content security policy served by the site technically forbids every third-party origin, and an automated test suite fails if a single outgoing request reappears.',
  },
  { t: 'h2', x: 'Hosting and technical logs' },
  {
    t: 'p',
    x: `The site is hosted by ${HEBERGEUR.nom}, in region ${HEBERGEUR.region} (${HEBERGEUR.zone}, European Union). Like any host, it records technical connection logs — IP address, timestamp, requested resource — needed to run and secure the service. Those logs belong to the host, fall under its own policy, and are never read, exploited or cross-referenced by Habitum’s publisher.`,
  },
  {
    t: 'p',
    x: 'It is the only data concerning you that exists outside your device, and it exists for every web page you visit, whatever it is. Mentioning it here rather than omitting it is what makes the rest of this page credible.',
  },
  { t: 'h2', x: 'Notifications and permissions' },
  {
    t: 'p',
    x: 'If you turn reminders on, the browser asks your permission to show notifications — at the moment you click, never on page load. Those notifications are produced locally, by your device, from your own settings. No server triggers them and no identification token is sent to any notification service.',
  },
  { t: 'h2', x: 'Your rights' },
  {
    t: 'p',
    x: 'The General Data Protection Regulation applies to the processing of personal data. Since no such processing takes place, the rights of access, rectification, erasure, restriction, objection and portability have no object: there is no file to request an extract from, and nobody to request it from.',
  },
  {
    t: 'p',
    x: `What does exist are the equivalent actions, performed by you with no intermediary: export delivers portability, deletion delivers erasure, and both are immediate. For any question about this policy, the contact channel is given in the legal notice: ${CONTACT}.`,
  },
  { t: 'h2', x: 'Changes to this policy' },
  {
    t: 'p',
    x: `Any change will be dated on this page. The full history of its versions is public, like the rest of the code: ${DEPOT}. A privacy policy whose revisions can be read is a privacy policy that can be checked.`,
  },
];

const mentionsFr: readonly Bloc[] = [
  { t: 'h2', x: 'Éditeur' },
  {
    t: 'p',
    x: 'Habitum est un projet libre, publié sous licence MIT. Il n’est adossé à aucune société, ne poursuit aucune activité commerciale et ne perçoit aucun revenu — ni vente, ni abonnement, ni publicité, ni revente de données.',
  },
  { t: 'h2', x: 'Hébergeur' },
  {
    t: 'p',
    x: `Le site est hébergé par ${HEBERGEUR.nom}, en région ${HEBERGEUR.region} (${HEBERGEUR.zone}, Union européenne). Les journaux techniques de connexion relèvent de la politique de l’hébergeur ; ils sont décrits dans la politique de confidentialité.`,
  },
  { t: 'h2', x: 'Licence et code source' },
  {
    t: 'p',
    x: `Le code d’Habitum est public sous licence MIT : ${DEPOT}. Vous pouvez le lire, le modifier, le construire et l’héberger vous-même, y compris si ce site venait à disparaître. Les polices employées — Space Grotesk, JetBrains Mono et Archivo — sont sous licence SIL Open Font 1.1, dont le texte accompagne les fichiers servis.`,
  },
  { t: 'h2', x: 'Contact' },
  {
    t: 'p',
    x: `Signalement d’anomalie, question sur la confidentialité ou demande relative à ce site : ${CONTACT}. C’est le canal réellement relevé — préférer une adresse qui n’est pas lue serait cosmétique.`,
  },
  { t: 'h2', x: 'Responsabilité' },
  {
    t: 'p',
    x: 'Habitum est fourni « en l’état », sans garantie d’aucune sorte, conformément aux termes de la licence MIT. Vos données sont conservées sur votre appareil : leur sauvegarde relève de vous, et la fonction d’export existe pour la rendre possible à tout moment. Les guides publiés sur ce site décrivent l’usage du logiciel ; ils ne constituent ni un avis médical, ni un conseil professionnel.',
  },
];

const mentionsEn: readonly Bloc[] = [
  { t: 'h2', x: 'Publisher' },
  {
    t: 'p',
    x: 'Habitum is a free software project, published under the MIT licence. It is backed by no company, pursues no commercial activity and earns no revenue — no sales, no subscription, no advertising, no data resale.',
  },
  { t: 'h2', x: 'Host' },
  {
    t: 'p',
    x: `The site is hosted by ${HEBERGEUR.nom}, in region ${HEBERGEUR.region} (${HEBERGEUR.zone}, European Union). Technical connection logs fall under the host’s own policy; they are described in the privacy policy.`,
  },
  { t: 'h2', x: 'Licence and source code' },
  {
    t: 'p',
    x: `Habitum’s code is public under the MIT licence: ${DEPOT}. You can read it, modify it, build it and host it yourself, including if this site were to disappear. The fonts used — Space Grotesk, JetBrains Mono and Archivo — are under the SIL Open Font Licence 1.1, whose text ships alongside the served files.`,
  },
  { t: 'h2', x: 'Contact' },
  {
    t: 'p',
    x: `Bug reports, privacy questions or any request about this site: ${CONTACT}. That is the channel actually monitored — offering an address nobody reads would be cosmetic.`,
  },
  { t: 'h2', x: 'Liability' },
  {
    t: 'p',
    x: 'Habitum is provided “as is”, without warranty of any kind, under the terms of the MIT licence. Your data is kept on your device: backing it up is yours to do, and the export feature exists to make that possible at any time. The guides published on this site describe how to use the software; they constitute neither medical advice nor professional counsel.',
  },
];

export const CONFIDENTIALITE: ParLangue<readonly Bloc[]> = {
  fr: confidentialiteFr,
  en: confidentialiteEn,
};

export const MENTIONS: ParLangue<readonly Bloc[]> = { fr: mentionsFr, en: mentionsEn };

/** Langue de repli si une page légale venait à manquer — elle ne le peut pas,
 *  le type l'interdit, mais l'intention est écrite. */
export const LANGUE_LEGALE_PAR_DEFAUT = LANGUE_PAR_DEFAUT;
