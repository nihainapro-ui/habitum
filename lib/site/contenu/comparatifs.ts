import type { Comparatif, LangueSite } from '../routes';
import type { Article, ParLangue } from './types';

/* Les trois comparatifs — tâche 7.5.
 *
 * RÈGLE ÉDITORIALE, et elle n'est pas décorative : rien n'est affirmé sur un
 * produit tiers qui ne soit pas vérifiable publiquement à la date de relecture.
 * Concrètement, chaque comparatif se limite à quatre faits — plateformes,
 * modèle économique, existence d'un compte, emplacement des données — et
 * donne le lien officiel où les revérifier. Tout le reste du texte parle
 * d'Habitum, où nous savons de quoi nous parlons.
 *
 * Un comparatif faux se retourne contre le produit : c'est écrit dans le plan,
 * et c'est la raison pour laquelle il n'y a ici aucun jugement de valeur sur
 * une ergonomie, aucun chiffre d'utilisateurs, et aucune comparaison de prix
 * au centime — un prix change, une page ne se met pas à jour toute seule. */

const PUBLIE = '2026-08-15';
const RELU = '2026-08-15';

const habitnowFr: Article = {
  titre: 'Alternative à HabitNow, gratuite et sans compte : Habitum',
  description:
    'HabitNow et Habitum suivent tous deux vos habitudes sans compte. Ce qui les sépare : les plateformes, le modèle économique et la profondeur du modèle de suivi. Comparatif daté.',
  chapeau:
    'HabitNow est une application Android de suivi d’habitudes, distribuée sur Google Play, gratuite à l’usage avec un déblocage payant. Habitum est une application web installable, entièrement gratuite, dont le code est public. Si vous cherchez une alternative qui ne demande toujours pas de compte mais qui fonctionne aussi sur un ordinateur, voici ce qui change réellement.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [
    {
      nom: 'HabitNow — Google Play',
      url: 'https://play.google.com/store/apps/details?id=com.hlgprojects.dailyplanner',
    },
  ],
  blocs: [
    {
      t: 'p',
      x: 'Commençons par le point d’accord, parce qu’il est important : ni HabitNow ni Habitum ne vous demandent de créer un compte pour commencer. C’est déjà rare dans cette catégorie, où la norme reste l’inscription obligatoire suivie d’une synchronisation dont personne n’a demandé le détail. Sur ce point précis, les deux produits font le même choix, et c’est le bon.',
    },
    { t: 'h2', x: 'Les différences qui se vérifient' },
    {
      t: 'p',
      x: 'Quatre critères se contrôlent sans nous croire sur parole : sur quelles plateformes l’application tourne, ce qu’elle coûte, si elle exige un compte, et où les données atterrissent. Le tableau ci-dessous ne dit rien d’autre.',
    },
    {
      t: 'tableau',
      legende: 'Comparaison sur des critères publics, relue le 15 août 2026.',
      entetes: ['', 'HabitNow', 'Habitum'],
      lignes: [
        [
          'Plateformes',
          'Android (Google Play)',
          'Tout navigateur récent, installable en application',
        ],
        [
          'Modèle économique',
          'Gratuit avec limites, déblocage payant',
          'Gratuit, sans version payante',
        ],
        ['Compte requis', 'Non', 'Non'],
        [
          'Où sont les données',
          'Sur l’appareil, avec sauvegarde/restauration',
          'Sur l’appareil (IndexedDB), export et import de fichier',
        ],
        ['Code source', 'Fermé', 'Public, licence MIT'],
      ],
    },
    {
      t: 'p',
      x: 'La différence de plateforme est la plus structurante. HabitNow est une application Android : elle vit sur le téléphone, et seulement là. Habitum est une page web installable — elle s’ouvre sur un téléphone Android, un iPhone, un ordinateur portable, une tablette, sans changer de produit ni de version. En contrepartie, elle n’a pas d’accès aux fonctions du système qu’une application native obtient d’office.',
    },
    { t: 'h2', x: 'Ce que « gratuit » veut dire des deux côtés' },
    {
      t: 'p',
      x: 'Un modèle « gratuit avec déblocage payant » est un modèle honnête : on essaie, et on paie si le produit devient utile. Sa contrepartie est qu’une partie du produit est conçue pour être hors d’atteinte tant qu’on n’a pas payé, et que la frontière peut bouger d’une version à l’autre.',
    },
    {
      t: 'p',
      x: 'Habitum n’a pas de frontière parce qu’il n’a rien à vendre. Ce n’est pas une position morale, c’est une conséquence de l’architecture : sans serveur, sans base de données, sans authentification, le produit ne coûte rien à faire tourner. Il n’y a pas de facture à répercuter, donc pas de raison d’en fabriquer une. Le jour où une fonction demanderait un serveur — une synchronisation entre appareils, par exemple — la question se reposerait ; c’est pourquoi elle n’existe pas.',
    },
    { t: 'h2', x: 'Le modèle de suivi : sept types, pas deux' },
    {
      t: 'p',
      x: 'C’est là qu’Habitum se sépare vraiment de la catégorie. La plupart des applications d’habitudes savent faire deux choses : cocher une case, et compter une quantité. Cela couvre « méditer aujourd’hui » et « boire huit verres d’eau ». Cela ne couvre pas la moitié des habitudes que les gens veulent réellement tenir.',
    },
    {
      t: 'ul',
      x: [
        'Un plafond : « pas plus de trois cafés ». Ce n’est pas une case à cocher, et ce n’est pas une quantité à atteindre — c’est une quantité à ne pas dépasser.',
        'Un cumul qui court sur plusieurs jours : « 100 km ce mois-ci », sans remise à zéro quotidienne.',
        'Une durée créditée par un minuteur, pour ne pas saisir à la main ce qu’une horloge sait compter.',
        'Une liste de sous-tâches, réussie quand toutes sont faites — une routine du matin, par exemple.',
        'Une valeur exacte, ni plus ni moins.',
      ],
    },
    {
      t: 'p',
      x: 'Le type « plafond » mérite une précision, parce que c’est celui que les implémentations ratent le plus souvent : une journée sous plafond n’est pas réussie d’avance. Tant qu’aucune valeur n’est journalisée pour aujourd’hui, la journée n’est pas comptée comme réussie. Sinon, une habitude de réduction afficherait une série parfaite pour la seule raison qu’on ne l’a pas encore ouverte — et une série qui ment ne sert à rien.',
    },
    { t: 'h2', x: 'Ce qu’Habitum ne fait pas, et qu’il ne fera pas' },
    {
      t: 'p',
      x: 'Il n’y a pas de synchronisation automatique entre vos appareils. Pour passer du téléphone à l’ordinateur, on exporte un fichier et on l’importe. C’est un geste, il est visible, et il est volontaire. Une synchronisation transparente demanderait un compte et un serveur qui reçoit vos données : exactement ce que le produit refuse, et exactement ce qui rend la promesse « rien ne quitte l’appareil » vérifiable.',
    },
    {
      t: 'p',
      x: 'Il n’y a pas non plus de notifications poussées depuis un serveur. Les rappels sont posés par le navigateur, sur l’appareil, et ne fonctionnent donc que si celui-ci est allumé et l’application installée. C’est moins fiable qu’une notification native : autant le dire ici plutôt que de le laisser découvrir.',
    },
    { t: 'h2', x: 'Comment essayer sans rien perdre' },
    {
      t: 'ol',
      x: [
        'Ouvrez Habitum. L’application démarre sur un compte vierge : rien n’est pré-rempli, et le jeu de démonstration est un lien séparé, signalé dans l’interface.',
        'Recréez deux ou trois habitudes que vous suivez déjà ailleurs — dont une de type plafond, c’est le test le plus parlant.',
        'Au bout d’une semaine, exportez. Le fichier est du JSON lisible : vous pouvez l’ouvrir, le lire, le garder. C’est votre porte de sortie, et elle est ouverte dès le premier jour.',
      ],
    },
  ],
};

const habitnowEn: Article = {
  titre: 'A free HabitNow alternative that needs no account: Habitum',
  description:
    'HabitNow and Habitum both track habits without an account. What separates them: platforms, pricing model, and how deep the tracking model goes. Dated comparison.',
  chapeau:
    'HabitNow is an Android habit tracker distributed on Google Play, free to use with a paid unlock. Habitum is an installable web app, free throughout, with public source code. If you are looking for an alternative that still does not ask for an account but also runs on a computer, here is what actually differs.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [
    {
      nom: 'HabitNow on Google Play',
      url: 'https://play.google.com/store/apps/details?id=com.hlgprojects.dailyplanner',
    },
  ],
  blocs: [
    {
      t: 'p',
      x: 'Start with the point of agreement, because it matters: neither HabitNow nor Habitum asks you to create an account before you begin. That is already rare in this category, where the norm is a mandatory sign-up followed by a sync nobody asked to have explained. On that specific point the two products make the same choice, and it is the right one.',
    },
    { t: 'h2', x: 'The differences you can check' },
    {
      t: 'p',
      x: 'Four criteria can be verified without taking anyone’s word: which platforms the app runs on, what it costs, whether it requires an account, and where the data ends up. The table below says nothing beyond that.',
    },
    {
      t: 'tableau',
      legende: 'Comparison on public criteria, reviewed on 15 August 2026.',
      entetes: ['', 'HabitNow', 'Habitum'],
      lignes: [
        ['Platforms', 'Android (Google Play)', 'Any modern browser, installable as an app'],
        ['Pricing model', 'Free with limits, paid unlock', 'Free, with no paid tier'],
        ['Account required', 'No', 'No'],
        [
          'Where the data lives',
          'On the device, with backup and restore',
          'On the device (IndexedDB), file export and import',
        ],
        ['Source code', 'Closed', 'Public, MIT licence'],
      ],
    },
    {
      t: 'p',
      x: 'The platform difference is the structural one. HabitNow is an Android application: it lives on the phone, and only there. Habitum is an installable web page — it opens on an Android phone, an iPhone, a laptop or a tablet without changing product or version. In exchange, it has none of the system access a native app gets by default.',
    },
    { t: 'h2', x: 'What “free” means on each side' },
    {
      t: 'p',
      x: 'A “free with a paid unlock” model is an honest one: you try, and you pay if the product turns out to be useful. Its trade-off is that part of the product is designed to stay out of reach until you pay, and that the boundary can move from one version to the next.',
    },
    {
      t: 'p',
      x: 'Habitum has no boundary because it has nothing to sell. That is not a moral stance, it is a consequence of the architecture: with no server, no database and no authentication, the product costs nothing to run. There is no bill to pass on, so there is no reason to invent one. The day a feature required a server — cross-device sync, for instance — the question would come back; that is exactly why it does not exist.',
    },
    { t: 'h2', x: 'The tracking model: seven types, not two' },
    {
      t: 'p',
      x: 'This is where Habitum genuinely leaves the category. Most habit apps can do two things: tick a box, and count a quantity. That covers “meditate today” and “drink eight glasses of water”. It does not cover half the habits people actually want to hold.',
    },
    {
      t: 'ul',
      x: [
        'A ceiling: “no more than three coffees”. That is not a checkbox, and it is not a quantity to reach — it is a quantity not to exceed.',
        'A total that runs across days: “100 km this month”, with no daily reset.',
        'A duration credited by a timer, so you do not type in what a clock can count.',
        'A subtask list, successful when every item is done — a morning routine, for example.',
        'An exact value, no more and no less.',
      ],
    },
    {
      t: 'p',
      x: 'The ceiling type deserves a note, because it is the one implementations most often get wrong: a day under the ceiling is not a success in advance. As long as no value has been logged for today, the day does not count as a success. Otherwise a reduction habit would show a perfect streak for the sole reason that you have not opened it yet — and a streak that lies is worth nothing.',
    },
    { t: 'h2', x: 'What Habitum does not do, and will not do' },
    {
      t: 'p',
      x: 'There is no automatic sync between your devices. To move from phone to computer, you export a file and import it. It is a gesture, it is visible, and it is deliberate. Transparent sync would require an account and a server that receives your data: precisely what the product refuses, and precisely what makes “nothing leaves the device” a checkable claim.',
    },
    {
      t: 'p',
      x: 'There are no server-pushed notifications either. Reminders are scheduled by the browser, on the device, and therefore only work when it is on and the app is installed. That is less reliable than a native notification: better said here than discovered later.',
    },
    { t: 'h2', x: 'How to try it without losing anything' },
    {
      t: 'ol',
      x: [
        'Open Habitum. It starts on an empty account: nothing is pre-filled, and the demo data set is a separate link, flagged inside the interface.',
        'Recreate two or three habits you already track elsewhere — including a ceiling one, which is the most revealing test.',
        'After a week, export. The file is readable JSON: you can open it, read it, keep it. That is your way out, and it is open from day one.',
      ],
    },
  ],
};

const habiticaFr: Article = {
  titre: 'Habitica sans compte : pourquoi c’est impossible, et par quoi le remplacer',
  description:
    'Habitica exige un compte : ses données vivent sur ses serveurs, c’est son fonctionnement même. Habitum tient le même carnet d’habitudes sans compte, sans serveur et sans jeu. Comparatif daté.',
  chapeau:
    'La question revient souvent : peut-on utiliser Habitica sans créer de compte ? La réponse honnête est non, et ce n’est pas un oubli des développeurs — c’est la conséquence directe de ce qu’Habitica est. Voici pourquoi, et ce que change une application de suivi qui n’a, elle, aucun compte à proposer.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [
    { nom: 'Habitica — site officiel', url: 'https://habitica.com' },
    { nom: 'Habitica — code source', url: 'https://github.com/HabitRPG/habitica' },
  ],
  blocs: [
    {
      t: 'p',
      x: 'Habitica transforme le suivi d’habitudes en jeu de rôle : un personnage, des points d’expérience, des dégâts quand on manque une tâche, des quêtes en groupe. C’est une idée forte, et pour beaucoup de gens elle fonctionne là où les listes classiques échouent. Le produit est en outre publié sous licence libre, ce qui est loin d’être la norme.',
    },
    { t: 'h2', x: 'Pourquoi le compte n’est pas négociable' },
    {
      t: 'p',
      x: 'Le compte n’est pas une case à décocher dans les réglages d’Habitica : c’est la fondation. Un personnage qui progresse, des groupes, des quêtes partagées, un état cohérent entre le téléphone et le navigateur — tout cela suppose un état conservé du côté du service, donc une identité pour le retrouver. Retirer le compte reviendrait à retirer le jeu, c’est-à-dire le produit.',
    },
    {
      t: 'p',
      x: 'La conséquence pratique est simple : vos habitudes, vos tâches et votre historique vivent sur les serveurs d’Habitica. Il existe une porte de sortie — le code est public et le service peut être hébergé par vous-même — mais elle demande une machine, un peu d’administration système et l’envie de s’en occuper. Pour l’immense majorité des gens, ce n’est pas une option, c’est une phrase.',
    },
    { t: 'h2', x: 'Ce que les deux produits comparent réellement' },
    {
      t: 'tableau',
      legende: 'Comparaison sur des critères publics, relue le 15 août 2026.',
      entetes: ['', 'Habitica', 'Habitum'],
      lignes: [
        ['Compte requis', 'Oui', 'Non'],
        [
          'Où sont les données',
          'Sur les serveurs du service',
          'Sur votre appareil, jamais ailleurs',
        ],
        [
          'Modèle économique',
          'Gratuit, avec abonnement et achats optionnels',
          'Gratuit, sans version payante',
        ],
        ['Plateformes', 'Web, iOS, Android', 'Tout navigateur récent, installable'],
        ['Code source', 'Public, licence libre', 'Public, licence MIT'],
        ['Ressort principal', 'Jeu de rôle et groupe', 'Mesure et régularité'],
      ],
    },
    { t: 'h2', x: 'Le jeu : une force, et une dépendance' },
    {
      t: 'p',
      x: 'La gamification résout un vrai problème — l’ennui — et elle en crée un autre : elle déplace la motivation vers le jeu. Tant que le jeu tient, l’habitude tient. Quand on décroche du jeu, on décroche des deux. Ce n’est pas un défaut d’Habitica, c’est le prix du mécanisme, et il vaut la peine d’être connu avant d’investir six mois d’historique.',
    },
    {
      t: 'p',
      x: 'Habitum ne propose aucun ressort de ce genre. Il n’y a ni personnage, ni points, ni pénalité, ni classement. Ce qu’il donne à la place, ce sont des chiffres qui ne mentent pas : série en cours, record, taux de réussite sur 7, 30, 90 ou 365 jours, carte de chaleur sur six mois — tous calculés depuis votre journal réel, et jamais estimés. Une habitude sans donnée affiche zéro, pas une moyenne plausible.',
    },
    { t: 'h2', x: 'Sept types d’habitude, trois types d’objectif' },
    {
      t: 'p',
      x: 'Là où Habitica distingue habitudes, tâches quotidiennes et à-faire, Habitum distingue ce qu’une habitude MESURE : une case, une quantité, une durée, un cumul pluri-journalier, une liste de sous-tâches, un plafond à ne pas dépasser, une valeur exacte. Les objectifs, eux, se déclinent en cumul, jalons datés et réduction — et peuvent être alimentés par une habitude, ce qui évite de saisir deux fois la même chose.',
    },
    {
      t: 'p',
      x: 'Cette granularité n’a d’intérêt que si elle est juste. C’est pourquoi le moteur de calcul est vérifié à chaque livraison contre 62 valeurs de référence : séries, taux, cumuls, cas limites de changement d’heure et de fin de mois. Un écart d’une seule valeur arrête la livraison.',
    },
    { t: 'h2', x: 'Ce que devient l’historique quand on part' },
    {
      t: 'p',
      x: 'La question se pose rarement au moment de s’inscrire, et toujours au moment de partir. Un service qui héberge vos données décide de leur format d’export, de sa complétude, et du jour où il cesse d’exister. Habitica publie son code, ce qui atténue beaucoup ce risque : le format est lisible par qui veut le lire. Mais l’export reste une fonction du service, pas une propriété de vos données.',
    },
    {
      t: 'p',
      x: 'Avec un stockage local, l’équation s’inverse. Le fichier d’export est le format de travail lui-même : du JSON, lisible dans n’importe quel éditeur de texte, réimportable, validé avant d’être appliqué et accompagné d’un rapport indiquant ce qui a été lu, gardé et écarté. Une copie de secours est prise automatiquement avant chaque import et avant chaque réinitialisation. Le jour où Habitum cesserait d’être maintenu, vos fichiers resteraient exploitables, et le dépôt resterait constructible.',
    },
    { t: 'h2', x: 'Comment choisir' },
    {
      t: 'ul',
      x: [
        'Vous tenez grâce au groupe, aux quêtes et à la progression d’un personnage : Habitica est fait pour cela, et Habitum ne le remplacera pas.',
        'Vous voulez que rien ne sorte de votre appareil, sans avoir à héberger quoi que ce soit : c’est exactement ce que fait Habitum.',
        'Vous suivez une réduction — alcool, cigarettes, écrans, dépenses : le type « plafond » d’Habitum est conçu pour cela, et il ne compte jamais une journée réussie tant que rien n’a été saisi.',
        'Vous changez souvent d’appareil dans la journée : la synchronisation automatique d’Habitica est un vrai avantage, et Habitum vous demandera d’exporter un fichier.',
      ],
    },
  ],
};

const habiticaEn: Article = {
  titre: 'Habitica without an account: why it cannot work, and what to use instead',
  description:
    'Habitica requires an account: its data lives on its servers, and that is how the product works. Habitum keeps the same habit log with no account and no server. Dated comparison.',
  chapeau:
    'The question comes up often: can you use Habitica without creating an account? The honest answer is no, and it is not an oversight by the developers — it follows directly from what Habitica is. Here is why, and what changes with a tracker that has no account to offer in the first place.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [
    { nom: 'Habitica — official site', url: 'https://habitica.com' },
    { nom: 'Habitica — source code', url: 'https://github.com/HabitRPG/habitica' },
  ],
  blocs: [
    {
      t: 'p',
      x: 'Habitica turns habit tracking into a role-playing game: a character, experience points, damage when you miss a task, group quests. It is a strong idea, and for many people it works where plain lists fail. The product is also published under a free software licence, which is far from the norm.',
    },
    { t: 'h2', x: 'Why the account is not negotiable' },
    {
      t: 'p',
      x: 'The account is not a checkbox in Habitica’s settings: it is the foundation. A character that progresses, parties, shared quests, a consistent state between phone and browser — all of that assumes state held on the service’s side, and therefore an identity to find it again. Removing the account would mean removing the game, which is to say the product.',
    },
    {
      t: 'p',
      x: 'The practical consequence is simple: your habits, tasks and history live on Habitica’s servers. There is a way out — the code is public and the service can be self-hosted — but it needs a machine, some system administration and the appetite to keep it running. For the vast majority of people that is not an option, it is a sentence in a document.',
    },
    { t: 'h2', x: 'What the two products really compare on' },
    {
      t: 'tableau',
      legende: 'Comparison on public criteria, reviewed on 15 August 2026.',
      entetes: ['', 'Habitica', 'Habitum'],
      lignes: [
        ['Account required', 'Yes', 'No'],
        ['Where the data lives', 'On the service’s servers', 'On your device, nowhere else'],
        [
          'Pricing model',
          'Free, with an optional subscription and purchases',
          'Free, with no paid tier',
        ],
        ['Platforms', 'Web, iOS, Android', 'Any modern browser, installable'],
        ['Source code', 'Public, free software licence', 'Public, MIT licence'],
        ['Main mechanism', 'Role-playing and group play', 'Measurement and consistency'],
      ],
    },
    { t: 'h2', x: 'The game: a strength, and a dependency' },
    {
      t: 'p',
      x: 'Gamification solves a real problem — boredom — and creates another: it moves the motivation into the game. As long as the game holds, the habit holds. When you drop the game, you drop both, and the habit that was supposed to outlive the tool goes with it. That is not a flaw in Habitica, it is the price of the mechanism, and it is worth knowing before you invest six months of history in it.',
    },
    {
      t: 'p',
      x: 'Habitum offers no such lever. There is no character, no points, no penalty, no leaderboard. What it gives instead are figures that do not lie: current streak, record, success rate over 7, 30, 90 or 365 days, a six-month heatmap — all computed from your real log, never estimated. A habit with no data shows zero, not a plausible average.',
    },
    { t: 'h2', x: 'Seven habit types, three goal types' },
    {
      t: 'p',
      x: 'Where Habitica separates habits, dailies and to-dos, Habitum separates what a habit MEASURES: a box, a quantity, a duration, a multi-day total, a subtask list, a ceiling not to exceed, an exact value. Goals come in three shapes — cumulative, dated milestones, reduction — and can be fed by a habit, which spares you entering the same thing twice.',
    },
    {
      t: 'p',
      x: 'That granularity is only worth having if it is correct. This is why the calculation engine is checked on every release against 62 reference values: streaks, rates, totals, daylight-saving and end-of-month edge cases. A single mismatch stops the release.',
    },
    { t: 'h2', x: 'What happens to the history when you leave' },
    {
      t: 'p',
      x: 'The question rarely comes up when signing up, and always when leaving. A service that hosts your data decides its export format, how complete it is, and the day it stops existing. Habitica publishes its code, which greatly reduces that risk: the format is readable by anyone who wants to read it. But the export remains a feature of the service, not a property of your data.',
    },
    {
      t: 'p',
      x: 'With local storage the equation flips. The export file is the working format itself: JSON, readable in any text editor, re-importable, validated before it is applied and accompanied by a report of what was read, kept and rejected. A backup is taken automatically before every import and before every reset. The day Habitum stopped being maintained, your files would remain usable, and the repository would remain buildable.',
    },
    { t: 'h2', x: 'How to choose' },
    {
      t: 'ul',
      x: [
        'You keep going thanks to the party, the quests and a character that levels up: Habitica is built for that, and Habitum will not replace it.',
        'You want nothing to leave your device, without having to host anything: that is exactly what Habitum does.',
        'You are tracking a reduction — alcohol, cigarettes, screens, spending: Habitum’s ceiling type is designed for it, and it never counts a day as a success until something has been logged.',
        'You switch devices several times a day: Habitica’s automatic sync is a genuine advantage, and Habitum will ask you to export a file.',
      ],
    },
  ],
};

const streaksFr: Article = {
  titre: 'Streaks sur Android : l’alternative qui marche partout',
  description:
    'Streaks est une application Apple : pas de version Android, pas de version web. Habitum suit les mêmes séries sur n’importe quel appareil, gratuitement et sans compte. Comparatif daté.',
  chapeau:
    'Streaks est une application de suivi d’habitudes très soignée, vendue sur l’App Store et réservée à l’écosystème Apple. Il n’en existe pas de version Android, et il n’y en aura probablement jamais : c’est un choix de conception, pas un retard de calendrier. Si vous arrivez ici après avoir changé de téléphone, voici l’équivalent le plus proche.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [{ nom: 'Streaks — site officiel', url: 'https://streaksapp.com' }],
  blocs: [
    {
      t: 'p',
      x: 'Streaks fait une chose et la fait bien : maintenir des séries, avec une interface dense, une montre au poignet et une intégration profonde dans les données de santé du système. Ce niveau d’intégration est aussi ce qui l’enferme : il est bâti sur des interfaces propres à Apple, et il ne se transpose pas.',
    },
    { t: 'h2', x: 'Le tableau, sur des critères vérifiables' },
    {
      t: 'tableau',
      legende: 'Comparaison sur des critères publics, relue le 15 août 2026.',
      entetes: ['', 'Streaks', 'Habitum'],
      lignes: [
        [
          'Plateformes',
          'iPhone, iPad, Apple Watch, Mac',
          'Tout navigateur récent — Android, iOS, Windows, macOS, Linux',
        ],
        ['Modèle économique', 'Achat payant sur l’App Store', 'Gratuit, sans version payante'],
        ['Compte requis', 'Non — synchronisation par le compte du système', 'Non'],
        [
          'Où sont les données',
          'Sur l’appareil, synchronisées par le nuage du système',
          'Sur votre appareil, export et import de fichier',
        ],
        ['Montre connectée', 'Oui', 'Non'],
        ['Code source', 'Fermé', 'Public, licence MIT'],
      ],
    },
    {
      t: 'p',
      x: 'Deux lignes méritent d’être lues ensemble. Streaks vous offre une synchronisation qui « marche toute seule » — au prix d’un écosystème unique. Habitum vous offre l’inverse : n’importe quel appareil, au prix d’un export à faire soi-même. Aucune des deux réponses n’est la bonne dans l’absolu ; elles répondent à deux questions différentes.',
    },
    { t: 'h2', x: 'Ce que vous retrouverez' },
    {
      t: 'ul',
      x: [
        'Les séries, avec la série en cours ET le record — parce que la seconde est ce qui reste quand la première tombe.',
        'Une programmation par jours de la semaine, un jour sur N, ou X fois par semaine ou par mois.',
        'Une carte de chaleur sur six mois, qui montre la régularité mieux qu’un pourcentage.',
        'Des habitudes de durée, créditées par un minuteur intégré plutôt que saisies à la main.',
        'Un fonctionnement hors ligne complet, une fois l’application installée.',
      ],
    },
    { t: 'h2', x: 'Ce que vous ne retrouverez pas' },
    {
      t: 'p',
      x: 'Pas de montre connectée, pas de widget de système, pas de lecture de vos données de santé. Une application web n’a pas accès à ces choses, et prétendre le contraire serait mentir. Si cocher une habitude depuis le poignet est ce qui vous fait tenir, Habitum ne remplacera pas Streaks — et il vaut mieux le savoir en trois lignes qu’en trois semaines.',
    },
    {
      t: 'p',
      x: 'Il n’y a pas non plus de synchronisation automatique. Le passage d’un appareil à l’autre se fait par un fichier exporté puis importé, avec un rapport visible de ce qui a été lu, gardé et écarté. C’est plus fruste ; c’est aussi la raison pour laquelle aucune de vos données n’a besoin de transiter par le serveur de quiconque.',
    },
    { t: 'h2', x: 'Installer une application web sur Android' },
    {
      t: 'p',
      x: 'Le mot « web » fait craindre un onglet perdu parmi trente autres. Ce n’est pas ce dont il s’agit. Ouvrez Habitum dans votre navigateur, puis « Installer l’application » depuis le menu : elle obtient une icône sur l’écran d’accueil, sa propre fenêtre sans barre d’adresse, et un démarrage direct. Le même geste existe sur iPhone, sur ordinateur portable et sur tablette, avec la même application et le même stockage local sur chacun.',
    },
    {
      t: 'p',
      x: 'Une fois installée, elle fonctionne hors connexion : une vue déjà ouverte se recharge et répond en mode avion. C’est éprouvé par une suite de tests automatisée, pas seulement annoncé — le rechargement hors ligne a d’ailleurs été un défaut réel du produit avant d’être corrigé, ce qui est précisément la raison pour laquelle il est testé aujourd’hui.',
    },
    { t: 'h2', x: 'Ce que coûte réellement un achat unique' },
    {
      t: 'p',
      x: 'Un achat unique sur une boutique d’applications est un bon modèle : on paie une fois, sans abonnement, et l’éditeur n’a aucune raison de collecter des données pour se financer. Sa contrepartie tient en un mot : la boutique. L’application n’existe que là où la boutique existe, elle suit les règles de la boutique, et changer d’écosystème signifie repayer — quand un équivalent existe.',
    },
    {
      t: 'p',
      x: 'Habitum ne coûte rien parce qu’il n’a rien à financer : pas de serveur, pas de base de données, pas d’authentification, donc pas de facture mensuelle à répercuter. Le code est public sous licence MIT : vous pouvez le construire et l’héberger vous-même si le projet s’arrêtait. C’est une garantie d’une autre nature qu’un achat, et elle ne dépend d’aucune boutique.',
    },
    { t: 'h2', x: 'Repartir de zéro, proprement' },
    {
      t: 'p',
      x: 'Changer d’application de suivi coûte toujours la même chose : l’historique. Il n’existe pas d’import automatique depuis Streaks, et en inventer un serait promettre une correspondance de modèles qui n’existe pas. La méthode qui marche est plus simple : notez vos records actuels, recréez les cinq ou six habitudes qui comptent vraiment, et laissez le reste. Une liste de vingt habitudes recopiées d’un produit à l’autre est une liste qu’on abandonne en deux semaines.',
    },
    {
      t: 'p',
      x: 'Enfin, exportez dès la première semaine. Le fichier est du JSON lisible, réimportable, validé avant d’être appliqué, et une copie de secours est prise automatiquement avant chaque import. Vous n’aurez plus jamais à faire confiance à qui que ce soit pour récupérer vos données.',
    },
  ],
};

const streaksEn: Article = {
  titre: 'Streaks on Android: the alternative that runs everywhere',
  description:
    'Streaks is an Apple-only app: no Android version, no web version. Habitum tracks the same streaks on any device, free and without an account. Dated comparison.',
  chapeau:
    'Streaks is a beautifully made habit tracker, sold on the App Store and confined to the Apple ecosystem. There is no Android version, and there probably never will be: that is a design choice, not a delayed roadmap. If you landed here after changing phones, this is the closest equivalent.',
  publieLe: PUBLIE,
  reluLe: RELU,
  sources: [{ nom: 'Streaks — official site', url: 'https://streaksapp.com' }],
  blocs: [
    {
      t: 'p',
      x: 'Streaks does one thing and does it well: keeping streaks alive, with a dense interface, a watch on your wrist and deep integration into the system’s health data. That level of integration is also what locks it in: it is built on Apple-specific interfaces, and it does not transpose.',
    },
    { t: 'h2', x: 'The table, on checkable criteria' },
    {
      t: 'tableau',
      legende: 'Comparison on public criteria, reviewed on 15 August 2026.',
      entetes: ['', 'Streaks', 'Habitum'],
      lignes: [
        [
          'Platforms',
          'iPhone, iPad, Apple Watch, Mac',
          'Any modern browser — Android, iOS, Windows, macOS, Linux',
        ],
        ['Pricing model', 'Paid purchase on the App Store', 'Free, with no paid tier'],
        ['Account required', 'No — sync through the system account', 'No'],
        [
          'Where the data lives',
          'On the device, synced through the system cloud',
          'On your device, file export and import',
        ],
        ['Smartwatch', 'Yes', 'No'],
        ['Source code', 'Closed', 'Public, MIT licence'],
      ],
    },
    {
      t: 'p',
      x: 'Two rows are worth reading together. Streaks gives you sync that “just works” — at the price of a single ecosystem. Habitum gives you the opposite: any device, at the price of an export you perform yourself. Neither answer is right in the abstract; they answer two different questions.',
    },
    { t: 'h2', x: 'What you will find again' },
    {
      t: 'ul',
      x: [
        'Streaks, with both the current one AND the record — because the second is what remains when the first breaks.',
        'Scheduling by weekday, every N days, or X times a week or a month.',
        'A six-month heatmap, which shows consistency better than any percentage.',
        'Duration habits, credited by a built-in timer rather than typed in by hand.',
        'Full offline operation, once the app is installed.',
      ],
    },
    { t: 'h2', x: 'What you will not find' },
    {
      t: 'p',
      x: 'No smartwatch, no system widget, no reading of your health data. A web app has no access to those things, and claiming otherwise would be a lie. If ticking a habit from your wrist is what keeps you going, Habitum will not replace Streaks — and it is better to learn that in three lines than in three weeks.',
    },
    {
      t: 'p',
      x: 'There is no automatic sync either. Moving between devices happens through a file you export and import, with a visible report of what was read, kept and rejected. It is cruder; it is also the reason none of your data needs to travel through anyone’s server.',
    },
    { t: 'h2', x: 'Installing a web app on Android' },
    {
      t: 'p',
      x: 'The word “web” raises the fear of a tab lost among thirty others. That is not what this is. Open Habitum in your browser, then “Install app” from the menu: it gets an icon on the home screen, its own window with no address bar, and a direct launch. The same gesture exists on iPhone, on a laptop and on a tablet, with the same app and the same local storage on each.',
    },
    {
      t: 'p',
      x: 'Once installed it works offline: a view you have already opened reloads and responds in airplane mode. That is proven by an automated test suite, not merely announced — offline reloading was in fact a real defect in the product before it was fixed, which is precisely why it is tested today.',
    },
    { t: 'h2', x: 'What a one-off purchase really costs' },
    {
      t: 'p',
      x: 'A one-off purchase on an app store is a good model: you pay once, with no subscription, and the publisher has no reason to collect data to fund itself. Its trade-off fits in one word: the store. The app exists only where the store exists, it follows the store’s rules, and switching ecosystems means paying again — when an equivalent exists at all.',
    },
    {
      t: 'p',
      x: 'Habitum costs nothing because it has nothing to fund: no server, no database, no authentication, therefore no monthly bill to pass on. The code is public under the MIT licence: you can build and host it yourself if the project ever stopped. That is a guarantee of a different nature from a purchase, and it depends on no store.',
    },
    { t: 'h2', x: 'Starting over, properly' },
    {
      t: 'p',
      x: 'Switching habit trackers always costs the same thing: the history. There is no automatic import from Streaks, and inventing one would promise a mapping between models that does not exist — the two products do not measure the same objects, and a silent partial import is worse than none at all. The method that works is simpler: write down your current records on paper, recreate the five or six habits that genuinely matter, and leave the rest behind. A list of twenty habits copied from one product to another is a list you abandon in a fortnight.',
    },
    {
      t: 'p',
      x: 'Finally, export in the first week. The file is readable JSON, re-importable, validated before it is applied, and a backup is taken automatically before every import. You will never again have to trust anyone to get your data back.',
    },
  ],
};

const COMPARATIFS_PAR_LANGUE: Readonly<Record<Comparatif, ParLangue<Article>>> = {
  habitnow: { fr: habitnowFr, en: habitnowEn },
  habitica: { fr: habiticaFr, en: habiticaEn },
  streaks: { fr: streaksFr, en: streaksEn },
};

export const comparatif = (id: Comparatif, langue: LangueSite): Article =>
  COMPARATIFS_PAR_LANGUE[id][langue];

export const tousLesComparatifs = COMPARATIFS_PAR_LANGUE;
