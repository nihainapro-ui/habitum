# Déploiement

Rien de ce qui suit n'est fait aujourd'hui : ce document décrit la marche à suivre,
au moment où elle sera décidée. **Aucun service n'est configuré, aucun compte n'est requis
pour développer.**

## 0. Ce que le projet coûte

Zéro. Habitum est une application locale : pas de base de données, pas d'authentification,
pas d'API. L'hébergement statique suffit.

## 1. GitHub

```bash
git init && git add . && git commit -m "Habitum — base de reprise"
git remote add origin git@github.com:<compte>/habitum.git
git push -u origin main
```

La CI (`.github/workflows/ci.yml`) tourne dès le premier push : types, lint, libellés,
tests, build. GitHub Actions est gratuit sur dépôt public.

## 2. Vercel (plan Hobby, gratuit)

1. « Add New… → Project », importer le dépôt.
2. Framework détecté : Next.js. Aucune variable d'environnement n'est requise.
3. Déployer.

`vercel.json` fixe la région (`cdg1`) et empêche l'indexation du prototype
(`/prototype/*` en `noindex`).

Alternatives gratuites équivalentes : Cloudflare Pages, Netlify.

## 3. Neon — seulement si une synchronisation multi-appareils est décidée

**Ce n'est pas nécessaire au produit tel qu'il est spécifié.** Le stockage cible est
IndexedDB (Dexie), côté navigateur. Neon n'a de sens que pour la phase 6 (synchronisation
et sauvegarde distante).

Le jour où c'est décidé :

1. Créer un projet Neon (plan gratuit : 0,5 Go, suffisant pour des années de journal).
2. Copier la chaîne de connexion dans `.env.local` sous `DATABASE_URL` (voir `.env.example`).
3. Ajouter la même variable dans Vercel → Settings → Environment Variables.
4. Choisir l'ORM à ce moment-là, pas avant — **Drizzle** (MIT, migrations SQL lisibles) est
   recommandé plutôt que Prisma, plus lourd en environnement serverless.
5. Un dossier `drizzle/` (ou `prisma/`) apparaît alors. Il n'existe pas aujourd'hui,
   volontairement : un dossier de migrations vide n'est pas une préparation, c'est du décor.

## 4. À ne pas brancher sans y réfléchir

- **Sentry** — plan gratuit réel mais quota serré, et il envoie des données à un tiers dans
  une application qui promet que rien ne sort de l'appareil. Si un suivi d'erreur est voulu,
  il doit être explicitement opt-in. Aucun fichier `sentry.*.config` n'est fourni pour ne pas
  suggérer le contraire.
- **Analytique** — même raison. La promesse local-first se rompt à la première balise.
