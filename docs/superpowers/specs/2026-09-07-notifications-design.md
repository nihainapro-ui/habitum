# Notifications de rappel — spécification

- **Date** : 2026-09-07
- **Origine** : demande d'usage. Seules les **habitudes** savent rappeler aujourd'hui, et
  seulement tant qu'Habitum est ouvert. Les tâches portent une heure, les étapes Work et les
  objectifs portent une échéance : personne ne les annonce.
- **Décision de cadrage, tranchée avec l'utilisateur** : les rappels doivent sonner
  **téléphone en poche, application fermée**. Sur Android, c'est le plugin natif
  `@capacitor/local-notifications` (MIT, gratuit, aucun serveur). Sur PC, les rappels restent
  liés à l'application ouverte — et l'écran continue de le dire.

## Ce qui a été écarté, et pourquoi

- **Web Push (VAPID).** Techniquement le seul moyen de sonner sur PC application fermée. Il
  suppose un serveur qui sache ce que l'utilisateur a à faire aujourd'hui. Cela détruirait
  l'argument n°1 du produit et rendrait fausse la politique de confidentialité — le relais de
  synchronisation, lui, ne lit rien ; celui-là devrait lire. Écarté pour cette raison, pas
  pour son prix.
- **`TimestampTrigger`** (notification programmée côté navigateur, sans serveur). Gratuit et
  séduisant : il sonnerait sur PC application fermée. Non standard, resté cinq ans en essai
  d'origine chez Chrome seul, spécification à l'arrêt. C'est le genre de branche qu'on écrit
  une fois et qu'on retrouve morte deux ans plus tard, sans que personne s'en aperçoive
  puisqu'elle échoue en silence. **Le renoncement est gratuit** : l'architecture ci-dessous en
  fait une troisième implémentation d'une trentaine de lignes, le jour où il se standardise.

## Architecture — une décision, deux canaux

```
lib/domain/notifications.ts      QUOI et QUAND — pur, testé, sans navigateur
        │
        ▼  Rappel[] (clé, source, id, heure absolue, clé de libellé + paramètres)
lib/features/reminders/canal.ts  l'unique couture : « voici les rappels, envoie-les »
        ├── canal-minuteries.ts  PC et navigateur : setTimeout, tant qu'Habitum est ouvert
        └── canal-natif.ts       APK Android : @capacitor/local-notifications, app fermée
```

Le domaine ne sait **jamais** où il tourne, et ne parle **aucune langue** : il rend une clé de
libellé et ses paramètres, la couche d'envoi traduit. C'est la règle 2 du CLAUDE.md appliquée
sans exception, et c'est aussi ce qui rend les quatre sources testables d'un seul tenant.

## Les cinq sources

| Source | Quand | Jamais si |
|---|---|---|
| Habitude | chaque heure de `reminders[]` | non planifiée ce jour, déjà faite, heure passée |
| Tâche | `date` + `time`, **moins le préavis** ; occurrences récurrentes comprises | pas d'heure, faite (ou occurrence faite) |
| Étape Work | jour de `deadline`, à l'heure des échéances | `status === 'done'`, pas d'échéance |
| Objectif | jour de `deadline`, à l'heure des échéances | échéance absente |
| Récapitulatif | une fois par jour, à son heure | réglage coupé ; **rien à annoncer** |

Les trois règles des rappels d'habitude sont **conservées telles quelles** (`rappelsRestants`
reste la source de vérité pour cette source) : ce qui n'est pas planifié ne sonne pas, ce qui
est fait ne sonne pas, le passé ne se rattrape pas. Elles s'étendent aux quatre autres
sources : **rien de fait, rien de passé, ne sonne jamais.**

Le récapitulatif ne sonne pas quand il n'y a rien à dire. « Vous n'avez rien aujourd'hui »
envoyé tous les matins est le plus sûr moyen de faire couper les notifications.

## Réglages

Ajoutés à `Settings` (clé persistée `settings`, ajout **non destructif** : `DEFAULT_SETTINGS`
comble les trous à l'hydratation, comme pour tout réglage ajouté après coup). Ils suivent donc
la synchronisation entre appareils, au même titre que le thème.

| Réglage | Défaut | Rôle |
|---|---|---|
| `notifications` | `false` | interrupteur maître, **existant** — rien ne sonne sans lui |
| `notifHabits` / `notifTasks` / `notifWork` / `notifGoals` | `true` | une source, un interrupteur |
| `notifLead` | `0` | préavis des tâches : 0, 5, 10 ou 30 minutes |
| `notifDayHour` | `'09:00'` | heure des échéances Work et objectifs — elles n'en ont pas |
| `notifDigest` / `notifDigestHour` | `false` / `'08:00'` | récapitulatif du jour |
| `notifQuiet` / `notifQuietFrom` / `notifQuietTo` | `false` / `'22:00'` / `'07:00'` | heures silencieuses, **à cheval sur minuit** |
| `sound` / `vibrate` | existants | inchangés |

Les sous-réglages n'apparaissent **que** si l'interrupteur maître est allumé : douze lignes
grisées au-dessus d'une permission refusée ne servent personne.

## Honnêteté d'interface

Le libellé « les rappels arrivent quand Habitum est ouvert » existe déjà. Il devient
**conditionnel** : vrai dans un navigateur, faux dans l'APK, où le plugin programme de vraies
notifications système. Afficher la phrase là où elle est fausse ferait douter d'un rappel qui,
lui, va bien arriver ; la taire sur PC serait promettre ce que le produit ne tient pas.

## Le canal natif, en une ligne de doctrine

**Aucun état à synchroniser.** À chaque changement (donnée, réglage, réveil de l'application),
on annule tout ce qui est programmé et on reprogramme les rappels des **sept prochains jours**.
Un planificateur qui tiendrait un journal de ce qu'il a déjà posé finirait par diverger de la
base — et un rappel fantôme d'une tâche supprimée est pire que pas de rappel du tout.

L'identifiant numérique exigé par Android est **dérivé de la clé** du rappel (empreinte 31
bits), jamais tiré au hasard : la même tâche à la même heure doit retomber sur le même
identifiant d'une reprogrammation à l'autre.

## Ce que ça coûte

- une dépendance : `@capacitor/local-notifications` (MIT, plugin officiel Capacitor) ;
- la permission Android `POST_NOTIFICATIONS` (API 33+), demandée **au clic**, jamais au
  chargement — la règle existante ne bouge pas ;
- un APK à reconstruire et à réinstaller pour en profiter.

## Filets

- **Unitaires** : les cinq sources, le préavis, les heures silencieuses à cheval sur minuit,
  le récapitulatif vide, la stabilité de l'empreinte d'identifiant. Non-régression explicite
  sur les trois règles d'habitude.
- **e2e** : les réglages apparaissent, se persistent et disparaissent avec l'interrupteur
  maître ; le canal minuteries déclenche à horloge simulée.
- **Le canal natif ne se joue pas dans Playwright** — aucun navigateur d'intégration n'a
  Android. Il est éprouvé par un double injectable (on vérifie ce qui lui est demandé), puis
  à la main sur l'APK. C'est écrit ici pour que personne ne croie la couverture plus large
  qu'elle n'est.

## Définition de terminé

Celle du CLAUDE.md, sans retranchement : `npm run verify` vert, e2e desktop et mobile, aucun
débordement aux paliers, CHANGELOG à jour, documents corrigés si une affirmation devient
fausse. Chaque invariant nouveau est éprouvé par mutation avant d'être tenu pour acquis.


---

## Ajout du 2026-09-07 (soir) — un rappel par entité

Demandé après la première livraison : « le paramètre de notification dans chaque
tâche, habitude, tâche de projet ou sous-tâche, intégré à leurs paramètres de
modification ».

| Entité | Ce qu'elle gagne |
|---|---|
| Tâche | `notify` (me rappeler) et `remindAt` (heure propre) |
| Étape Work | idem — `remindAt` y compte double : une échéance ne porte AUCUNE heure |
| Objectif | idem |
| Habitude | `notify` seulement : ses heures existent déjà (`reminders[]`) |
| Sous-tâche et sous-élément d'étape | `date`, `time`, `notify` — elles sonnent SEULES |

**Deux règles de préséance**, et elles se lisent dans cet ordre :

1. **Le réglage le plus proche de l'objet gagne.** Une tâche muette le reste,
   même si sa source est allumée. Couper une source, à l'inverse, tait tout ce
   qu'elle contient — y compris les entités réglées sur « me rappeler ».
2. **Une heure propre n'est pas décalée du préavis.** Quand on écrit « me
   rappeler à 8 h », on veut 8 h, pas 7 h 30. Le préavis est une règle par
   défaut appliquée à l'heure de la tâche ; une heure choisie à la main est déjà
   la réponse.

**Les sous-tâches sonnent seules**, à leur propre jour et à leur propre heure —
« prendre la carte vitale la veille » n'a de sens que détaché de la tâche mère.
Les deux ou rien : sans jour, une heure ne désigne aucun instant, et on
n'invente pas d'échéance pour pouvoir sonner. Taire le parent les tait aussi.

**L'absence reste l'absence.** `notify: true` n'est jamais écrit : un défaut
recopié en base deviendrait indiscernable d'un choix, et la synchronisation, qui
compare champ à champ, en ferait un conflit.

**Le piège de l'export a été traité EN PREMIER**, avant même les champs : le
test d'aller-retour (`tests/unit/data/rappels-aller-retour.test.ts`) a été écrit
avant eux, et il couvre aussi la relecture d'une sauvegarde antérieure. C'est le
piège n°1 du CLAUDE.md, payé une fois au lot B.
