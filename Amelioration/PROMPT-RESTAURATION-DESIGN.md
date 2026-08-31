# Prompt de restauration du design — Habitum

> À copier tel quel dans Claude Code. Il décrit le design **de référence**, celui du dépôt de
> design, au caractère près. Toute divergence introduite depuis doit être ramenée à ce document.

---

## Consigne

Tu dois restaurer **exactement** le design de référence d'Habitum. Il y a **deux surfaces
distinctes et volontairement différentes** — ne les uniformise pas, c'est une décision tranchée
(`docs/handoff/07-DECISION-B1.md`, option (c)) :

| Surface | Fichier de référence | Système visuel |
|---|---|---|
| **L'application** (11 vues) | `public/prototype/Habitum.dc.html` | sombre, dense, 3 thèmes maison — **jamais** Modernist |
| **La vitrine + la documentation** | `public/prototype/Vitrine Habitum.dc.html` | **Modernist** (clair, rouge unique, filets 2 px) |

**Règles non négociables :**

1. L'application ne charge **jamais** `styles.css` de Modernist. La vitrine est le **seul** fichier
   qui le charge.
2. Aucun rayon d'angle dans la vitrine (`--radius-md` vaut 0 par choix). Aucun angle arrondi, nulle part.
3. Tout est **à fleur de marge gauche** : titres, copie, et les libellés à l'intérieur des boutons
   larges. Jamais de centrage.
4. Les filets de section sont des **2 px solides** `var(--color-divider)`. Ne pas les affiner en
   hairline, ne pas les remplacer par du blanc.
5. Le rouge ne court en aplat qu'**une seule fois** : le bloc affiche final. Partout ailleurs c'est
   de l'encre sur fond clair.
6. Jamais un hex, un nom de police ou un px que les jetons portent déjà. Tout passe par `var(--*)`.
7. Styles **en ligne uniquement** dans les composants de design ; le `<style>` du helmet est réservé
   aux resets, `@media`, `@font-face`, `@keyframes`.

---

## PARTIE 1 — La vitrine (système Modernist)

### 1.1 Chargement — exactement ces deux lignes, en tête de `<helmet>`

```html
<link rel="stylesheet" href="_ds/modernist-8b2e5546-807b-4975-bde8-911e4f671604/styles.css">
<script src="_ds/modernist-8b2e5546-807b-4975-bde8-911e4f671604/_ds_bundle.js"></script>
```

Si le dossier est absent, prendre celui de `_ds/` dont le nom **finit** par
`8b2e5546-807b-4975-bde8-911e4f671604`. Ne jamais recopier les composants du système à la main :
utiliser ses classes (`.btn`, `.card`, `.table`, `.tag`, `.hr`, `.grayscale`).

### 1.2 Reset du helmet — à l'identique

```css
body{margin:0;background:var(--color-bg);color:var(--color-text)}
a{color:var(--color-accent-700);text-decoration:none}
a:hover{color:var(--color-accent)}
```

Le lien par défaut est `--color-accent-700`, **pas** `--color-accent` : à taille de paragraphe
l'accent pur ne tient pas le contraste. Le survol seul monte à l'accent.

### 1.3 Enveloppe

```
max-width: 1280px ; margin: 0 auto ; padding: 0 var(--space-6) var(--space-10)
```

### 1.4 Structure — six blocs, dans cet ordre, séparés par des filets de 2 px

**a. En-tête** — `display:flex; align-items:baseline; gap:var(--space-6); padding:var(--space-5) 0;
border-bottom:2px solid var(--color-divider)`
- « Habitum » — `--font-heading`, 20px, 700, `letter-spacing:-.02em`
- Slogan « Habitudes · Tâches · Objectifs · Focus » — `--font-body`, 12px, `letter-spacing:.14em`,
  capitales, `--color-neutral-600`, `white-space:nowrap`
- un `<span style="flex:1">` pousse le lien à droite
- « Ouvrir l'application → » — 13px, 600

**b. Héros** — grille `7fr 5fr`, `gap:var(--space-8)`, `padding:var(--space-9) 0`
- Sur-titre « Local-first · sans compte · gratuit » — 12px, `letter-spacing:.16em`, capitales,
  `--color-accent-700`
- `h1` « **Vos habitudes restent sur votre machine.** » — 64px, `line-height:1.02`, 700,
  `letter-spacing:-.03em`, `max-width:22ch`
- Paragraphe — 18px, `line-height:1.6`, `max-width:52ch`, `--color-neutral-800`
- Deux actions, `gap:var(--space-3)` : `.btn.btn-primary` « Ouvrir l'application » +
  `.btn.btn-secondary` « Voir les tests »
- Colonne de droite : `border-left:2px solid var(--color-divider)`,
  `padding-left:var(--space-6)`, `align-self:start`, `gap:var(--space-5)` — trois chiffres,
  chacun en `--font-heading` 44px 700 `line-height:1` `letter-spacing:-.02em`, légende 13px
  `--color-neutral-600` ; les 2ᵉ et 3ᵉ portent
  `border-top:1px solid var(--color-neutral-300); padding-top:var(--space-5)` :

  | Chiffre | Légende |
  |---|---|
  | `0 €` | Coût d'exploitation. Aucune brique payante. |
  | `62/62` | Valeurs de référence du moteur, vérifiées à chaque livraison. |
  | `11` | Vues, en français et en anglais, dans trois thèmes. |

  (Espaces insécables `&nbsp;` dans « 0 € » et « 62 valeurs ».)

**c. Trois colonnes** — `repeat(3,1fr)`, séparateurs **verticaux internes**
`1px solid var(--color-neutral-300)` sur les deux premières cellules seulement.
Padding asymétrique volontaire, pour que le texte reste à fleur des marges de l'enveloppe :
`var(--space-7) var(--space-6) var(--space-7) 0` · `var(--space-7) var(--space-6)` ·
`var(--space-7) 0 var(--space-7) var(--space-6)`.
Chaque cellule : sur-titre 11px `letter-spacing:.16em` capitales `--color-neutral-600`, `h2` 24px
600 `letter-spacing:-.01em`, corps 15px `line-height:1.6` `--color-neutral-800`.

| Sur-titre | Titre |
|---|---|
| Suivi | Séries qui ne mentent pas |
| Organisation | Cinq façons de voir la semaine |
| Focus | Le temps compté, pas inventé |

**d. Tableau** — `h2` 32px 700 `letter-spacing:-.02em` « Ce que « local-first » veut dire ici »,
puis `<table class="table" style="width:100%">`, première colonne `width:34%`, en-têtes
« Question » / « Réponse », **six** lignes (données, compte, vidage du navigateur, récupération,
hors ligne, coût). Ne pas remplacer le tableau par des cartes.

**e. Deux identités** — grille `5fr 7fr`, `gap:var(--space-8)`. À gauche `h2` 32px + paragraphe
15px `line-height:1.65`. À droite deux `.card` empilées (`gap:var(--space-4)`) utilisant
`.card-kicker` / `.card-title` / `.card-body` : « Produit / Interface sombre « Neural » » et
« Vitrine et documentation / Système Modernist ».

**f. Affiche rouge** — le seul aplat d'accent de la page :
`background:var(--color-accent); color:#fff; padding:var(--space-9) var(--space-8);
margin-top:var(--space-8)`
- Sur-titre « Prêt à essayer » — 12px, `letter-spacing:.18em`, capitales, `opacity:.85`
- `h2` 56px, `line-height:1.04`, 700, `letter-spacing:-.03em`, `max-width:26ch`
- Paragraphe 16px, `max-width:56ch`, `opacity:.92`
- Bouton : fond `#fff`, texte `var(--color-accent-700)`, 15px 700,
  `padding:var(--space-4) var(--space-6)`, **`text-align:left`** — pas de `.btn`, pas de centrage.

**g. Pied** — flex, `gap:var(--space-6)`, `flex-wrap:wrap`, `padding:var(--space-6) 0`, 12.5px,
`--color-neutral-600` : mention + Recette + Décisions + Journal des versions + Dossier de passation.

### 1.5 Responsive — une seule requête média, `max-width:1000px`

```css
[data-head]{flex-wrap:wrap;row-gap:var(--space-2)}
[data-tagline]{display:none}
[data-hero],[data-split]{grid-template-columns:1fr!important}
[data-hero] [data-aside]{border-left:0!important;border-top:2px solid var(--color-divider);padding-left:0!important;padding-top:var(--space-6)}
[data-3col]{grid-template-columns:1fr!important}
[data-3col]>div{border-right:0!important;border-bottom:1px solid var(--color-neutral-300);padding:var(--space-6) 0!important}
[data-poster] h2{font-size:38px!important}
[data-hero] h1{font-size:44px!important}
```

Les attributs `data-head`, `data-tagline`, `data-hero`, `data-aside`, `data-3col`, `data-split`,
`data-poster` **sont des crochets de style** : les supprimer casse le responsive. Ne pas les
remplacer par des classes.

### 1.6 Aperçu

`data-props` = `{"$preview":{"width":1280,"height":900}}`.

---

## PARTIE 2 — L'application (système maison, sombre)

**Ne pas appliquer Modernist ici.** L'application est un outil regardé pendant des heures : fond
sombre, densité forte, verre dépoli, lueurs. Valeurs exactes — les écrire dans `styles/tokens.css`,
puis les exposer à Tailwind v4 via `@theme` ; **ne pas** les convertir vers l'échelle Tailwind
par défaut.

### 2.1 Thème `neural` (défaut, = `:root`)

```css
--bg:#04060d  --bg2:#070c18
--panel:rgba(11,18,34,.66)  --panel2:rgba(120,175,255,.075)
--line:rgba(120,190,255,.16)  --line2:rgba(120,190,255,.34)
--txt:#eaf2ff  --txt2:#a9bdda  --mut:#69809f
--acc:#4d7cff  --acc2:#22e0d0  --acc3:#b57cff
--ok:#2ee6a8  --warn:#ffb340  --bad:#ff4d6d
--glow:77,124,255            /* triplet RGB, pour rgba(var(--glow), α) */
```

### 2.2 Thème `plasma`

```css
--bg:#07040e  --bg2:#0d0718  --panel:rgba(24,12,40,.66)  --panel2:rgba(220,140,255,.08)
--line:rgba(216,140,255,.18)  --line2:rgba(216,140,255,.36)
--txt:#f6ecff  --txt2:#cbb0e4  --mut:#8b71a6
--acc:#c264ff  --acc2:#ff5fa8  --acc3:#6fe3ff
--ok:#3ce6b0  --warn:#ffb340  --bad:#ff4d6d  --glow:194,100,255
```

### 2.3 Thème `clinical` (clair — ce n'est **pas** Modernist)

```css
--bg:#eef2f8  --bg2:#e4eaf3  --panel:rgba(255,255,255,.74)  --panel2:rgba(20,60,120,.06)
--line:rgba(20,60,120,.16)  --line2:rgba(20,60,120,.3)
--txt:#0d1725  --txt2:#3c4c63  --mut:#6c7d95
--acc:#2b5bff  --acc2:#0aa9a0  --acc3:#7c3aed
--ok:#0f9d64  --warn:#b26a00  --bad:#d32546  --glow:43,91,255
```

Sélection du thème : attribut `[data-theme]` sur `<html>`. Pas de classe, pas de `prefers-color-scheme`.

### 2.4 Catégories — couleurs fixes, hors thème

| Clé | FR / EN | Couleur | Glyphe |
|---|---|---|---|
| `health` | Santé / Health | `#2ee6a8` | ✚ |
| `sport` | Sport / Sports | `#4d7cff` | ▲ |
| `mind` | Esprit / Mind | `#b57cff` | ◉ |
| `work` | Travail / Work | voir `CAT` | ■ |
| `home` | Maison / Home | voir `CAT` | ◆ |
| `study` | Études / Study | voir `CAT` | ● |

Teintes d'avatar (OKLCH, tableau `HUES`) : `188, 214, 266, 318, 158, 32`.
Avatar : `border-radius: taille × 0.3`, dégradé OKLCH sur la teinte, ombre
`0 (0.2×t)px (0.6×t)px -(0.28×t)px oklch(.72 .17 h / .9)` + `inset 0 1px 0 rgba(255,255,255,.35)`.

### 2.5 Typographie de l'application

- Titres et interface : **Space Grotesk** 400 / 500 / 600 / 700
- Chiffres, libellés techniques, badges : **JetBrains Mono** 400 / 500 / 700
- Micro-libellé : JetBrains Mono `9.5px`, `letter-spacing:.18em`, capitales, `--mut`
- Corps : `12.5–13px` · champs `13px` (`padding:10px 12px`) · puces et méta `10.5–11.5px`
- Titres de section `15–18px` · grands nombres de statistiques `28–44px`

### 2.6 Formes et profondeur

```
Rayons : 5 (puces) · 7 (petits boutons) · 9 (boutons) · 11 (champs, cartes internes)
         16 (panneaux) · 50%/99px (pastilles, avatars, barres)
Bordures : 1px solid var(--line) ; accentuée 1px solid var(--line2)
Verre : background var(--panel) + backdrop-filter: blur(20px) saturate(150%) (+ -webkit-)
Lueur : box-shadow 0 Npx Mpx -Kpx rgba(var(--glow), α)
Focus : outline 1.5px solid var(--acc2) ; outline-offset 3px
Sélection : rgba(var(--glow), .32)
Défilement : 7px, pouce rgba(120,190,255,.28) → .5 au survol, border-radius 99px
Espacements (gap) : 8 · 9 · 11 · 12 · 14 · 15 · 16 · 18
Padding de panneau : 13px 17px (lignes de réglage) · 14px 18px (blocs) · 12px 16px (listes)
Largeur max de contenu : 1180px (réglages), pleine largeur ailleurs
```

### 2.7 Mouvement

`fade` .4s (entrée de vue) · `rise` .35s (carte) · `pop` .3s (case cochée, scale .6→1.18→1) ·
`slideup` .25s (toast) · `slidein`/`slR1`/`slL1` .3s (tiroirs, mois) · `breathe` 2s infinite
(timer actif) · `spin`/`spinr` 1.2s linear · `scan`/`sweep`/`dash`/`flow`/`trace` (décor SVG) ·
`bootOut`/`bootRing`/`bootBar`/`bootTxt` ~2s une fois par session · `curPulse` 1.6s.
Transitions : `.18s ease` (interrupteurs) · `.2s` (fonds) · `.5s ease` (barres de progression).

**Obligatoire, à conserver :** `@media (prefers-reduced-motion: reduce)` neutralise tout
(`animation-duration:.001s`, `animation-iteration-count:1`).

### 2.8 Palier téléphone

Une seule requête `max-width:767px`, plus le calcul `layVals`. **Ne rien changer au-dessus de
1060 px** : c'est la référence visuelle validée.

### 2.9 Icônes

Lucide pour la navigation et les actions. Les glyphes typographiques
(`✚ ▲ ◉ ■ ◆ ● ◼ ✦ ↑ ∎`) restent **uniquement** comme marqueurs de catégorie et d'avatar : ils
portent l'identité visuelle, ne pas les remplacer par des icônes Lucide.

---

## Sources — dans cet ordre de priorité

| # | Source | Ce qu'elle tranche |
|---|---|---|
| 1 | `public/prototype/Vitrine Habitum.dc.html` | le design de la vitrine, au caractère près |
| 2 | `public/prototype/Habitum.dc.html` | le design de l'application, au caractère près |
| 3 | `docs/handoff/04-DESIGN-TOKENS.md` | la table des jetons, déjà extraite |
| 4 | `docs/handoff/05-SPEC-VUES.md` | la composition des 11 vues |
| 5 | `public/prototype/tests/visual/reference/` | une capture par vue — l'arbitre visuel |
| 6 | `docs/handoff/07-DECISION-B1.md` | pourquoi deux identités, et non une |
| 7 | `_ds/modernist-…/readme.md` + `styles.css` | les règles et les jetons Modernist |
| 8 | `docs/adr/0005-styles-en-ligne.md` | pourquoi aucun style statique ne passe par une valeur calculée |

En cas de contradiction entre ce document et un fichier de la liste, **le fichier gagne** — et
signale-le moi pour que je corrige ce document.

## Critère d'arrêt

- La vitrine, à 1280 px, est superposable à la référence : mêmes filets, mêmes tailles, même
  chiffre rouge unique en fin de page.
- Aucun angle arrondi, aucun texte centré, aucun filet affiné.
- L'application ne charge pas `styles.css` de Modernist ; ses trois thèmes rendent aux valeurs
  ci-dessus.
- Aucun débordement horizontal à 390 / 768 / 1000 / 1060 / 1440 px.
