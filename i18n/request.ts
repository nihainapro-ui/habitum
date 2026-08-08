import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

/* D12 — cette fonction lisait `cookies()`, ce qui forçait les douze routes en
   rendu dynamique (`ƒ`) : une invocation serverless par affichage, sur une
   application qui ne consulte aucun serveur. Elle rend maintenant la langue par
   défaut, sans toucher à la requête, et les pages redeviennent statiques.

   La préférence de langue n'a pas changé de nature — elle reste une PRÉFÉRENCE
   DE PROFIL (`i18n/config.ts`), pas une propriété de la ressource. On change
   seulement OÙ elle est lue : dans le navigateur, à l'hydratation, par
   `i18n/client-locale.ts`. */
export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: (await import(`../messages/${defaultLocale}.json`)).default,
}));
