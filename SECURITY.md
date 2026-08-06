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
- **Veille** : Dependabot hebdomadaire (npm et actions), CodeQL, `npm audit` en intégration
  continue, `gitleaks` sur les secrets.
- **Chaîne de construction** : actions GitHub épinglées par SHA, `permissions: contents: read`.

## Limitations connues et assumées

- `script-src 'unsafe-inline'` dans la CSP : sans cette tolérance, Next.js ne s'hydrate pas. Le
  passage à un `nonce` est couplé à la décision sur le rendu statique (défaut `D12`) et sera
  tranché en même temps. Risque résiduel mesuré : le produit ne rend aucun HTML d'origine
  utilisateur et ne charge aucun script tiers.
- Quatre vulnérabilités npm connues (`postcss`, `sharp` via `next`, `next-intl`), dont trois
  hautes. Leurs correctifs sont des montées majeures, planifiées en phase « Qualité » lorsque les
  tests de parcours pourront détecter une régression. Suivi sous la référence `D11`.
