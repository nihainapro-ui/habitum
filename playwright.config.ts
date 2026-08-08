import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  /* On teste ce qui sera DÉPLOYÉ, pas le serveur de développement.
     La tâche 0.12 l'annonçait ; la configuration lançait pourtant `npm run dev`.
     Tant qu'aucune vue n'avait besoin de JavaScript, l'écart ne se voyait pas —
     il est apparu à la première interaction : `next dev` charge Fast Refresh,
     qui évalue du code en chaîne et tombe sous notre propre CSP.

     `reuseExistingServer: false` est délibéré : réutiliser un serveur déjà
     ouvert sur le port 3000 est exactement ce qui a masqué le défaut. En CI, la
     construction est déjà faite par le workflow ; en local, on la refait. */
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
