# Politique de sécurité

## Ce que Habitum protège

Habitum est **local-first** : vos données ne quittent pas votre appareil. Il n'y a ni compte, ni
serveur applicatif, ni base de données distante, ni télémétrie. La surface d'attaque se limite au
navigateur de l'utilisateur et à la chaîne de construction du projet.

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
- **Aucun appel réseau tiers** dans l'application.
- **Veille** : Dependabot hebdomadaire (npm et actions), `npm audit` en intégration continue,
  `gitleaks` sur les secrets.
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

  **Ce qui reste hors de portée :**
  - une fusion faite depuis l'interface web de GitHub ne passe par aucun hook. C'est là que
    l'alerte sur `main` rouge prend le relais : elle ne bloque pas, elle rend l'échec impossible
    à ne pas voir ;
  - une fusion faite depuis l'interface web de GitHub ne passe par aucun hook.

- `script-src 'unsafe-inline'` dans la CSP : sans cette tolérance, Next.js ne s'hydrate pas. Le
  passage à un `nonce` est couplé à la décision sur le rendu statique (défaut `D12`) et sera
  tranché en même temps. Risque résiduel mesuré : le produit ne rend aucun HTML d'origine
  utilisateur et ne charge aucun script tiers.
- **`D11` est fermée depuis le 25 août 2026 : plus aucune vulnérabilité haute**, et la CI
  échoue désormais à `--audit-level=high`. Les quatre hautes étaient dans `postcss` et
  `sharp` **imbriqués sous `next`**, pas dans `next` lui-même : un bloc `overrides` les
  remonte sans la montée majeure, qui avait été tentée le 18 août puis annulée parce
  qu'elle coûtait le fonctionnement hors ligne.

  Subsiste **une modérée** sur `next-intl@3`, laissée sciemment : ses deux avis visent
  l'API de navigation de la bibliothèque — ce dépôt n'a aucun `middleware` et n'importe ni
  `next-intl/navigation` ni `createNavigation` — et `experimental.messages.precompile`,
  qui n'est pas utilisé. La surface d'attaque décrite n'existe pas ici. Elle disparaîtra
  avec `next-intl@4`, lui-même suspendu à `next@16`, lui-même suspendu à une version de
  `@serwist/next` compatible.
