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

## 5. APK Android — application autonome, gratuite

L'APK ne contient pas une coquille qui ouvrirait le site : il contient **l'application
entière**. Aucun serveur, aucun domaine, aucun `assetlinks.json`, aucune requête au
démarrage. C'est ce que la promesse local-first exige — un paquet qui aurait besoin de
joindre Vercel pour s'ouvrir la contredirait à moitié — et c'est aussi ce qui le rend
éligible à F-Droid sans l'anti-feature « dépend d'un service réseau ».

**Coût : zéro.** Construction en CI sur `ubuntu-latest`, distribution par GitHub Releases.
Le Play Store (25 € une fois) reste facultatif : un APK se télécharge et s'installe
directement.

### Comment ça se construit

```bash
npm run paquet:web    # export statique + tri des fichiers -> packaging/www
npm run paquet:sync   # + copie dans le projet natif
npm run paquet:apk    # + Gradle (exige JDK 21 et le SDK Android)
```

`HABITUM_EMPAQUETE=1` bascule `next.config.mjs` sur `output: 'export'`. **La construction
web par défaut n'est pas touchée** — et c'est important : `headers()` n'est PAS appliqué à
un export statique, donc la CSP et le `noindex` de `/app` disparaîtraient si le drapeau
fuyait. Ils n'ont aucun sens dans un APK, que ni navigateur ni moteur de recherche ne
visite ; ils en ont tout sur le web, où `headers.spec.ts` les impose.

Le paquet **exclut** l'archive du prototype — 773 Ko qui chargent React depuis `unpkg.com`,
donc morts hors ligne — et la galerie `/dev`. Le point d'entrée est réécrit pour ouvrir
`/app/` plutôt que la vitrine, qui n'a personne à convaincre dans une application déjà
installée.

Personne n'a besoin d'installer JDK ni SDK Android : le workflow `android.yml` construit
un APK de **débogage** à chaque push et le publie en artefact du run. Il s'installe par
chargement direct, et sert à essayer.

### Publier une version signée

Un APK de débogage ne peut pas servir de version distribuée : sa clé est celle, publique,
du débogage Android. Pour une vraie publication, il faut un magasin de clés.

```bash
keytool -genkeypair -v -keystore habitum.keystore -alias habitum \
  -keyalg RSA -keysize 4096 -validity 10000
```

> **Ce fichier ne se remplace pas.** Il est le seul moyen de publier une mise à jour
> par-dessus une version installée : pour Android, une signature différente est une AUTRE
> application. Perdu, tous les utilisateurs doivent désinstaller puis réinstaller — et
> perdent leurs données, puisqu'elles vivent dans l'application. Le sauvegarder ailleurs
> que sur la machine qui l'a créé. `.gitignore` refuse `*.keystore` et `*.jks` pour que
> l'erreur soit impossible par inadvertance.

Puis quatre secrets de dépôt :

| Secret | Contenu |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 habitum.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | le mot de passe du magasin |
| `ANDROID_KEY_ALIAS` | `habitum` |
| `ANDROID_KEY_PASSWORD` | le mot de passe de la clé |

Une étiquette `v*` déclenche alors la construction signée et attache l'APK à la version
GitHub. **Sans ces secrets, l'étiquette ne casse rien** : l'APK de débogage est produit,
l'étape de signature est sautée, et le run le dit en clair plutôt que d'échouer.

### Ce que « gratuit » coûte ailleurs

- **Android, installation directe** — « autoriser cette source » une fois. F-Droid
  supprime cette friction, et la licence MIT y rend le produit éligible.
- **iOS** — aucun `.ipa` gratuit n'existe : Apple impose 99 €/an pour toute distribution,
  TestFlight compris, et un chargement direct avec un identifiant gratuit **expire au bout
  de 7 jours**. La réponse gratuite sur iOS est la PWA — installée depuis Safari, elle est
  plein écran, hors ligne, et échappe à la purge d'IndexedDB à 7 jours qui frappe les
  sites ordinaires. Pour une application sans compte, cette dernière propriété n'est pas un
  détail.
- **Bureau** — non traité ici. Tauri (MIT/Apache-2.0) produirait des binaires de 5 à 10 Mo
  et réutiliserait tel quel l'export statique posé pour Android. La signature, elle, est
  payante : sans elle, Windows et macOS affichent un avertissement à la première ouverture.
