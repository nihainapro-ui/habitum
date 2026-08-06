# 07 — Décision B1 : quel système visuel pour Habitum ?

**Statut : ✅ TRANCHÉE — option (c). Le dossier n'a plus de point bloquant.**
Date de décision : 5 août 2026. Artefact qui la matérialise : `Vitrine Habitum.dc.html`.

> **Décision : (c) — système sombre pour l'application, Modernist pour tout ce qui l'entoure.**
> Raison : les deux registres ne servent pas le même usage. L'application est un outil qu'on regarde
> longtemps, le soir, en repassant dix fois sur les mêmes écrans — le sombre dense y est un choix
> fonctionnel, pas décoratif. La vitrine et la documentation se lisent une fois : la grille claire et
> filetée de Modernist y est meilleure. L'option (b) aurait coûté 6 à 8 jours pour **perdre** trois
> thèmes et re-dessiner à plat des cadrans, anneaux et cartes de chaleur qui fonctionnent.
> L'option (a) aurait laissé le design system rattaché sans emploi.
>
> Le coût annoncé de (c) — « +1 j, page vitrine et documentation en Modernist » — est **payé** :
> la vitrine existe, elle consomme le `_ds_bundle.js` et les classes du système
> (`.btn`, `.card`, `.table`), et elle documente la frontière entre les deux registres dans sa
> propre section « Deux identités, assumées ».
>
> **Frontière, à respecter :** l'application (`Habitum.dc.html`) ne charge jamais `styles.css` de
> Modernist ; la vitrine, la documentation et les supports de présentation ne réutilisent jamais les
> tokens sombres. Aucun composant n'est partagé entre les deux.

## Le conflit

| | Design system *Modernist* (rattaché au projet) | Système du prototype (construit et livré) |
|---|---|---|
| Fond | clair `#f3f2f2` | sombre `#04060d` (+ 1 thème clair `clinical`) |
| Accent | rouge `#ec3013`, mono-accent | bleu `#4d7cff` + cyan + violet, 3 thèmes |
| Typographie | Archivo (titres et corps) | Space Grotesk + JetBrains Mono |
| Rayons | **0 px partout, interdiction d'arrondir** | 5 / 7 / 9 / 11 / 16 px |
| Profondeur | aucune, tout est à plat | verre dépoli, `blur(20px)`, lueurs colorées |
| Structure | grille modulaire visible, règles 2 px | panneaux flottants, séparateurs 1 px |
| Alignement | tout au fer à gauche, y compris dans les boutons | centré dans les contrôles |
| Images | noir et blanc obligatoire | sans objet |

Les deux directions sont **mutuellement exclusives** : aucun réglage progressif ne les réconcilie.
Modernist interdit explicitement ce sur quoi le prototype repose (arrondis, profondeur, ombres
colorées, plusieurs accents).

## Options

### (a) Conserver le système du prototype — **recommandé**
- **Pour** : 11 vues déjà dessinées et validées, 3 thèmes cohérents, aucun coût de refonte, identité
  produit distinctive et adaptée à un usage quotidien du soir.
- **Contre** : le design system rattaché ne sert plus à rien pour l'application.
- **Coût** : 0 j. **Impact roadmap** : aucun.

### (b) Refondre l'UI sous Modernist
- **Pour** : cohérence avec la charte d'entreprise ; système documenté et déjà outillé (`styles.css`,
  composants, gabarits).
- **Contre** : **refonte visuelle intégrale** des 11 vues ; le mode sombre disparaît (ou devient
  hors charte) ; heatmap, cadran de timer et anneaux de progression sont à re-dessiner à plat ;
  perte des 3 thèmes.
- **Coût** : **+6 à 8 j** sur la phase 2 et la phase 3. Le moteur métier n'est pas affecté.

### (c) Système sombre pour l'application, Modernist pour tout le reste
- **Pour** : l'application garde son identité ; le site vitrine, la documentation, les exports PDF et
  les supports de présentation restent en charte Modernist.
- **Contre** : deux systèmes à maintenir ; frontière à documenter.
- **Coût** : **+1 j** (page vitrine + documentation en Modernist, gabarits `Landing` et `Deck` déjà
  fournis par le design system).

## Recommandation

**(a) si Habitum est un produit autonome ; (c) si Habitum doit être présenté ou vendu sous la marque
Modernist.** L'option (b) ne se justifie que si la charte est contractuellement imposée à
l'interface elle-même.

## Conséquences à acter selon l'option retenue

| | (a) | (b) | (c) |
|---|---|---|---|
| `T2.1` Tokens | tokens du prototype | tokens Modernist (`styles.css`) | tokens du prototype |
| `T2.2` Polices | Space Grotesk + JetBrains Mono | Archivo | les deux (app / vitrine) |
| `T2.3` Primitives | shadcn/ui restylé | classes Modernist (`.btn`, `.card`, `.table`…) | shadcn/ui + Modernist isolé |
| Thèmes | 3 | 1 (clair) | 3 dans l'app |
| Phase 3 | portage à l'identique | **re-dessin de chaque vue** | portage à l'identique |
| Écart planning | 0 j | +6 à 8 j | +1 j |

**Aucune tâche de la phase 2 ou 3 ne doit démarrer avant que cette page soit signée.** Les phases 0
(hors T0.1) et 1 sont indépendantes de la décision et peuvent démarrer immédiatement.
