import type { Guide, LangueSite } from '../routes';
import type { Article, ParLangue } from './types';

/* Les trois guides — tâche 7.5.
 *
 * Ils décrivent HABITUM appliqué à un usage, pas une méthode qu'on garantirait.
 * Le guide sur l'alcool porte un avertissement explicite : le sevrage peut être
 * médicalement dangereux, et une application de suivi n'est pas un soin. Ne pas
 * l'écrire serait un défaut, pas une omission de style. */

const PUBLIE = '2026-08-15';
const RELU = '2026-08-15';

const alcoolFr: Article = {
  titre: 'Suivre une réduction ou un arrêt de l’alcool avec une application privée',
  description:
    'Comment paramétrer un suivi d’arrêt ou de réduction de l’alcool dans Habitum : type plafond, séries honnêtes, objectif de réduction. Données strictement locales.',
  chapeau:
    'Suivre sa consommation d’alcool produit la donnée la plus intime qu’une application d’habitudes puisse contenir. C’est aussi l’usage où le choix de l’outil compte le plus : ce guide explique comment le paramétrer dans Habitum, et pourquoi le fait que rien ne quitte votre appareil n’est pas ici un argument de vente.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'Avertissement d’abord, parce qu’il ne peut pas venir après : l’arrêt brutal d’une consommation importante d’alcool peut être dangereux, et le sevrage relève d’un accompagnement médical. Habitum est un carnet de suivi. Il n’évalue rien, ne conseille rien et ne remplace ni un médecin, ni un service d’addictologie. Si vous vous posez la question, posez-la à un professionnel de santé — le carnet viendra ensuite.',
    },
    { t: 'h2', x: 'Pourquoi le stockage local change tout, ici' },
    {
      t: 'p',
      x: 'Un journal de consommation est une donnée de santé. Elle intéresse des assureurs, elle peut être lue par un proche, elle peut se retrouver dans une sauvegarde qu’on avait oubliée. La plupart des applications de suivi la transmettent à un serveur, parce que leur modèle repose sur un compte. Habitum n’a pas de serveur : la donnée est écrite dans le stockage de votre navigateur, sur votre appareil, et il n’existe aucun chemin par lequel elle pourrait partir. Vous pouvez le vérifier vous-même en ouvrant l’onglet réseau de votre navigateur.',
    },
    { t: 'h2', x: 'Le bon type d’habitude : le plafond' },
    {
      t: 'p',
      x: 'Une réduction ne se modélise pas avec une case à cocher. Ce que vous voulez suivre, ce n’est pas « ai-je bu aujourd’hui » mais « suis-je resté sous ce que je m’étais fixé ». Créez donc une habitude de type plafond, avec une unité — le verre standard — et une cible quotidienne.',
    },
    {
      t: 'ol',
      x: [
        'Créez une habitude, choisissez le type « plafond », nommez-la simplement.',
        'Fixez la cible du jour : la valeur que vous ne voulez pas dépasser. Pour un arrêt complet, c’est zéro.',
        'Programmez-la tous les jours. Une réduction se mesure tous les jours, y compris ceux où l’on ne boit pas.',
        'Chaque soir, saisissez la valeur du jour. Y compris quand elle est zéro : c’est cette saisie qui valide la journée.',
      ],
    },
    {
      t: 'p',
      x: 'Ce dernier point est le plus important, et c’est celui qu’Habitum traite différemment de la plupart des applications. Une journée sous plafond n’est PAS comptée réussie tant que rien n’a été saisi. Autrement dit, oublier d’ouvrir l’application ne fabrique pas une journée réussie. Sans cette règle, un suivi de réduction afficherait une série parfaite le jour où l’on cesse de le tenir — exactement au moment où la série devrait alerter.',
    },
    { t: 'h2', x: 'Compter en unités, pas en soirées' },
    {
      t: 'p',
      x: 'Une habitude de plafond n’a de sens que si l’unité est stable. « Deux verres » ne veut rien dire si le premier est un ballon de vin et le second un cocktail. Fixez donc une unité une fois pour toutes — le verre standard, tel que les repères de consommation le définissent dans votre pays — et convertissez au moment de la saisie. Une bouteille de vin partagée à trois ne se note pas « une soirée » : elle se note en unités, même approximativement.',
    },
    {
      t: 'p',
      x: 'L’approximation est acceptable, l’incohérence ne l’est pas. Un journal où la même quantité vaut tantôt un, tantôt trois, produit une courbe qui ne mesure que votre humeur au moment de la saisie. Mieux vaut une règle grossière appliquée tous les jours qu’une règle exacte appliquée un jour sur deux — et c’est vrai de tout le suivi d’habitudes, pas seulement de celui-ci.',
    },
    { t: 'h2', x: 'L’objectif de réduction, pour voir la pente' },
    {
      t: 'p',
      x: 'Le plafond mesure les journées ; il ne montre pas la trajectoire. Créez en plus un objectif de type « réduction » : une valeur de départ — votre moyenne hebdomadaire actuelle, honnêtement estimée — et une cible à atteindre pour une date. Alimenté par l’habitude de plafond, il avance tout seul, sans double saisie.',
    },
    {
      t: 'p',
      x: 'Choisissez une échéance lointaine et une cible modeste. Un objectif à trois mois qui demande de diviser par deux est tenable ; un objectif à trois semaines qui demande de tout arrêter est un objectif qu’on abandonne, et l’abandon coûte plus cher que la lenteur.',
    },
    { t: 'h2', x: 'Lire ce que le suivi montre' },
    {
      t: 'ul',
      x: [
        'La série en cours indique la régularité récente. Elle tombe à la première journée dépassée — c’est brutal, et c’est le but.',
        'Le record est ce qui reste après une rechute. Il ne disparaît pas, et il rappelle que la chose a déjà été faite une fois.',
        'Le taux de réussite sur 30 et 90 jours est la mesure qui compte réellement. Une série cassée ne dit rien ; trois mois à 80 % disent beaucoup.',
        'La carte de chaleur sur six mois fait apparaître ce qu’aucun chiffre ne montre : les jours de semaine à risque, les périodes creuses, l’effet des vacances.',
      ],
    },
    { t: 'h2', x: 'Une note sur les rechutes' },
    {
      t: 'p',
      x: 'Un outil de suivi n’a aucun avis à donner sur une journée manquée, et Habitum n’en donne pas : pas de pénalité, pas de personnage qui perd des points, pas de notification culpabilisante. Une journée dépassée est une donnée. Elle casse une série, elle n’efface pas un record, et elle ne change rien au taux sur quatre-vingt-dix jours.',
    },
    { t: 'h2', x: 'Protéger le journal' },
    {
      t: 'ul',
      x: [
        'Exportez régulièrement. Le fichier est du JSON lisible, et il est à vous : conservez-le où vous voulez, ou pas du tout.',
        'Vider les données de votre navigateur efface tout, définitivement. C’est la contrepartie du stockage local, et c’est aussi ce qui garantit qu’il n’en existe pas de copie ailleurs.',
        'Sur un appareil partagé, utilisez un profil de navigateur séparé. C’est la seule protection réellement efficace, et elle ne dépend pas de nous.',
        'Un second profil dans Habitum permet de séparer ce suivi du reste de vos habitudes, sur le même appareil.',
      ],
    },
  ],
};

const alcoolEn: Article = {
  titre: 'Tracking an alcohol reduction with a private app',
  description:
    'How to set up an alcohol reduction or quit tracker in Habitum: ceiling type, honest streaks, reduction goal. Data stays strictly on your device.',
  chapeau:
    'Tracking how much you drink produces the most intimate data a habit app can hold. It is also the use where the choice of tool matters most: this guide explains how to set it up in Habitum, and why “nothing leaves your device” is not a sales line here.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'A warning first, because it cannot come later: stopping a heavy alcohol intake abruptly can be dangerous, and withdrawal is a matter for medical supervision. Habitum is a logbook. It assesses nothing, advises nothing, and replaces neither a doctor nor an addiction service. If you are asking yourself the question, ask a health professional — the logbook comes afterwards.',
    },
    { t: 'h2', x: 'Why local storage changes everything here' },
    {
      t: 'p',
      x: 'A drinking log is health data. Insurers have an interest in it, a relative can read it, and it can resurface in a backup you had forgotten. Most tracking apps send it to a server, because their model rests on an account. Habitum has no server: the data is written to your browser’s storage, on your device, and there is no path by which it could leave. You can check that yourself by opening your browser’s network tab.',
    },
    { t: 'h2', x: 'The right habit type: the ceiling' },
    {
      t: 'p',
      x: 'A reduction does not fit in a checkbox. What you want to track is not “did I drink today” but “did I stay under what I set myself”. So create a ceiling habit, with a unit — the standard drink — and a daily target.',
    },
    {
      t: 'ol',
      x: [
        'Create a habit, choose the “ceiling” type, name it plainly.',
        'Set the daily target: the value you do not want to exceed. For a full stop, that is zero.',
        'Schedule it every day. A reduction is measured every day, including the ones where you do not drink.',
        'Each evening, enter the day’s value. Including when it is zero: that entry is what validates the day.',
      ],
    },
    {
      t: 'p',
      x: 'That last point is the important one, and it is where Habitum differs from most apps. A day under the ceiling is NOT counted as a success until something has been entered. In other words, forgetting to open the app does not manufacture a successful day. Without that rule, a reduction tracker would show a perfect streak the day you stop keeping it — exactly when the streak ought to be raising an alarm.',
    },
    { t: 'h2', x: 'Count in units, not in evenings' },
    {
      t: 'p',
      x: 'A ceiling habit only means something if the unit is stable. “Two drinks” says nothing if the first is a glass of wine and the second a cocktail. So fix a unit once and for all — the standard drink, as your country’s drinking guidelines define it — and convert as you enter. A bottle of wine shared between three people is not logged as “an evening”: it is logged in units, even roughly.',
    },
    {
      t: 'p',
      x: 'Roughness is acceptable; inconsistency is not. A log where the same quantity is sometimes one and sometimes three produces a curve that measures nothing but your mood at the moment of entry. A crude rule applied every day beats an exact rule applied every other day — and that is true of all habit tracking, not only this one.',
    },
    { t: 'h2', x: 'The reduction goal, to see the slope' },
    {
      t: 'p',
      x: 'The ceiling measures days; it does not show the trajectory. Add a “reduction” goal on top: a starting value — your current weekly average, honestly estimated — and a target to reach by a date. Fed by the ceiling habit, it advances on its own, with no double entry.',
    },
    {
      t: 'p',
      x: 'Pick a distant deadline and a modest target. A three-month goal that asks you to halve is achievable; a three-week goal that asks you to stop entirely is a goal you abandon, and abandoning costs more than going slowly.',
    },
    { t: 'h2', x: 'Reading what the tracker shows' },
    {
      t: 'ul',
      x: [
        'The current streak shows recent consistency. It falls on the first day over the ceiling — that is blunt, and it is the point.',
        'The record is what remains after a relapse. It does not disappear, and it is a reminder that the thing has already been done once.',
        'The success rate over 30 and 90 days is the measure that actually matters. A broken streak says nothing; three months at 80% says a great deal.',
        'The six-month heatmap reveals what no single figure shows: the risky weekdays, the flat periods, the effect of a holiday.',
      ],
    },
    { t: 'h2', x: 'A note on relapses' },
    {
      t: 'p',
      x: 'A tracker has no business having an opinion about a missed day, and Habitum does not: no penalty, no character losing points, no guilt-tripping notification. A day over the ceiling is a data point. It breaks a streak, it does not erase a record, and it changes nothing about the ninety-day rate.',
    },
    { t: 'h2', x: 'Protecting the log' },
    {
      t: 'ul',
      x: [
        'Export regularly. The file is readable JSON, and it is yours: keep it wherever you like, or not at all.',
        'Clearing your browser data erases everything, permanently. That is the price of local storage, and it is also what guarantees no copy exists anywhere else.',
        'On a shared device, use a separate browser profile. It is the only genuinely effective protection, and it does not depend on us.',
        'A second profile inside Habitum lets you keep this log apart from the rest of your habits, on the same device.',
      ],
    },
  ],
};

const ecransFr: Article = {
  titre: 'Suivre son temps d’écran comme une habitude, et pas comme une statistique',
  description:
    'Le rapport de temps d’écran de votre téléphone constate ; il ne fait rien changer. Voici comment en faire une habitude mesurée, avec un plafond quotidien et un objectif de réduction.',
  chapeau:
    'Tous les téléphones affichent désormais un temps d’écran hebdomadaire. Presque personne ne l’utilise pour changer quoi que ce soit, et ce n’est pas un manque de volonté : un rapport qui arrive le dimanche ne pilote rien. Voici comment transformer ce chiffre en habitude suivie.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'Le rapport intégré de votre téléphone est un constat rétrospectif. Il est précis, complet, et parfaitement inerte : il vous apprend le dimanche que la semaine est passée. Une habitude, elle, se décide le soir même, avec une cible connue d’avance et une trace qui s’accumule. C’est la différence entre mesurer et piloter.',
    },
    { t: 'h2', x: 'Décider ce que l’on mesure' },
    {
      t: 'p',
      x: 'La première erreur est de vouloir mesurer « le temps d’écran » en bloc. Le chiffre global mélange un trajet en transport, un appel à sa famille et deux heures de défilement machinal ; le réduire n’a pas de sens, et le suivre déprime sans rien apprendre. Choisissez une cible étroite : une application précise, ou une plage horaire précise.',
    },
    {
      t: 'ul',
      x: [
        'Une application nommée — la seule sur laquelle vous savez perdre du temps. Le rapport du système vous en donne le total quotidien.',
        'Une plage : après vingt-deux heures, ou pendant les repas. La cible est alors « zéro minute sur cette plage », et elle se juge en un coup d’œil.',
        'Un nombre de déverrouillages, si votre problème est la fréquence plutôt que la durée. C’est souvent le meilleur indicateur, et le plus ignoré.',
      ],
    },
    { t: 'h2', x: 'Le paramétrage dans Habitum' },
    {
      t: 'ol',
      x: [
        'Créez une habitude de type plafond, en minutes, avec une cible réaliste. Si vous êtes à quatre-vingt-dix minutes par jour, visez soixante — pas quinze.',
        'Programmez-la tous les jours, y compris le week-end : c’est souvent là que le chiffre explose, et l’exclure revient à cacher le problème.',
        'Chaque soir, relevez le chiffre du rapport du système et saisissez-le. La saisie prend cinq secondes et c’est elle qui valide la journée.',
        'Ajoutez un objectif de type « réduction » alimenté par cette habitude : il montre la pente sur des semaines, là où le plafond ne montre que des journées.',
      ],
    },
    {
      t: 'p',
      x: 'Comme pour toute habitude de plafond, une journée n’est pas comptée réussie tant qu’aucune valeur n’a été saisie. C’est volontaire : sans cette règle, arrêter de relever son temps d’écran produirait mécaniquement une série parfaite, et l’outil récompenserait exactement le comportement qu’il devait détecter.',
    },
    { t: 'h2', x: 'La contrepartie : lui donner une place' },
    {
      t: 'p',
      x: 'Réduire un usage sans le remplacer marche rarement plus de deux semaines. Créez donc une seconde habitude, positive celle-là, et de type durée : lecture, marche, instrument, n’importe quoi qui occupe le même créneau. Le minuteur intégré crédite directement les minutes de cette habitude, sans saisie manuelle.',
    },
    {
      t: 'p',
      x: 'Suivre les deux ensemble change la lecture. Une semaine où le temps d’écran remonte alors que la lecture s’effondre raconte quelque chose ; la même semaine, vue à travers le seul chiffre d’écran, raconte un échec sans cause.',
    },
    { t: 'h2', x: 'Lire les six mois' },
    {
      t: 'p',
      x: 'La carte de chaleur est ici plus utile que partout ailleurs. Le temps d’écran est saisonnier : il monte en période de charge, il monte en vacances, il monte quand on dort mal. Sur six mois, les motifs se voient — et une cause identifiée vaut mieux que dix résolutions.',
    },
    {
      t: 'p',
      x: 'Le taux de réussite sur trente et quatre-vingt-dix jours est la mesure à regarder. Une série de dix-huit jours brisée un vendredi soir ne dit rien de solide ; trois mois à soixante-quinze pour cent disent que la cible est bien choisie et qu’elle tient.',
    },
    { t: 'h2', x: 'Les trois erreurs qui font abandonner' },
    {
      t: 'ol',
      x: [
        'Une cible trop basse dès la première semaine. Passer de quatre-vingt-dix minutes à quinze produit six échecs en six jours, et la septième journée on supprime l’habitude. Une cible se descend par paliers, quand le palier précédent tient depuis deux semaines.',
        'Suivre le total du téléphone au lieu d’une application nommée. Le total mêle des usages que vous ne voulez pas réduire, et il ne baisse jamais assez pour encourager. On finit par conclure que « ça ne marche pas », alors que c’est la mesure qui était mauvaise.',
        'Ne rien saisir les mauvais jours. Ce sont exactement ceux qui portent l’information : un mois où seules les bonnes journées sont notées produit une courbe flatteuse et parfaitement inutile. Une journée dépassée notée vaut mieux que dix journées absentes.',
      ],
    },
    {
      t: 'p',
      x: 'La troisième erreur est la plus fréquente, et c’est celle contre laquelle la règle du plafond protège : sans valeur saisie, la journée n’est pas comptée réussie. Le suivi ne peut donc pas se maquiller tout seul par abandon.',
    },
    { t: 'h2', x: 'Ce que ce suivi ne fait pas' },
    {
      t: 'p',
      x: 'Habitum ne lit pas votre temps d’écran automatiquement, et n’essaiera pas. Une page web n’a pas accès aux statistiques d’usage du système, et une application qui y accéderait devrait demander une permission dont la portée dépasse largement le suivi d’une habitude. La saisie est manuelle, elle prend cinq secondes, et elle a un effet secondaire utile : elle vous fait regarder le chiffre en face, chaque soir.',
    },
  ],
};

const ecransEn: Article = {
  titre: 'Track screen time as a habit, not as a statistic',
  description:
    'Your phone’s screen-time report observes; it changes nothing. Here is how to turn it into a measured habit, with a daily ceiling and a reduction goal.',
  chapeau:
    'Every phone now shows a weekly screen-time figure. Almost nobody uses it to change anything, and that is not a lack of willpower: a report that arrives on Sunday steers nothing. Here is how to turn that figure into a tracked habit.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'Your phone’s built-in report is a retrospective observation. It is accurate, complete and perfectly inert: it tells you on Sunday that the week has gone. A habit, by contrast, is decided the same evening, against a target you knew in advance, and it leaves a trace that accumulates. That is the difference between measuring and steering.',
    },
    { t: 'h2', x: 'Deciding what to measure' },
    {
      t: 'p',
      x: 'The first mistake is trying to measure “screen time” as one block. The global figure mixes a commute, a call to your family and two hours of mindless scrolling; reducing it makes no sense, and tracking it is depressing without being informative. Pick a narrow target: one specific app, or one specific time window.',
    },
    {
      t: 'ul',
      x: [
        'One named app — the one you know you lose time in. The system report gives you its daily total.',
        'A window: after ten at night, or during meals. The target is then “zero minutes in that window”, and it is judged at a glance.',
        'A number of unlocks, if your problem is frequency rather than duration. It is often the better indicator, and the most ignored.',
      ],
    },
    { t: 'h2', x: 'Setting it up in Habitum' },
    {
      t: 'ol',
      x: [
        'Create a ceiling habit, in minutes, with a realistic target. If you are at ninety minutes a day, aim for sixty — not fifteen.',
        'Schedule it every day, weekends included: that is usually where the figure explodes, and excluding them just hides the problem.',
        'Each evening, read the figure from the system report and enter it. It takes five seconds, and it is that entry which validates the day.',
        'Add a “reduction” goal fed by this habit: it shows the slope across weeks, where the ceiling only shows single days.',
      ],
    },
    {
      t: 'p',
      x: 'As with every ceiling habit, a day is not counted as a success until a value has been entered. That is deliberate: without the rule, giving up on logging your screen time would mechanically produce a perfect streak, and the tool would reward exactly the behaviour it was meant to catch.',
    },
    { t: 'h2', x: 'The counterpart: give it somewhere to go' },
    {
      t: 'p',
      x: 'Cutting a use without replacing it rarely lasts more than two weeks. So create a second habit, a positive one, of the duration type: reading, walking, an instrument, anything that fills the same slot. The built-in timer credits minutes straight to that habit, with no manual entry.',
    },
    {
      t: 'p',
      x: 'Tracking both together changes the reading. A week where screen time climbs while reading collapses tells you something; the same week seen through the screen figure alone tells you about a failure with no cause.',
    },
    { t: 'h2', x: 'Reading six months' },
    {
      t: 'p',
      x: 'The heatmap is more useful here than anywhere else. Screen time is seasonal: it rises under workload, it rises on holiday, it rises when you sleep badly. Across six months the patterns show — and one identified cause beats ten resolutions.',
    },
    {
      t: 'p',
      x: 'The success rate over thirty and ninety days is the figure to watch. An eighteen-day streak broken on a Friday night says nothing solid; three months at seventy-five per cent say the target is well chosen and that it holds.',
    },
    { t: 'h2', x: 'The three mistakes that end the attempt' },
    {
      t: 'ol',
      x: [
        'A target set too low in the first week. Going from ninety minutes to fifteen produces six failures in six days, and on the seventh you delete the habit. A target comes down in steps, when the previous step has held for a fortnight.',
        'Tracking the phone’s overall total instead of one named app. The total mixes in uses you do not want to reduce, and it never drops enough to be encouraging. You end up concluding that “it does not work”, when it was the measurement that was wrong.',
        'Logging nothing on the bad days. Those are exactly the ones carrying the information: a month where only the good days are recorded produces a flattering and entirely useless curve. One logged day over the ceiling beats ten missing days.',
      ],
    },
    {
      t: 'p',
      x: 'The third mistake is the most common, and it is the one the ceiling rule protects against: with no value entered, the day is not counted as a success. The tracker therefore cannot flatter itself by being abandoned.',
    },
    { t: 'h2', x: 'What this tracker does not do' },
    {
      t: 'p',
      x: 'Habitum does not read your screen time automatically, and will not try. A web page has no access to system usage statistics, and an app that did would need a permission whose scope goes far beyond tracking a single habit. Entry stays manual, it takes five seconds, and it has a useful side effect that automation would remove: it makes you look the number in the face, every evening, before you decide anything about tomorrow.',
    },
  ],
};

const pomodoroFr: Article = {
  titre: 'Pomodoro et habitudes : compter le temps réellement travaillé',
  description:
    'La méthode Pomodoro produit une donnée que presque personne ne garde. Voici comment relier le minuteur à une habitude de durée, et obtenir des minutes mesurées plutôt qu’estimées.',
  chapeau:
    'La méthode Pomodoro tient en une phrase : vingt-cinq minutes de travail, cinq de pause, une pause longue tous les quatre cycles. Ce qu’on en retient rarement, c’est qu’elle produit une donnée — le nombre de cycles réellement terminés — et que presque personne ne la garde.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'La force de la méthode n’est pas la durée de vingt-cinq minutes, qui n’a rien de magique. C’est le fait de décider à l’avance d’une unité de travail indivisible, et de la protéger. Un cycle commencé se termine ou se perd : cette règle simple élimine la question « je regarde juste ce message », qui coûte plus cher que le message.',
    },
    { t: 'h2', x: 'Le chaînon manquant : une habitude de durée' },
    {
      t: 'p',
      x: 'Un minuteur Pomodoro seul ne laisse rien derrière lui. Vous savez que la séance s’est bien passée, vous ne savez pas combien d’heures vous avez réellement travaillé ce mois-ci. Dans Habitum, une session terminée peut créditer une habitude de type durée : les minutes vont directement dans le journal, sans saisie manuelle et sans estimation.',
    },
    {
      t: 'ol',
      x: [
        'Créez une habitude de type durée — « travail concentré », « écriture », « révisions » — avec une cible quotidienne en minutes.',
        'Restez modeste : cent minutes par jour, soit quatre cycles, est déjà une journée de travail concentré considérable. Une cible à quatre heures se rate tous les jours, et une habitude qu’on rate tous les jours est une habitude qu’on supprime.',
        'Ouvrez la vue Focus, choisissez le mode Pomodoro et désignez l’habitude comme cible de la session.',
        'Travaillez. À la fin de la session, les minutes sont créditées et la journée avance vers sa cible.',
      ],
    },
    {
      t: 'p',
      x: 'Le point important est que ces minutes sont mesurées, pas déclarées. Un compte sans session affiche zéro minute — jamais une estimation, jamais une moyenne. C’est une règle du produit entier : aucun chiffre affiché n’est fabriqué.',
    },
    { t: 'h2', x: 'Régler les durées' },
    {
      t: 'ul',
      x: [
        'Vingt-cinq minutes est un point de départ, pas une loi. Pour un travail qui demande une longue mise en route — code, rédaction, mathématiques — cinquante minutes suivies de dix perdent moins de temps en démarrages.',
        'La pause courte doit vraiment être une pause. Répondre à un message n’en est pas une : le coût de reprise est le même qu’après une interruption subie.',
        'La pause longue tous les quatre cycles est ce qui rend la journée tenable. La sauter est le meilleur moyen de faire trois cycles de moins l’après-midi.',
        'La fin de phase se signale même hors de la vue Focus : le minuteur est ancré sur l’horloge murale, pas sur l’onglet actif — changer de fenêtre ou verrouiller l’écran ne le met pas en pause en silence.',
        'Désignez l’habitude cible avant de démarrer, jamais après. Une session créditée à la mauvaise habitude est un chiffre à corriger à la main, et un chiffre corrigé à la main est le début d’un journal auquel on cesse de se fier.',
      ],
    },
    { t: 'h2', x: 'Une séance n’est pas une habitude' },
    {
      t: 'p',
      x: 'La confusion la plus commune consiste à traiter le nombre de cycles comme l’habitude elle-même. Ce n’est pas la même chose. Le cycle est un outil de séance : il protège une unité de travail pendant une heure ou deux. L’habitude, elle, se juge sur des semaines, et sa cible est un volume quotidien — pas un nombre de cycles, qui varie selon leur longueur.',
    },
    {
      t: 'p',
      x: 'Concrètement, cela veut dire une seule habitude de durée par domaine de travail, et non une habitude par type de séance. Trois habitudes — « Pomodoro », « travail profond », « relecture » — se partagent les mêmes minutes, se ratent séparément et finissent par ne plus rien signifier. Une seule habitude, alimentée par toutes les séances quel que soit leur mode, donne une courbe lisible et un taux de réussite qui veut dire quelque chose.',
    },
    { t: 'h2', x: 'Ce que trois mois de données montrent' },
    {
      t: 'p',
      x: 'Une fois quelques semaines accumulées, les statistiques disent des choses qu’aucune impression ne dit. Le total de minutes par semaine révèle l’écart entre le travail perçu et le travail fait — il est presque toujours dans le même sens. La carte de chaleur montre les jours réellement productifs, et ils ne sont pas ceux qu’on croit. Le taux de réussite sur trente jours indique si la cible quotidienne est bien calibrée : au-dessus de quatre-vingt-dix pour cent, elle est trop basse ; en dessous de quarante, elle est décorative.',
    },
    {
      t: 'p',
      x: 'C’est aussi la meilleure défense contre une illusion courante : croire qu’une journée chargée a été une journée productive. Les deux ne se recouvrent presque jamais, et seule une mesure le montre.',
    },
    { t: 'h2', x: 'Relier au reste' },
    {
      t: 'p',
      x: 'Une habitude de durée peut alimenter un objectif cumulatif : « cent heures de travail concentré sur ce trimestre ». L’objectif avance quand l’habitude avance, sans double saisie, et il affiche le rythme requis pour tenir l’échéance — donnée plus utile qu’un pourcentage, parce qu’elle est actionnable dès aujourd’hui.',
    },
    {
      t: 'p',
      x: 'Enfin, les tâches et le calendrier restent séparés du minuteur, et c’est volontaire. Une session de focus mesure du temps ; elle ne prétend pas savoir sur quoi il a été passé. Ce lien-là, seul vous pouvez le faire, et une note du jour suffit à le garder.',
    },
  ],
};

const pomodoroEn: Article = {
  titre: 'Pomodoro and habits: counting the time you actually worked',
  description:
    'The Pomodoro method produces data that almost nobody keeps. Here is how to connect the timer to a duration habit, and get measured minutes instead of estimated ones.',
  chapeau:
    'The Pomodoro method fits in one sentence: twenty-five minutes of work, five of break, a long break every four cycles. What is rarely kept from it is that it produces data — the number of cycles actually completed — and that almost nobody records it.',
  publieLe: PUBLIE,
  reluLe: RELU,
  blocs: [
    {
      t: 'p',
      x: 'The strength of the method is not the twenty-five minutes, which are in no way magical. It is deciding in advance on an indivisible unit of work, and then protecting it. A started cycle is either finished or lost: that one rule eliminates “I will just check this message”, which costs far more than the message — the interruption itself is cheap, the reconstruction of what you were holding in your head is not.',
    },
    { t: 'h2', x: 'The missing link: a duration habit' },
    {
      t: 'p',
      x: 'A Pomodoro timer on its own leaves nothing behind. You know the session went well; you do not know how many hours you actually worked this month. In Habitum, a completed session can credit a duration habit: the minutes go straight into the log, with no manual entry and no estimate.',
    },
    {
      t: 'ol',
      x: [
        'Create a duration habit — “deep work”, “writing”, “revision” — with a daily target in minutes.',
        'Stay modest: a hundred minutes a day, four cycles, is already a substantial day of concentrated work. A four-hour target is missed every day, and a habit missed every day is a habit you delete.',
        'Open the Focus view, choose Pomodoro mode and set the habit as the session’s target.',
        'Work. At the end of the session the minutes are credited and the day moves towards its target.',
      ],
    },
    {
      t: 'p',
      x: 'The important part is that these minutes are measured, not declared. An account with no session shows zero minutes — never an estimate, never an average. That is a rule across the whole product: no displayed figure is manufactured.',
    },
    { t: 'h2', x: 'Setting the durations' },
    {
      t: 'ul',
      x: [
        'Twenty-five minutes is a starting point, not a law. For work with a long warm-up — code, writing, mathematics — fifty minutes followed by ten loses less time to restarts.',
        'The short break has to be an actual break. Answering a message is not one: the cost of resuming is the same as after an interruption you did not choose.',
        'The long break every four cycles is what makes the day survivable. Skipping it is the surest way to do three cycles fewer in the afternoon.',
        'The end of a phase announces itself even outside the Focus view: the timer is anchored to the wall clock, not to the active tab, so switching windows or locking the screen does not silently pause it.',
        'Set the target habit before you start, not after. A session credited to the wrong habit is a figure you will have to correct by hand, and a figure corrected by hand is the beginning of a log you stop trusting.',
      ],
    },
    { t: 'h2', x: 'A session is not a habit' },
    {
      t: 'p',
      x: 'The most common confusion is treating the number of cycles as the habit itself. They are not the same thing. The cycle is a session tool: it protects a unit of work for an hour or two. The habit is judged across weeks, and its target is a daily volume — not a number of cycles, which varies with their length.',
    },
    {
      t: 'p',
      x: 'In practice that means one duration habit per area of work, not one habit per kind of session. Three habits — “Pomodoro”, “deep work”, “review” — share the same minutes, get missed separately and end up meaning nothing. A single habit, fed by every session whatever its mode, gives a readable curve and a success rate that says something.',
    },
    { t: 'h2', x: 'What three months of data show' },
    {
      t: 'p',
      x: 'Once a few weeks have accumulated, the statistics say things no impression says. The weekly total of minutes reveals the gap between perceived work and completed work — it almost always leans the same way. The heatmap shows the genuinely productive days, and they are not the ones you would name. The thirty-day success rate tells you whether the daily target is well calibrated: above ninety per cent it is too low; below forty it is decorative.',
    },
    {
      t: 'p',
      x: 'It is also the best defence against a common illusion: believing a busy day was a productive one. The two almost never overlap, and only a measurement shows it.',
    },
    { t: 'h2', x: 'Connecting it to the rest' },
    {
      t: 'p',
      x: 'A duration habit can feed a cumulative goal: “one hundred hours of deep work this quarter”. The goal advances when the habit does, with no double entry, and it displays the pace required to meet the deadline — more useful than a percentage, because it is actionable today.',
    },
    {
      t: 'p',
      x: 'Finally, tasks and the calendar stay separate from the timer, and that is deliberate. A focus session measures time; it does not pretend to know what the time was spent on. Guessing that link automatically would produce exactly the kind of manufactured figure the whole product refuses. Only you can make it, and a note attached to the day is enough to keep it — two lines written while the session is still fresh are worth more than any automatic attribution.',
    },
  ],
};

const GUIDES_PAR_LANGUE: Readonly<Record<Guide, ParLangue<Article>>> = {
  alcool: { fr: alcoolFr, en: alcoolEn },
  ecrans: { fr: ecransFr, en: ecransEn },
  pomodoro: { fr: pomodoroFr, en: pomodoroEn },
};

export const guide = (id: Guide, langue: LangueSite): Article => GUIDES_PAR_LANGUE[id][langue];

export const tousLesGuides = GUIDES_PAR_LANGUE;
