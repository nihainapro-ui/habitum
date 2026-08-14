# ADR 0008 — Les rappels sonnent tant qu'un onglet est ouvert, et le disent

- **Statut** : accepté · 2026-08-13 (phase 5, tâche 5.2)

## Contexte

Le plan de la phase 5 demandait deux chemins de planification pour les rappels d'habitude :
`setTimeout` quand l'onglet est ouvert, **et le service worker sinon**, « les deux chemins doivent
donner le même résultat ».

Le premier est livré. Le second a été cherché, et il n'existe pas — pas dans les contraintes du
produit. Quatre pistes ont été examinées le 13 août 2026 :

| Piste | Verdict |
|---|---|
| **Notification Triggers** (`showTrigger` + `TimestampTrigger`) | C'était LA réponse : une notification programmée à une heure, affichée par le navigateur sans que rien ne tourne. Elle n'a jamais dépassé l'essai d'origine et n'est plus disponible — **mesuré : `'showTrigger' in Notification.prototype` vaut `false` dans Chrome 151**. |
| **Web Push** | Fonctionne, onglet fermé, partout. Exige un service de push ET un serveur applicatif qui lui parle. L'abonnement est une donnée qui quitte l'appareil, et un serveur est une dépendance permanente : les deux contredisent l'ADR-0002. |
| **Periodic Background Sync** | Disponible (Chromium, application installée), mais c'est le NAVIGATEUR qui choisit quand réveiller — en pratique quelques fois par jour. Un rappel de 13 h 30 délivré à 19 h n'est pas un rappel en retard, c'est une information fausse. |
| **`setTimeout` dans le service worker** | Un service worker inactif est arrêté au bout de quelques secondes. Rien à en tirer. |

## Décision

**Les rappels sonnent tant qu'Habitum est ouvert dans un onglet, et l'interface le dit** —
`system.notifOnlyOpen`, affiché sous l'interrupteur, dans les deux langues.

Ce que le service worker apporte quand même, et qui est livré :

1. **Il affiche les notifications** (`registration.showNotification`). Ce n'est pas un raffinement :
   sur Android, `new Notification()` **lève** — Chrome mobile n'accepte que les notifications
   persistantes. Le chemin direct ne servait que le bureau, et la fonction était silencieusement
   morte sur mobile.
2. **Il reçoit le clic** (`notificationclick`) : l'onglet déjà ouvert est réutilisé et emmené sur la
   journée, plutôt qu'un second onglet empilé.

## Conséquences

- Un rappel manqué n'est **pas** rattrapé à la réouverture. C'est la règle du domaine
  (`lib/domain/reminders.ts`) : le passé ne se rappelle pas, et une notification « il fallait le
  faire il y a six heures » est une culpabilisation, pas un service.
- Le libellé du réglage est une **promesse tenue** et non une excuse : il dit exactement ce que le
  produit sait faire. Un interrupteur qui promettrait des rappels tous horaires serait le genre de
  mensonge d'interface que la phase 5 avait pour objet de supprimer (G3).
- Cette décision **se rouvre** le jour où une planification locale existe sans serveur — un retour
  des Notification Triggers, ou un équivalent. Le code est prêt : la décision de QUOI rappeler vit
  déjà dans le domaine, pure et testée ; il n'y aurait qu'un déclencheur à brancher.
- Si la synchronisation de la phase 6 (Neon) est un jour livrée, un serveur existera, et Web Push
  deviendra possible **sans nouvelle dépendance**. La question sera alors de savoir si l'on accepte
  qu'un abonnement de push quitte l'appareil — c'est un arbitrage produit, pas technique.
