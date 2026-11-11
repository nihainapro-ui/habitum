# Politique de sécurité

## Ce que Habitum protège

Habitum est **local-first** : par défaut, vos données ne quittent pas votre appareil. Il n'y a ni
compte, ni télémétrie.

**Une exception, facultative et éteinte par défaut : la synchronisation entre appareils**
(ADR-0009, livrée le 2 septembre 2026). Si vous l'activez, vos données sont chiffrées **sur
l'appareil** (AES-GCM, clé dérivée d'un code de 100 bits qui ne part jamais) puis déposées sur un
relais — un Worker Cloudflare et sa base D1 (`sync-server/`). Le relais reçoit des octets
illisibles, un identifiant opaque et une date de modification ; il ne peut rien lire. Sans
`NEXT_PUBLIC_SYNC_URL` à la construction, la fonctionnalité n'existe pas dans l'interface et
aucune requête ne part.

La surface d'attaque est donc : le navigateur de l'utilisateur, la chaîne de construction, et —
seulement si la synchronisation est activée — le relais. Ce que le relais ne protège pas encore
est écrit plus bas, sous « Limitations connues ».

## Signaler une vulnérabilité

Ouvrir un **avis de sécurité privé** (onglet *Security* → *Report a vulnerability*).
**Ne pas ouvrir d'issue publique** pour une faille non corrigée.

Réponse sous 7 jours. Correctif visé sous 30 jours pour une gravité haute ou critique.

## Périmètre

**Dans le périmètre :** l'application (`app/`, `components/`, `lib/`), la chaîne de construction,
les dépendances, les en-têtes HTTP servis.

**Hors périmètre :** `public/prototype/` — c'est une **archive de référence**, servie telle quelle,
en `noindex`, jamais compilée ni exécutée dans le contexte de l'application (CLAUDE.md § 7). Elle
charge encore ses polices depuis `fonts.googleapis.com` : défaut connu, suivi sous la référence
`D8`, corrigé à la phase « Système visuel ».

## Mesures en place

- **En-têtes** : CSP, HSTS (2 ans, `preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictive. Vérifiés par
  `tests/e2e/headers.spec.ts` : un en-tête retiré casse la CI.
- **Aucune surface d'injection** : ni `innerHTML`, ni `eval`, ni `new Function`, ni
  `dangerouslySetInnerHTML` — vérifié par test automatique, y compris dans le prototype.
- **Aucun appel réseau tiers** dans l'application, hors le relais de synchronisation quand
  l'utilisateur l'a activée — et la CSP (`connect-src`) n'autorise que cette adresse-là.
- **Veille** : Dependabot hebdomadaire (npm et actions), `gitleaks` sur les secrets, et
  `npm audit --audit-level=high` dans son propre workflow (`.github/workflows/audit.yml`) : à
  chaque PR, à chaque push sur `main`, et **chaque matin** — un avis publié pendant que personne
  ne pousse ouvre une issue critique.
- **Analyse de sécurité statique** : `eslint-plugin-security` (Apache-2.0) dans `npm run lint`,
  donc dans `verify`, donc en CI sur chaque push et chaque PR. `eval`, `new Function`,
  `child_process`, expressions régulières non littérales et lectures de fichier par chemin
  construit sont des **erreurs**, pas des avertissements.
- **Garde-fou de `main`** : `.githooks/pre-push` refuse un push sur `main` si `npm run verify`
  n'est pas vert, et refuse toute réécriture d'historique. Installé par `npm install`,
  vérifié par `tests/unit/hooks.test.ts`.
- **Chaîne de construction** : actions GitHub épinglées par SHA, `permissions: contents: read`.

## Limitations connues et assumées

- **CodeQL : ACTIVÉ le 27 août 2026** (configuration par défaut, suites `javascript-typescript`
  et `actions`). Il était listé ici comme indisponible — c'était vrai en dépôt privé sur un plan
  gratuit, ça ne l'est plus. `eslint-plugin-security` reconnaît des motifs ; CodeQL fait
  l'analyse de flux inter-procédurale que ces motifs ne voient pas. Les deux se complètent au
  lieu de se remplacer.

- **Protection de branche : POSÉE le 25 août 2026, côté serveur.** Le dépôt est passé en
  **public** ce jour-là, ce qui a levé la restriction du plan gratuit. `main` refuse
  désormais le *force push* et la suppression **chez GitHub**, où `git push --no-verify`
  ne peut rien. Les deux garanties du hook existent donc maintenant là où elles engagent.

  **Ce qui n'est délibérément PAS exigé : les contrôles de statut obligatoires.** Sur un
  dépôt mono-contributeur qui pousse directement sur `main`, les rendre obligatoires est un
  cercle vicieux — les contrôles ne s'exécutent qu'après le push qu'ils bloqueraient. Le
  hook `pre-push`, qui exige `npm run verify` vert **avant** que le code quitte la machine,
  reste donc le contrôle de fond, et il garde sa limite : `--no-verify` le contourne.

  **Ce qui reste hors de portée :** une fusion faite depuis l'interface web de GitHub ne passe
  par aucun hook. C'est là que l'alerte sur `main` rouge prend le relais : elle ne bloque pas,
  elle rend l'échec impossible à ne pas voir.

  **Ce que cette alerte n'a pas empêché :** `main` est resté rouge du 16 septembre au
  11 novembre 2026, l'issue ouverte et non lue. Le choix de ne pas exiger les contrôles a été
  fait pour un dépôt où l'on pousse directement sur `main` ; depuis la refonte mobile, le
  travail passe par des PR, et la question mérite d'être reposée.

- **Le relais de synchronisation n'est pas durci** (audit du 11 novembre 2026) : ni limitation
  de débit, ni plafond de taille par ligne, création d'espaces illimitée, CORS ouvert. Le
  chiffrement protège le **contenu** ; il ne protège pas le relais d'être saturé, et un appareil
  dont l'horloge avance gagne les arbitrages. Le code d'appairage est conservé en clair dans le
  stockage local de l'appareil. Corrections planifiées avec la fiabilité des données.
- **Le verrou biométrique est un rideau d'interface**, pas un chiffrement : il empêche de lire
  l'écran, pas de lire le stockage du navigateur.

- `script-src 'unsafe-inline'` dans la CSP : sans cette tolérance, Next.js ne s'hydrate pas. Le
  passage à un `nonce` est couplé à la décision sur le rendu statique (défaut `D12`) et sera
  tranché en même temps. Risque résiduel mesuré : le produit ne rend aucun HTML d'origine
  utilisateur et ne charge aucun script tiers.
- **`D11` est fermée depuis le 25 août 2026 : plus aucune vulnérabilité haute**, et la CI
  échoue désormais à `--audit-level=high`. Les quatre hautes étaient dans `postcss` et
  `sharp` **imbriqués sous `next`**, pas dans `next` lui-même : un bloc `overrides` les
  remonte sans la montée majeure, qui avait été tentée le 18 août puis annulée parce
  qu'elle coûtait le fonctionnement hors ligne.

  **Depuis le 27 août 2026 : `npm audit` rend « found 0 vulnerabilities ».** La modérée
  `next-intl@3` est tombée, et pas comme on le croyait : `next-intl@4` monte **seul**, sans
  `next@16`. Le dossier du 18 août les tenait pour liées ; l'essai a montré que non.
  Éprouvé avant d'être livré — 487 tests unitaires, 625 tests e2e, et le contrôle
  « aucune page de vitrine ne charge le registre sombre » rejoué nommément, puisque c'est
  celui que la montée de `next@16` avait cassé.

  **11 novembre 2026 : ce zéro n'a pas tenu, et le dire fait partie de la politique.** Huit
  semaines sans push ont laissé s'accumuler 22 avis, dont deux critiques dans `next` ≤ 15.5.23.
  Corrigé le jour même sans montée majeure de `next` (15.5.29, correctifs de `sharp` et
  `js-yaml`) ; `zod` est monté en 4, seul correctif de GHSA-mrhx-c7xc-m3w5. `npm audit
  --audit-level=high` repasse ; il reste des avis **modérés**, sous le seuil.
