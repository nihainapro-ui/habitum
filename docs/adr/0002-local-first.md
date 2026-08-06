# ADR 0002 — Local-first, sans compte ni serveur

- **Statut** : accepté · 2026-08-05

## Décision

Toutes les données vivent dans le `localStorage` du navigateur. Aucune authentification, aucun
appel réseau, aucune brique payante.

## Pourquoi

- Le produit est mono-utilisateur et fonctionne hors ligne par nature.
- Contrainte du projet : que du gratuit, licences permissives.

## Conséquences

- Le stockage est le point de fragilité : d'où `A1` (validation d'import), `A3` (copie de secours),
  `A4` (échec d'écriture signalé), `D8` (rappel d'export). Le quota est fini : `B5` découpe
  l'écriture pour ne pas réécrire des milliers de clés à chaque réglage.
- Le libellé « Sauvegarde cloud » a été corrigé en « Sauvegarde locale sur cet appareil » (`A5`) :
  il promettait un service inexistant.
- La synchronisation multi-appareils reste **non tenue** et n'est pas affichée comme disponible.
