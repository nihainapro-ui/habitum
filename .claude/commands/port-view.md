Porte une vue du prototype vers l'application Next.js.

Argument : le nom de la vue (dash, today, habits, tasks, goals, calendar, stats,
timer, notes, profile, settings).

Marche à suivre :
1. Lis la spécification de la vue dans `docs/handoff/05-SPEC-VUES.md`.
2. Ouvre la section correspondante du prototype :
   `public/prototype/Habitum.dc.html` (carte : `docs/handoff/reference/CARTE-DU-FICHIER.md`).
3. N'invente aucun calcul : tout ce qui est métier doit venir de `lib/domain`.
   Si une fonction manque, ajoute-la là, avec son test dans `tests/unit/`.
4. Remplace `<PortStatus />` dans `app/<vue>/page.tsx` (le tableau de bord est `app/page.tsx`).
5. Libellés : `messages/fr.json` + `messages/en.json`, jamais de chaîne en dur.
6. `npm run verify` avant de rendre la main.
