# ADR 0002 — Local-first, sans compte ni serveur

- **Statut** : accepté · 2026-08-05 — **amendé le 2026-09-01 par l'ADR-0009** (synchronisation chiffrée, facultative)

## Décision

Toutes les données vivent sur l'appareil : `localStorage` dans le prototype, **IndexedDB
(Dexie)** dans l'application portée. Aucune authentification, aucun
appel réseau, aucune brique payante.

> **Amendement du 2026-09-01 (ADR-0009).** « Aucun appel réseau » devient « aucun appel réseau
> tant que la synchronisation n'est pas activée ». Le reste tient sans retouche : toujours pas
> d'authentification, toujours pas de brique payante, et le relais ne peut pas lire ce qu'il
> stocke. La phrase d'origine est conservée telle quelle plutôt que réécrite — un ADR se
> modifie par amendement daté, sans quoi on ne peut plus savoir ce qui avait été décidé ni quand.

## Pourquoi

- Le produit est mono-utilisateur et fonctionne hors ligne par nature.
- Contrainte du projet : que du gratuit, licences permissives.

## Conséquences

- Le stockage est le point de fragilité : d'où `A1` (validation d'import), `A3` (copie de secours),
  `A4` (échec d'écriture signalé), `D8` (rappel d'export). Le quota est fini : `B5` découpe
  l'écriture pour ne pas réécrire des milliers de clés à chaque réglage.
- Le libellé « Sauvegarde cloud » a été corrigé en « Sauvegarde locale sur cet appareil » (`A5`) :
  il promettait un service inexistant.
- ~~La synchronisation multi-appareils reste **non tenue** et n'est pas affichée comme disponible.~~
  Levé le 2026-09-01 : elle est tenue, mais **facultative et éteinte par défaut**, et la section de
  réglages n'apparaît pas du tout sur un déploiement sans relais. Voir l'ADR-0009.
