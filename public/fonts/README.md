# Polices auto-hébergées

Space Grotesk et JetBrains Mono, sous licence **OFL 1.1** — texte joint
(`*-OFL.txt`), comme la licence l'exige.

Extraites des paquets `@fontsource/space-grotesk` et `@fontsource/jetbrains-mono`
(sous-ensemble latin, `woff2`) par `scripts/extract-fonts.mjs`. Les fichiers sont
versionnés plutôt que copiés à la construction : le prototype les charge par un
chemin relatif et doit continuer à s'ouvrir seul, hors de tout outillage.

Aucune requête ne sort du domaine — `tests/e2e/fonts.spec.ts` échoue si une
seule réapparaît.
