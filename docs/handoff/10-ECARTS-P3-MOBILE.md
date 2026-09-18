# 10 — Refonte mobile P3 : écarts entre le PDF et les écrans réels

Date : 18 septembre 2026. Périmètre : les neuf écrans que le PDF « Refonte mobile
Habitum » (dossier `UX-UI/`, hors dépôt) a dessinés en **Hypothèse** — sans avoir
vu l'écran réel. Règle de conflit rappelée par le commanditaire : **le dépôt gagne
sur le PDF, et on le signale.** Ce document est cette signalisation ; rien n'a été
codé. P1 (PR #56) et P2 (PR #57) sont livrées ; P3 attend la validation des
arbitrages du § 1.

Lecture faite fichier par fichier ; chaque affirmation cite sa source. Effort :
S < 1 j, M = 1–2 j, L > 2 j, par écran, tests compris.

## 1. Arbitrages — **tous validés le 18 septembre 2026, tels que recommandés**

| # | Point | Recommandation |
|---|---|---|
| 1 | **Appui long** (demandé sur 6 écrans) : n'existe nulle part dans le dépôt ; `useGlissement` ne gère que le glissement horizontal. | Remplacer partout par la **feuille d'actions** de P1 (appui sur le nom). Aucun geste caché. |
| 2 | **Gestes** : le PDF veut gauche = Supprimer/Archiver sur Habitudes et Tâches. P1 a livré gauche = Focus, droite = Reporter. | Garder la convention P1. |
| 3 | **Champ « projet » sur une tâche** (seule nouveauté du PDF) : `Task` et `ProjectTask` sont deux entités (décision du 31/08/2026) ; l'ajouter = nouvelle clé persistée + migration + sync. | Refuser dans P3. Work reste « projets à étapes ». |
| 4 | **Tâches en retard** : le PDF veut un groupe « En retard » ; le dépôt les laisse volontairement dans « Aujourd'hui » (`lib/domain/tasks.ts:6-8`, « un groupe en retard séparé se replie et s'oublie »). | Garder le groupe ; ajouter une **mention écrite « en retard »** rouge par ligne. |
| 5 | **Jalons d'objectif non cochables** : régression du portage (le prototype le faisait, `objMsTog`). Ni la carte ni l'éditeur ne basculent `done`. | Rétablir (`toggleMilestone` annulable) — quelle que soit la forme. |
| 6 | **Réinitialisation** : le PDF la déplace de Réglages vers Profil. Deux tests e2e visent `/app/settings`. | Sur mobile, dans Profil (feuille de confirmation à conséquence chiffrée réelle) ; sur bureau, inchangée. |
| 7 | **Refus de permission notifications** : le PDF remet l'interrupteur à « off ». Le dépôt le laisse allumé + alerte + « Ouvrir les réglages » — correction payée sur téléphone (`notifications.spec.ts:75`). | Le dépôt gagne. |
| 8 | **Niveau / XP** : le PDF les met dans Profil ; P1 les a déjà mis dans la carte de tête de « Plus », qui mène à Profil. | Les afficher aussi en tête de Profil (même hook `useProgression`), sans les retirer de Plus. |
| 9 | **Deux nouvelles préférences** dessinées dans Réglages — « Réduire les animations » et « Écran d'ouverture » — n'existent pas (`Settings` n'a pas ces clés). | Hors P3 : ce sont des fonctionnalités, pas une forme. Lot séparé si voulu. |
| 10 | **Focus** : Wake Lock (écran éveillé) et pastille de session dans la barre n'existent pas. | Hors P3 (fonctionnalités) ; à proposer ensuite. |
| 11 | **Titre « Focus »** : la vue s'appelle « Minuteur » partout, y compris le rail bureau et le socle visuel. | Ne pas renommer en P3. |

## 2. Chiffres du PDF qu'on n'affichera pas (règle 3 : rien de fabriqué)

- Statistiques : « ▲ +6 pts » (aucun calcul de variation), « Record · Lecture » (le porteur du record n'est pas retourné), « — » sous 3 jours (seuil inexistant).
- Work : « Prochaine : rapport, aujourd'hui 17:00 » (pas de fonction « prochaine échéance », et une échéance n'a **pas d'heure**), tout le bloc **« Focus par projet »** (une session n'a que `habitId`, jamais de projet).
- Focus : « Session interrompue à 10:12 » (heure non persistée), « Démarrer 25 min » en mode chronomètre (sans terme).
- Objectifs : « Léger retard » (le statut est binaire, marge 5 pts), « Marquer atteint » sur un cumul alimenté par une habitude.
- Profil : « Stockage 1,2 Mo » (aucune mesure), « sauvegarde conservée 7 jours » (**faux** : une seule copie, sans expiration), « saisir EFFACER » (deux temps par boutons existent).
- Habitudes : bandeau « Sauvegarde différée » (aucun mode différé n'existe).
- Notes : humeur par défaut — afficher « humeur · — » si absente.

Briques domaine possibles pour en récupérer une partie honnêtement (chacune avec
son test unitaire) : `previousWindowScore`, `bestStreakHolder`
(`lib/domain/stats.ts`), `nextDeadline` (`lib/domain/projects.ts`),
`resumeSemaine` (7 jours passés, habitudes seules), `joursDepuis`
(`lib/domain/date.ts`).

## 3. Ce que chaque écran offre et que le PDF a oublié — à conserver

| Écran | Conservé obligatoirement |
|---|---|
| Habitudes | 7 pastilles cochables de la semaine (rétro-cocher), taux 30 j, record, objectif en clair, lien « Voir les statistiques », mention « Archivée », recherche. |
| Tâches | **Liste de courses** (clé `shopping`), groupe « Demain », note sur tâche, sous-tâches cochables, rappels, décocher, récurrence cochée « ce jour-là ». |
| Objectifs | Courbe d'avancement, rythme requis, catégorie, « Alimenté par », rappels, suppression annulable, tous les jalons (3 + « + n » dépliable). |
| Statistiques | 4ᵉ indicateur Focus, carte de chaleur (91 j mobile), colonnes Série/Record/Total, répartition par catégorie, histogramme du mois civil. |
| Work | Tout le **projet ouvert** (3 statuts, sélecteur inline, responsable, échéance, sous-tâches, rappels d'étape), note du projet, édition/suppression. |
| Focus | Préréglages 10/20/25/45/60, cycles + pause longue, enregistrer à tout moment, cibles « tâches du jour » et « Sans cible », crédit automatique, liste du jour, bandeau de restauration. |
| Notes | Sessions récentes, recherche couvrant les notes d'habitude, témoin « Enregistré » (au moins `role=status`), suppression par texte vide, humeur sans texte. |
| Profil | Photo (choisir/remplacer/retirer), identifiant/fonction/e-mail/poste + phrases d'honnêteté, **multi-profils**, Habitudes actives / Meilleure série / Sessions, import. |
| Réglages | Début de semaine, confettis, tout `NotificationDetails` (sources, préavis, récap, heures silencieuses), diagnostic des rappels, Données, verrou biométrique, sync, journal d'erreurs, À propos. |

## 4. Écran par écran : ce qu'on porte

Schéma commun (P1/P2) : `components/<vue>/mobile/<Vue>Mobile.tsx` branché par
`Forme` ; bureau intouchable ; libellés `mob*` en fr **et** en ; tests
`vue-<vue>-mobile.spec.ts` ; un seul niveau de carte ; cibles 44 px ; couleur
jamais seule ; barres unies (le dégradé `acc→acc2` de `GoalCard` et `ProjectCard`
contredit la p. 17 — remplacé par `BarreProgression` sous 768 px).

### Habitudes — M
Segments Actives · n / Archivées · n. Ligne : glyphe catégorie, nom, « fréquence ·
catégorie », série à droite ; pastilles de la semaine sur une seconde ligne, à
44 px, coche annulable (`toggleHabitAnnulable`). Feuille d'actions : Modifier ·
Archiver/Désarchiver (à rendre annulable) · Statistiques · Supprimer (confirmation
chiffrée existante). Vide : « Aucune habitude » + les 3 suggestions de
`StepHabits`. Résumé 7 jours seulement si `resumeSemaine` est écrite. Écarté :
Dupliquer (inexistant — `editor.dup` est un libellé mort à supprimer).

### Tâches — M
Segments À faire / Faites avec compteurs ; sections Aujourd'hui → Demain → Cette
semaine → Plus tard, sans carte imbriquée ; ligne 44 px avec glyphe, mot de
priorité, `⟳` récurrence, heure, date lisible (« Hier », « Ven. 18 » — mise en
forme, pas calcul), « 2/3 » ; « en retard » écrit en rouge. Feuille d'actions :
Modifier · Marquer fait · Reporter → Demain / Choisir (`FeuilleDate` +
`moveTask`) · Note · Supprimer (confirmation). Courses en section repliée. Vide
mobile sans « ⌘K ». À corriger au passage sur bureau : `TaskItem` n'affiche pas
la récurrence alors qu'Aujourd'hui le fait.

### Objectifs — M
Segments En cours / Atteints (filtre `goalStatus`). Carte : nom + %, « type ·
depuis le … · échéance … », barre unie + repère `goalElapsed` avec texte (masqué
si start/deadline absents), verdict + « n j restants », rythme, source, courbe.
Jalons **cochables** (nouvelle action store annulable), 3 puis « + n ». Feuille :
Modifier · Supprimer. Corriger le « + » d'en-tête sur `/app/goals` (la feuille de
choix ne propose pas Objectif). Écarté : écran de détail, « historique »,
« prolonger ? » dédié.

### Statistiques — M
Période en segments 44 px (« 365 jours », pas « année ») ; 4 tuiles-liens ;
histogramme **du mois** avec valeur accessible au doigt (bouton par barre, état
dans le nom) ; heatmap 91 j sous « 3 derniers mois » ; « Par habitude » en lignes
barre + % + méta « série · record · total ». Les `data-testid` `score`,
`kpi-*` survivent. Écarté : détail d'habitude (inexistant), delta, cache.

### Work — M
Liste : carte par projet, barre unie, « n sur N », « n en retard », note ;
✓ « Tout est fait » si `total > 0 && done === total`. « + » d'en-tête contextuel
(projet / étape). Projet ouvert resserré : cibles 44 px, crayon → feuille
Modifier / Supprimer. Écarté : Focus par projet, couleur/glyphe, archivage,
« regrouper des tâches existantes ».

### Focus (Minuteur) — M
Modes en segments 44 px (noms exacts conservés pour les tests) ; cadran 168 px ;
ligne « lié à » en feuille basse ; avant démarrage un seul bouton « Démarrer ·
25 min » (durée omise en chronomètre) ; en cours Pause + **Arrêter** (rouge, mot)
→ `FeuilleConfirmation` « Enregistrer n min ? » [Enregistrer] [Abandonner] —
remplace le Réinitialiser qui effaçait sans demander ; préréglages ; liste du
jour + « 1 h 12 · 3 sessions ». Écarté : Historique (lien vers Notes au mieux),
projet lié, heure d'interruption.

### Notes — M
Segments Journal · n / Par habitude · n. Carte du jour (textarea + autosave 600 ms
conservé, humeur 5 cases 44 px avec chiffre **et mot** — 5 libellés à créer).
Historique clampé 3 lignes, « humeur · n/5 » ou « — », suppression via feuille
de confirmation (`deleteNote` existe). Sessions récentes conservées. Le ⌕
d'en-tête ouvre aujourd'hui la palette, qui ignore les notes : le relier au champ
de recherche de la vue. Écarté : éditeur plein écran, bordure turquoise
décorative.

### Profil — M
Carte identité (avatar/photo, nom, rang · niveau, barre XP), champs sous
« Modifier » (rien retiré), 5 indicateurs réels (+ « Depuis n j » seulement si
`joursDepuis`), Données (Exporter avec « Dernier export : {lastExport|jamais} »
— la donnée existe, jamais affichée ici ; Importer + rapport ; Restaurer), Profils,
« Jeu de démonstration actif » si `isDemo`, Réinitialiser en dernière ligne.
Écarté : partage système (`navigator.share` absent — à étudier pour l'APK),
aperçu d'import avant écriture.

### Réglages — S
Réagencement en liste plate à en-têtes de groupe, segments `fill` 44 px ; « Clinical »
→ « Clair » et « Son des rappels » → « Son de fin de session » (libellés
seulement, valeurs persistées inchangées) ; rail de `Switch` à 24 px sous 768 px.
Le « P3 · Réglages honnêtes » du PDF est **déjà livré** : Notifications, Son,
Vibration sont branchés ou masqués avec raison. Le commentaire périmé de
`SettingsView.tsx:27-29` (« attendent le plan 6 ») est à corriger.

## 5. Ordre de livraison proposé

Une PR par écran ou par paire, empilées comme P1/P2, dans l'ordre d'usage :
1. Habitudes + Tâches (les deux onglets de la barre) — **livré le 18 septembre
   2026** (branche `refonte-mobile-p3a`). Écarts au § 4 : la correction bureau
   de `TaskItem` (récurrence absente) est reportée, car elle changerait une
   capture du socle visuel ; « Dupliquer » n'a pas été ajouté (`editor.dup`
   reste un libellé mort à nettoyer) ;
2. Objectifs (avec le jalon cochable) + Statistiques ;
3. Focus + Notes ;
4. Work + Profil + Réglages.

Chaque PR : `npm run verify`, e2e desktop + mobile, aucun débordement aux quatre
paliers, captures `npx playwright test captures-mobile --project=mobile`,
`CHANGELOG.md`, et ce document mis à jour si un arbitrage change.
