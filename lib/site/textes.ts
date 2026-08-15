import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import type { LangueSite } from './routes';

/* Libellés de la vitrine — tâche 7.1, étape 4.
 *
 * ÉCART ASSUMÉ AU PLAN, et il tient en une phrase : la vitrine ne passe pas par
 * next-intl. Ce n'est pas un raccourci, c'est la conséquence directe de D12.
 * `i18n/request.ts` rend TOUJOURS la langue par défaut et ne lit jamais la
 * requête — c'est ce qui garde les routes statiques et l'application à zéro
 * invocation serveur. Une vitrine bilingue par l'URL a besoin de l'inverse :
 * deux rendus, chacun figé dans SA langue, au moment de la construction.
 *
 * Les clés restent où le plan les demande — `messages/*.json`, préfixe `site.`
 * — et restent donc gardées par `npm run check:messages` (G6). Ce fichier
 * ajoute une seconde garde, de nature différente : `satisfies` échoue à la
 * COMPILATION si une clé anglaise manque, sans attendre le script.
 *
 * Coût côté client : nul. Les pages de vitrine sont des composants serveur
 * rendus une fois à la construction ; le JSON ne part jamais au navigateur. */

export type TextesSite = (typeof fr)['site'];

const PAR_LANGUE = { fr: fr.site, en: en.site } satisfies Record<LangueSite, TextesSite>;

export const textes = (langue: LangueSite): TextesSite => PAR_LANGUE[langue];
