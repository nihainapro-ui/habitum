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

> **Décision C, tranchée le 18 août 2026 : Vercel Hobby.** Habitum est un produit **non
> commercial**, et les conditions du plan Hobby ne l'interdisent qu'à l'usage commercial. La
> décision est donc durable, pas provisoire.
>
> **La contrainte qui l'accompagne :** Hobby interdit **toute** monétisation. Cela ferme deux
> choses que le programme envisageait — les **dons** rattachés au produit (décision F) et la
> **synchronisation payante** de la v1.1. Si l'une des deux revient, il faut passer à
> Cloudflare Pages ou Vercel Pro, et **avant l'indexation** : déplacer un domaine déjà
> référencé coûte du référencement. C'est aussi ce que dit `lib/site/routes.ts`, d'où les
> mentions légales tirent le nom de l'hébergeur.

1. « Add New… → Project », importer le dépôt.
2. Framework détecté : Next.js. L'application démarre sans aucune variable
   d'environnement ; **la vitrine en demande une** (voir ci-dessous).
3. Déployer.

`vercel.json` ne fixe que deux choses : le framework et la région (`cdg1`).

Le `noindex` du prototype ne vient PAS de là — c'est `next.config.mjs` qui pose
`X-Robots-Tag: noindex, nofollow` sur `/prototype/:path*`, avec sa propre CSP, et
`app/robots.ts` qui l'ajoute au `Disallow`. Le savoir évite de chercher au mauvais
endroit le jour où l'archive apparaîtrait dans un moteur.

`NEXT_PUBLIC_BUILD_DATE` n'est pas à poser : `next.config.mjs` la calcule à la
compilation. C'est elle que la page « À propos » affiche.

Alternatives gratuites équivalentes : Cloudflare Pages, Netlify.

### `NEXT_PUBLIC_SITE_URL` — à poser AVANT la première indexation

La vitrine (phase 6) construit à partir de cette variable ses URL canoniques, ses
liens `hreflang`, son `sitemap.xml`, son `robots.txt` et l'adresse absolue de son
image sociale. Sans elle, tout cela est fabriqué à partir de
`http://localhost:3000` — et un `sitemap.xml` qui annonce `localhost` n'est pas
une coquille, c'est un plan de site inexploitable.

Elle vaut le domaine public, sans barre finale : `https://exemple.tld`.
À poser dans Vercel → Settings → Environment Variables, pour les trois
environnements, **avant** de soumettre le site à un moteur.

`NEXT_PUBLIC_SITE_CONTACT` est facultative : elle remplace, dans les mentions
légales et la politique de confidentialité, le lien vers le suivi d'anomalies du
dépôt par une adresse de contact réelle.

### Vérifier après déploiement

Le plan 8 § 8.9 en liste **onze**. Elles sont outillées, pas à cocher de mémoire — une
vérification qui se fait une fois, le jour du lancement, par quelqu'un qui sait déjà ce
qu'il cherche, ne protège pas le deuxième déploiement.

**Les sept qui se décident sur une réponse HTTP** — les onze routes applicatives et
quatorze URL de vitrine en 200, `noindex` sur `/app`, `robots.txt`, `sitemap.xml` sans
`localhost`, `start_url` du manifeste, service worker servi, prototype servi :

```bash
node scripts/verif-production.mjs https://exemple.tld
```

Il sort en code 1 dès qu'un contrôle échoue, et il nomme lequel.

**Les quatre qui demandent une page rendue** — hors ligne, aller-retour export/import,
bascule FR↔EN, les trois thèmes — sont la suite e2e pointée sur la production :

```bash
BASE_URL=https://exemple.tld npm run test:e2e
```

Playwright ouvre alors un navigateur ÉPHÉMÈRE sur l'origine de production : les tests
écrivent dans son IndexedDB, rien n'est envoyé nulle part, rien ne survit à la fin du test.
Aucun serveur local n'est démarré quand `BASE_URL` est posée.

**Les trois contrôles rapides à la main**, si on veut seulement un coup d'œil :

```bash
curl -sI https://exemple.tld/app | grep -i x-robots-tag   # noindex, nofollow
curl -s  https://exemple.tld/robots.txt                   # Disallow: /app
curl -s  https://exemple.tld/sitemap.xml | head -3        # aucune URL localhost
```

**Restent deux gestes que rien n'automatise** : la note **A** sur
<https://securityheaders.com> (les en-têtes sont posés et testés en local par
`headers.spec.ts`, mais la note est délivrée sur une URL publique), et un **rollback
réellement exécuté** une fois — Vercel → Deployments → déploiement précédent →
« Promote to Production ». Un rollback jamais essayé n'est pas un rollback,
c'est une intention (`docs/RUNBOOK.md`).

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
