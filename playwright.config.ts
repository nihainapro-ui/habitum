import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/* Next lit `.env.local` à la construction ; le processus Playwright, non. Sans
   ce petit relevé, un test ne PEUT PAS savoir dans quelle configuration
   l'application a été bâtie — et le test de dégradation de la synchronisation
   (`vue-reglages.spec.ts`) affirmerait une absence dans une application qui,
   elle, affiche la section.

   Un relevé à la main plutôt que `dotenv` : une dépendance de plus pour six
   lignes, sur un dépôt qui refuse déjà `@cloudflare/workers-types` pour la
   même raison. Seules les variables `NEXT_PUBLIC_` sont reprises — elles sont
   publiques par construction ; un secret n'a rien à faire dans l'environnement
   d'un test. Ce qui est déjà posé dans l'environnement gagne. */
try {
  /* `process.cwd()` et non `import.meta.url` : Playwright charge sa configuration
     en CommonJS, où `import.meta` n'existe pas. */
  const brut = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const ligne of brut.split(/\r?\n/)) {
    const m = /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)$/.exec(ligne);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* Pas de `.env.local` : c'est le cas normal en intégration continue. */
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  /* Fuseau imposé : les vues affichent des dates-clés calculées en heure
     LOCALE (`dateKey()` n'utilise jamais `toISOString`). Sans fuseau fixe, la
     date figée du 5 août 2026 bascule d'un jour selon la machine, et les 62
     valeurs de référence cessent d'être comparables. */
  use: {
    /* `BASE_URL` permet de viser une PRODUCTION plutôt que la machine locale —
       c'est ce qui rend exécutables les quatre vérifications post-déploiement
       qui demandent un navigateur (tâche 8.9) : hors ligne, aller-retour
       export/import, bascule FR↔EN, trois thèmes.

           BASE_URL=https://exemple.tld npm run test:e2e

       Les tests écrivent alors dans IndexedDB sur l'origine de production, mais
       dans un contexte de navigateur ÉPHÉMÈRE créé par Playwright : rien n'est
       envoyé nulle part, et rien ne survit à la fin du test. C'est la même
       isolation qu'en local — l'origine change, pas la nature de l'exécution. */
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    timezoneId: 'Europe/Paris',
    locale: 'fr-FR',
  },
  /* Le socle de captures est celui de LINUX, celui que produit `ubuntu-latest`.
     Le rendu des polices diffère d'une plateforme à l'autre : sans le suffixe,
     une capture prise sous Windows écraserait silencieusement la référence de
     CI, et l'inverse produirait des écarts qui ne veulent rien dire. */
  snapshotPathTemplate: '{testDir}/visual/socle/{arg}-{platform}{ext}',
  projects: [
    {
      name: 'desktop',
      /* La non-régression visuelle a son propre projet : elle ne peut pas
         tourner à même une machine Windows ou macOS (voir `visual/vues.spec.ts`
         § 3), et un `npm run test:e2e` rouge par construction sur deux tiers
         des postes est un test qu'on finit par ne plus lancer. */
      testIgnore: '**/visual/**',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', testIgnore: '**/visual/**', use: { ...devices['Pixel 7'] } },
    /* Le projet `visual` existe, mais `npm run test:e2e` ne le NOMME PAS : le
       script cite explicitement `desktop` et `mobile`. Sans cela, `playwright
       test` exécute les trois projets, et sur une machine Windows ou macOS la
       comparaison cherche un socle `-win32` / `-darwin` qui n'existe pas —
       Playwright l'ÉCRIT alors, signale 33 échecs, et la seconde exécution
       passe au vert en comparant Windows à Windows. Un contrôle vert qui ne
       prouve plus rien est pire que le contrôle absent. `.gitignore` empêche ce
       faux socle d'entrer au dépôt ; c'est le second garde-fou, pas le premier.
       On l'exécute par `npm run test:visual` (conteneur officiel), et en CI par
       le job `visuel`, qui nomme ce projet. */
    {
      name: 'visual',
      testMatch: '**/visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  /* On teste ce qui sera DÉPLOYÉ, pas le serveur de développement.
     La tâche 0.12 l'annonçait ; la configuration lançait pourtant `npm run dev`.
     Tant qu'aucune vue n'avait besoin de JavaScript, l'écart ne se voyait pas —
     il est apparu à la première interaction : `next dev` charge Fast Refresh,
     qui évalue du code en chaîne et tombe sous notre propre CSP.

     `reuseExistingServer: false` est délibéré : réutiliser un serveur déjà
     ouvert sur le port 3000 est exactement ce qui a masqué le défaut. En CI, la
     construction est déjà faite par le workflow ; en local, on la refait. */
  /* Aucun serveur à lancer quand on vise une production déjà en ligne : la
     démarrer construirait l'application pour la laisser inutilisée, et
     surtout Playwright attendrait un port que personne n'ouvrira. */
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
});
