# ADR 0004 — Cache de rendu à invalidation fine, plutôt qu'un moteur réactif

- **Statut** : accepté · 2026-08-05 (lot 3)

## Contexte

Les métriques (séries, taux, records, ratios journaliers) sont recalculées à chaque rendu et
balaient des centaines de jours. Un simple clic sur une case redéclenchait tout.

## Décision

Un cache mémoire (`memo()`) dont les clés portent l'identifiant d'habitude, invalidé **par
habitude** grâce à une empreinte du journal calculée en une passe (`logFp()`), plus un cache
**persistant** du record par habitude (`habitum.best`) sous une signature explicite.

Alternatives écartées : un moteur réactif (signaux) — dépendance et réécriture complète ;
une base indexée — appartient au portage.

## Garde-fous

- `cfg.fastCache=false` rétablit l'invalidation globale (interrupteur de repli).
- `tests/domain.test.html` compare, pour chaque habitude cochée à cache chaud, **toutes** les
  métriques à un recalcul à froid. Aucun écart toléré.
- Une signature différente provoque un recalcul : une valeur périmée ne peut pas être affichée.
