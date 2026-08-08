import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

/* D12 — cette fonction lisait `cookies()`, ce qui forçait les douze routes en
   rendu dynamique (`ƒ`) : une invocation serverless par affichage, sur une
   application qui ne consulte aucun serveur. Elle rend maintenant la langue par
   défaut, sans toucher à la requête, et les pages redeviennent statiques.

   La préférence de langue n'a pas changé de nature — elle reste une PRÉFÉRENCE
   DE PROFIL (`i18n/config.ts`), pas une propriété de la ressource. On change
   seulement OÙ elle est lue : dans le navigateur, à l'hydratation, par
   `i18n/client-locale.ts`.

   `timeZone` doit être posé EXPLICITEMENT. Sans lui, next-intl formaterait les
   dates dans le fuseau de la machine qui compile — celui du serveur de build,
   pas celui de l'utilisateur — et lèverait `ENVIRONMENT_FALLBACK` au rendu.
   On fige donc UTC côté serveur, ce qui rend le prérendu déterministe, et le
   fuseau réel du navigateur est appliqué à l'hydratation (`LocaleProvider`). */
export default getRequestConfig(async () => ({
  locale: defaultLocale,
  timeZone: 'UTC',
  messages: (await import(`../messages/${defaultLocale}.json`)).default,
}));
