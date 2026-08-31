# Prompt correctif — le panneau blanc des menus déroulants, et le curseur réticule

> À copier tel quel dans Claude Code. Deux défauts constatés sur la vue **Profil**, visibles sur les
> deux captures (thème `neural`, puis thème `plasma`). Le second est une fonctionnalité oubliée au
> portage.

---

## ⚠ Périmètre — à lire en premier

**Tu ne modifies que ces deux éléments : les menus déroulants et le curseur.** Rien d'autre.

Interdit, même si tu le juges améliorable :

- toucher à la mise en page, aux espacements, aux tailles, aux couleurs ou aux libellés de la vue
  Profil ou de n'importe quelle autre vue ;
- retoucher les jetons de thème, `styles/tokens.css`, les polices, les rayons, les ombres ;
- modifier `lib/domain/`, la persistance, les clés persistées, les migrations ;
- « ranger » du code, renommer, extraire, reformater un fichier que la correction ne touche pas ;
- traiter les autres interrupteurs décoratifs (`notif`, `sound`, `vibrate`) — ils appartiennent à la
  phase 4 ;
- toucher à `public/prototype/`.

Fichiers que tu es autorisé à créer ou modifier :

| Fichier | Portée autorisée |
|---|---|
| `components/ui/select.tsx` | **création** — le composant |
| `components/shell/reticle-cursor.tsx` | **création** — le curseur |
| les vues contenant un `<select>` | **uniquement** le remplacement du `<select>` par `<Select>` — pas une ligne autour |
| `components/shell/app-shell.tsx` | **uniquement** le montage du curseur |
| `styles/globals.css` | **uniquement** le filet `select { color-scheme }` et la règle `@media print` |
| `messages/fr.json` + `en.json` | **uniquement** les clés du réglage du curseur, symétriques |
| `tests/unit/`, `tests/e2e/` | ajouts couvrant ces deux corrections |
| `CHANGELOG.md` | une entrée |

Si une correction semble exiger de sortir de cette liste, **arrête-toi et demande** — ne décide pas
seul. Un `git diff` qui touche autre chose que ce tableau est un échec, quelle que soit la qualité du
reste.

---

# DÉFAUT 1 — Les menus déroulants natifs ignorent le thème

## Ce que montrent les captures

Le champ **Fonction** est un `<select>` natif. Fermé, il est correctement thémé : fond sombre,
bordure `--line2`, texte `--txt`. **Ouvert**, sa liste est rendue par le système d'exploitation :

- panneau **blanc opaque** de ~180 px de haut, posé par-dessus le contenu ;
- options en gris très clair sur blanc — **illisibles** (« Opérateur », « Chercheuse », « Athlète »,
  « Étudiante » sont pratiquement invisibles) ;
- ligne survolée en **bleu système `#0d6efd`**, qui n'appartient à aucun des trois thèmes ;
- le panneau **ne change pas** quand on passe de `neural` à `plasma` : sur la capture 2 toute
  l'interface est passée au magenta, le menu est resté blanc et bleu. C'est exactement ce que
  l'utilisateur signale par « le problème du blanc quand on change d'apparence ».

Ce n'est pas un bug de CSS mal écrit : **le panneau d'un `<select>` natif n'est pas stylable.**
`option { background: … }` est ignoré ou partiellement appliqué selon l'OS, et aucune propriété ne
permet d'atteindre le fond de la liste ni la couleur de survol. Toute tentative de correction par
CSS sur `option` est une perte de temps — le prototype avait le même défaut.

## Ce qu'il faut faire

**Remplacer tous les `<select>` de l'application par un composant unique `<Select>` en React,
piloté au clavier, dont le panneau est un élément du DOM que nous stylons.** Aucun `<select>` natif
ne doit subsister dans une vue.

### Contrat du composant

`components/ui/select.tsx`

```ts
interface SelectOption<T extends string> { value: T; label: string; hint?: string }

interface SelectProps<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;          // libellé associé (id ↔ aria-labelledby)
  placeholder?: string;
  disabled?: boolean;
  /** rendu à plat, sans bordure, pour les barres d'outils denses */
  variant?: 'field' | 'inline';
}
```

### Comportement — non négociable

| Aspect | Exigence |
|---|---|
| Structure | `<button role="combobox">` + panneau `role="listbox"` avec `option` en `role="option"` |
| ARIA | `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-selected` sur l'option active |
| Clavier | `Espace` / `Entrée` / `↓` ouvrent · `↑` `↓` déplacent · `Début` `Fin` sautent aux extrêmes · frappe d'une lettre saute à la première option correspondante · `Entrée` valide · `Échap` ferme et **rend le focus au bouton** · `Tab` ferme en validant |
| Souris | clic sur le bouton ouvre/ferme · clic extérieur ferme · pas de fermeture au simple survol |
| Positionnement | ancré sous le bouton, **retourné au-dessus** s'il manque de place en bas ; largeur = celle du bouton, `min-width` respectée ; `max-height: 280px` puis défilement interne |
| Empilement | dans un portail (`createPortal` vers `document.body`) avec `z-index` au-dessus des tiroirs et de la palette ⌘K — sinon il sera coupé par les panneaux à `overflow:hidden` |
| Défilement | l'option active est ramenée dans la vue par ajustement de `scrollTop` — **jamais `scrollIntoView`** |
| Réduction de mouvement | sous `prefers-reduced-motion: reduce`, aucune transition d'ouverture |

### Style — les valeurs exactes, toutes en `var(--*)`

Le panneau **doit** hériter du thème courant : il ne contient aucun hex.

```
Bouton (variant 'field')
  height 40px · padding 10px 12px · border-radius 11px
  background var(--panel2) · border 1px solid var(--line) · color var(--txt) · font 13px
  :hover        border-color var(--line2)
  [data-open]   border-color var(--acc) · box-shadow 0 0 0 3px rgba(var(--glow), .18)
  :focus-visible outline 1.5px solid var(--acc2) · outline-offset 3px
  chevron       lucide ChevronDown 15px · color var(--mut) · rotation 180° à l'ouverture (.18s ease)

Panneau
  background var(--panel) · backdrop-filter blur(20px) saturate(150%)   (+ -webkit-)
  border 1px solid var(--line2) · border-radius 11px · padding 5px
  box-shadow 0 18px 44px -12px rgba(0,0,0,.66), 0 0 0 1px rgba(var(--glow), .10)
  margin-top 6px · max-height 280px · overflow-y auto
  animation: ouverture .14s ease — opacity 0→1, translateY -4px→0

Option
  padding 9px 11px · border-radius 7px · font 13px · color var(--txt2)
  :hover / actif au clavier   background rgba(var(--glow), .16) · color var(--txt)
  sélectionnée                background rgba(var(--glow), .24) · color var(--txt) · font-weight 500
                              + lucide Check 14px à droite, color var(--acc2)
  hint (facultatif)           11px · JetBrains Mono · color var(--mut)
  désactivée                  opacity .45 · pointer-events none
```

**Le bleu `#0d6efd` du survol système disparaît de fait** : la ligne active est
`rgba(var(--glow), .16)`, donc bleue en `neural`, magenta en `plasma`, bleu profond en `clinical` —
elle suit le thème par construction.

### Où l'appliquer

Chercher **tous** les `<select>` du dépôt et les convertir. Ceux repérés sur la vue Profil et dans
la spécification :

- Profil → **Fonction** (celui des captures)
- Réglages → thème, langue, début de semaine
- Éditeur d'habitude → catégorie, type d'objectif, mode de planification, unité
- Éditeur de tâche → priorité, récurrence
- Éditeur d'objectif → type, habitude source
- Statistiques → fenêtre d'analyse (7 / 30 / 90 / 365 j)
- Calendrier → mois / semaine / jour / agenda (si rendu en liste plutôt qu'en segments)

### Filet de sécurité en CSS — à ajouter quand même

Il restera peut-être un `<select>` natif dans un formulaire non porté, et il y aura des `<input>`
avec liste. Poser ceci dans `styles/globals.css` pour que le pire cas soit dégradé, pas blanc :

```css
select {
  color-scheme: dark;                       /* Chrome/Edge/Firefox : panneau sombre natif */
  background: var(--panel2);
  color: var(--txt);
  border: 1px solid var(--line);
}
[data-theme='clinical'] select { color-scheme: light; }
select option { background: var(--bg2); color: var(--txt); }
```

`color-scheme` est le **seul** levier qui agisse réellement sur le panneau natif. Il ne suffit pas
(la couleur de survol reste celle du système), d'où le composant — mais il évite le rectangle blanc
si un `<select>` échappe à la conversion.

### Critère d'arrêt du défaut 1

1. Aucun `<select>` natif dans une vue (`grep -r '<select' app components` ne renvoie rien).
2. Ouvrir le menu **Fonction** dans les trois thèmes : le panneau est sombre en `neural` et
   `plasma`, clair en `clinical`, et la ligne survolée prend l'accent du thème — **jamais de bleu
   système, jamais de fond blanc.**
3. Basculer de thème **menu ouvert** : le panneau change de couleur en même temps que le reste.
4. Les six options sont lisibles ; contraste texte/fond ≥ 4.5:1 dans les trois thèmes.
5. Parcours clavier complet sans souris, et sans piège de focus.
6. Le menu ouvert près du bas de la fenêtre se retourne vers le haut au lieu d'être coupé.

---

# DÉFAUT 2 — L'interrupteur « Curseur réticule » ne fait rien

## Ce que montrent les captures

En bas de **Préférences**, la ligne « Curseur réticule » et son interrupteur existent. Le réglage
est porté, **le curseur ne l'est pas** : la souris reste la flèche du système. C'est le troisième
interrupteur décoratif du produit, après *notifications* et *son* — et un réglage sans effet est un
mensonge d'interface.

## Ce qu'il faut faire

Implémenter le curseur personnalisé du prototype, piloté par `settings.customCursor`.

### Comportement

`components/shell/reticle-cursor.tsx` — monté une fois dans la coque, rendu **uniquement** si
`settings.customCursor === true`.

1. **Masquer le curseur natif** sur la surface applicative : `cursor: none` posé sur `<body>` par un
   attribut `[data-cursor='reticle']`, retiré dès que le réglage est coupé.
2. **Dessiner le réticule** dans un élément en `position: fixed`, `pointer-events: none`,
   `z-index` maximal, hors du flux et **hors du cycle de rendu React** : suivre la souris dans un
   `requestAnimationFrame` qui écrit directement `el.style.transform = translate3d(x, y, 0)`.
   Ne **jamais** faire de `setState` sur `mousemove`.
3. **Deux éléments concentriques**, aux valeurs du prototype :
   - *noyau* : 6 px, `background var(--acc2)`, `border-radius 50%`, suit la souris sans retard ;
   - *anneau* : 26 px, `border 1px solid rgba(var(--glow), .55)`, `border-radius 50%`, suit avec un
     amortissement (interpolation ~0.18 par image) — c'est ce décalage qui donne la sensation
     d'instrument ;
   - animation `curPulse` 1.6 s infinie sur l'anneau (`opacity .55 ↔ 1`, `scale 1 ↔ 1.08`).
4. **États** :
   - au-dessus d'un élément cliquable (`a, button, [role='button'], input, select, [data-hit]`) :
     anneau à 34 px, `border-color var(--acc)`, épaisseur 1.5 px ;
   - bouton enfoncé : noyau à 10 px, anneau à 20 px, transition `.12s`;
   - au-dessus d'un champ de texte : le noyau devient une barre `2 × 18 px`, `border-radius 1px` ;
   - curseur sorti de la fenêtre (`mouseleave` sur `document`) : opacité 0.

### Les quatre garde-fous — sinon ne pas livrer la fonctionnalité

| Condition | Conduite |
|---|---|
| `prefers-reduced-motion: reduce` | pas d'amortissement, pas de `curPulse` : le réticule colle à la souris, sans pulsation |
| Pointeur grossier (`(pointer: coarse)`) ou absence de souris | **ne pas monter le composant du tout**, et **masquer la ligne de réglage** : sur téléphone, `cursor:none` n'a aucun sens et le réglage n'est pas actionnable |
| Réglage coupé | retirer l'attribut, démonter le composant, rendre le curseur système — vérifier qu'il n'y a **aucun** état où `cursor:none` survit sans réticule dessiné (l'utilisateur perdrait sa souris) |
| Impression / export PDF | `@media print { [data-cursor] { cursor: auto } }` et réticule non rendu |

### Accessibilité

Le réticule est purement décoratif : `aria-hidden="true"`. Il ne doit **jamais** intercepter un
événement (`pointer-events: none` sur tous ses nœuds) ni masquer un contenu (aucun fond opaque).

### Le réglage lui-même

Ligne « Curseur réticule » / « Reticle cursor » (clés `settings.customCursor.*` dans
`messages/fr.json` et `messages/en.json`, **symétriques**), sous-titre expliquant l'effet.
Persister dans `settings` comme les autres préférences. Sur pointeur grossier, la ligne disparaît —
pas grisée : absente.

### Critère d'arrêt du défaut 2

1. Interrupteur activé : le curseur système disparaît, le réticule le remplace, l'anneau traîne
   légèrement, le noyau ne traîne pas.
2. Survol d'un bouton, puis d'un champ de texte, puis clic : les trois états sont visibles et
   distincts.
3. Interrupteur coupé : le curseur système revient immédiatement, aucun résidu.
4. Sous `prefers-reduced-motion`, aucune pulsation ni amortissement.
5. Sur émulation mobile, la ligne de réglage est **absente** et rien n'est monté.
6. Aucun `setState` déclenché par `mousemove` (vérifier au profileur : le déplacement de la souris
   ne doit produire aucun rendu React).

---

## Contexte à relire avant de commencer

| Fichier | Pourquoi |
|---|---|
| `docs/PROMPT-RESTAURATION-DESIGN.md` § 2.1–2.3 | les trois thèmes, valeurs exactes — la source de `--glow`, `--acc2`, `--panel` |
| `docs/PROMPT-RESTAURATION-DESIGN.md` § 2.7 | l'inventaire des animations, dont `curPulse` 1.6 s |
| `public/prototype/Habitum.dc.html` | le réticule d'origine, en fonctionnement — c'est la référence |
| `docs/ANALYSE-REPRISE.md` § 4 | les autres interrupteurs décoratifs (`notif`, `sound`, `vibrate`) : même défaut, phase 4 |
| `CLAUDE.md` | styles en ligne, libellés symétriques, jamais de `scrollIntoView` |

## Ordre de traitement

Le défaut 1 d'abord : il rend une vue inutilisable dans deux thèmes sur trois. Le défaut 2 ensuite.
Les deux sont indépendants et peuvent partir en deux livraisons distinctes — mais aucune ne se
termine sans son critère d'arrêt vert et `npm run verify` au vert.

Dernier contrôle avant de rendre la main : relire `git diff --stat` et vérifier que **chaque fichier
listé appartient au tableau du périmètre**. Si un autre apparaît, le rétablir.
