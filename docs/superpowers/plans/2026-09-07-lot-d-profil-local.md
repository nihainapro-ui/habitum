# Lot D — Profil local : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le profil porte une photo, une adresse électronique et une fonction libre ; un verrou
biométrique facultatif tire un rideau devant l'application. Tout reste local ; rien ne crée de
compte ; la politique de confidentialité redevient vraie mot pour mot.

**Architecture:** Trois champs facultatifs sur `Profile` (entité déjà synchronisée, donc la
photo voyage chiffrée avec le reste sans une ligne de transport nouvelle) ; leur absence est
défaite en un seul endroit, `lib/domain/profil.ts`. La réduction d'image est un travail de
navigateur : elle vit dans `lib/features/profil/`, jamais dans le domaine. Le verrou est un
identifiant de credential WebAuthn dans `meta`, clé LOCALE — `meta` ne synchronise que deux
clés nommées, la nôtre n'en est pas.

**Spec:** `docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md` § Lot D

## Global Constraints

- **CLAUDE.md prime.** `lib/domain/` n'importe ni React, ni Next, ni la persistance (règle 2) ;
  aucun chiffre affiché n'est fabriqué (règle 3) ; aucune clé persistée n'est renommée
  (règle 1 — `role: number` RESTE, `metier` s'ajoute à côté).
- **Jamais de littéral de texte dans le JSX** ; toute clé de `fr.json` existe dans `en.json`.
- Couleurs par variables du thème, jamais en dur.
- **Honnêteté d'interface** : le verrou est un rideau, pas un chiffrement. L'écran le dit en
  toutes lettres, et dit aussi ce qui se passe si l'authentificateur disparaît.
- Fin de lot : `npm run verify` vert, e2e desktop + mobile, CHANGELOG à jour, tout document
  rendu faux corrigé dans la même livraison.

---

### Task 1: Les trois champs, et l'endroit unique où leur absence est défaite

**Files:** `lib/domain/types.ts`, `lib/domain/profil.ts` (nouveau), `lib/domain/index.ts`,
`tests/unit/profil.test.ts` (nouveau).

**Décision, contre la lettre de la spec :** `email` et `metier` sont **facultatifs**, pas
requis. Même raison qu'au lot B : les profils déjà écrits n'ont pas ces champs — ni en base, ni
dans une ligne reçue d'un appareil resté en arrière, la synchronisation écrivant l'entité telle
quelle. Les déclarer requis mentirait au compilateur. L'absence est défaite une fois, dans
`profilChamps()`, jamais dans les vues. La spec est corrigée dans la même livraison.

- [x] Ajouter `photo?`, `email?`, `metier?` à `Profile` avec le commentaire qui dit pourquoi.
- [x] `profilChamps(p)` → `{ email, metier, photo }` (défauts `''`, `''`, `null`).
- [x] `PHOTO_COTE_MAX = 256`, `PHOTO_MAX_OCTETS = 65536`, `octetsDataUrl()`, `photoAcceptable()`,
      `cadrageCarre(w, h)` — purs, testés.

### Task 2: Réduire l'image sur l'appareil

**Files:** `lib/features/profil/photo.ts` (nouveau), `tests/unit/photo.test.ts`.

Canvas + `createImageBitmap`, recadrage carré centré par `cadrageCarre()`, sortie JPEG, qualité
dégressive jusqu'à passer sous 64 Ko. Rien ne quitte l'appareil : pas de requête, pas de service
tiers — c'est la promesse de la page de confidentialité.

### Task 3: La vue Profil montre et modifie les trois champs

**Files:** `components/profile/Avatar.tsx`, `components/profile/ProfileView.tsx`,
`messages/fr.json`, `messages/en.json`.

- [x] `Avatar` accepte `photo?: string` et rend l'image ; sans photo, le dégradé génératif
      d'aujourd'hui, inchangé.
- [x] Bouton « Changer la photo » (entrée fichier masquée) + « Retirer la photo » quand il y en a une.
- [x] Champs e-mail et fonction, avec la phrase qui dit qu'ils ne sont transmis à personne.

### Task 4: Le verrou biométrique

**Files:** `lib/data/seed.ts` (META_KEYS), `lib/sync/entites.ts` (liste commentée),
`lib/features/verrou/webauthn.ts` (nouveau), `lib/store/{types,hydrate}.ts`,
`lib/store/slices/account.ts`, `components/shell/lock-curtain.tsx` (nouveau),
`components/shell/app-shell.tsx`, `components/settings/LockSetting.tsx` (nouveau),
`components/settings/SettingsView.tsx`, messages.

- [x] `meta.bioLock = { credentialId, at }`. LOCALE : `meta` ne synchronise que `settings` et
      `occ` ; la clé est ajoutée à la liste commentée de `entites.ts`, et un test le verrouille.
- [x] Le rideau REMPLACE la coque tant que l'application est verrouillée — il ne la recouvre pas.
      Un contenu rendu derrière un voile reste dans le DOM, donc lisible.
- [x] Réglage désactivé et EXPLIQUÉ là où la plateforme n'a pas d'authentificateur.

### Task 5: Filets

- [x] `tests/unit/profil.test.ts`, `tests/unit/photo.test.ts`, `tests/unit/verrou.test.ts`.
- [x] `tests/unit/store/sync.test.ts` (ou voisin) : `bioLock` ne sort JAMAIS de l'appareil.
- [x] `tests/e2e/profil-local.spec.ts` : les trois champs se saisissent et survivent au
      rechargement ; le rideau bloque puis s'ouvre (WebAuthn simulé par `addInitScript`).

### Task 6: Les documents que ce lot rend faux

- [x] `lib/site/contenu/legal.ts` : « aucune adresse électronique n'est saisie » et « ... parce
      qu'il n'en existe aucun dans le produit » deviennent FAUX. Réécrits dans les deux langues,
      `DATE_MAJ` avancée.
- [x] `docs/handoff/03-ARCHITECTURE.md` § clés d'état persistées : `bioLock`.
- [x] Spec du 2026-09-02 : la décision « facultatif » de la tâche 1.
- [x] `CHANGELOG.md`.
