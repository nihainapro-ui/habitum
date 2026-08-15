# Polices auto-hébergées

Space Grotesk, JetBrains Mono et Archivo, sous licence **OFL 1.1** — texte
joint (`*-OFL.txt`), comme la licence l'exige.

Archivo sert la VITRINE seule (système Modernist) ; l'application garde
Space Grotesk et JetBrains Mono. `Archivo-ExtraBold.woff` accompagne le
`woff2` pour `next/og` : Satori ne lit pas le woff2.

FICHIERS GÉNÉRÉS par `scripts/extract-fonts.mjs` depuis les paquets
`@fontsource/*` (sous-ensemble latin, `woff2`). Ils sont versionnés plutôt
que copiés à la construction : le prototype les charge par un chemin relatif
et doit continuer à s'ouvrir seul, hors de tout outillage.

Aucune requête ne sort du domaine — `tests/e2e/fonts.spec.ts` échoue si une
seule réapparaît.
