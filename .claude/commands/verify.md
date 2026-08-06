Lance la vérification complète du dépôt et corrige ce qui échoue, sans rien
changer d'autre :

1. `npm run typecheck`
2. `npm run lint`
3. `npm run check:messages`
4. `npm test`
5. `npm run build`

Si un test du domaine échoue, **ne modifie pas le test** : les 62 valeurs de
référence sont la spécification. Corrige le code.
