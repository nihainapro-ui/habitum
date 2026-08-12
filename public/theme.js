/* Anti-clignotement de thème.

   Ce fichier est servi depuis le MÊME DOMAINE et chargé de façon bloquante
   dans <head> : il pose `data-theme` avant la première peinture. Sans lui,
   la page s'affiche en `neural` puis bascule — un clignotement à chaque
   chargement pour qui a choisi `plasma` ou `clinical`.

   POURQUOI PAS UN SCRIPT EN LIGNE : la CSP contient `script-src 'unsafe-inline'`,
   dont Next a besoin pour s'hydrater. Y ajouter une empreinte SHA-256 ferait
   IGNORER `unsafe-inline` par le navigateur — c'est la règle CSP — et
   casserait l'hydratation. Un fichier statique passe par `'self'` : aucune
   tolérance à ajouter, aucune à retirer. (ADR-0007) */
(function () {
  try {
    var THEMES = ['neural', 'plasma', 'clinical'];
    var m = document.cookie.match(/(?:^|; )habitum\.theme=([^;]*)/);
    var t = m ? decodeURIComponent(m[1]) : null;
    if (THEMES.indexOf(t) >= 0) document.documentElement.setAttribute('data-theme', t);
  } catch {
    /* Cookies refusés : on garde le thème par défaut. Ne jamais faire
       échouer le chargement de la page pour une préférence d'apparence. */
  }
})();
