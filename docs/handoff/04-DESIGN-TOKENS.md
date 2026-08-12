# 04 — Tokens de design (valeurs exactes du prototype)

Extraits du `<style>` de `Habitum.dc.html`. Thème par attribut `[data-theme]` sur `<html>`.

## Couleurs

### `neural` (défaut, sombre bleu) — aussi les valeurs de `:root`
```css
--bg:     #04060d      /* fond application */
--bg2:    #070c18      /* fond des champs, surfaces enfoncées */
--panel:  rgba(11,18,34,.66)        /* panneaux en verre dépoli */
--panel2: rgba(120,175,255,.075)    /* surface secondaire, puces */
--line:   rgba(120,190,255,.16)     /* bordure standard 1px */
--line2:  rgba(120,190,255,.34)     /* bordure accentuée */
--txt:    #eaf2ff      --txt2: #a9bdda      --mut: #69809f
--acc:    #4d7cff      --acc2: #22e0d0      --acc3: #b57cff
--ok:     #2ee6a8      --warn: #ffb340      --bad:  #ff4d6d
--glow:   77,124,255   /* triplet RGB pour rgba(var(--glow), α) */
```

### `plasma` (sombre violet)
```css
--bg:#07040e  --bg2:#0d0718  --panel:rgba(24,12,40,.66)  --panel2:rgba(220,140,255,.08)
--line:rgba(216,140,255,.18)  --line2:rgba(216,140,255,.36)
--txt:#f6ecff  --txt2:#cbb0e4  --mut:#8b71a6
--acc:#c264ff  --acc2:#ff5fa8  --acc3:#6fe3ff
--ok:#3ce6b0  --warn:#ffb340  --bad:#ff4d6d  --glow:194,100,255
```
✅ Contraste vérifié le 12 août 2026 : `--mut` sur `--bg` = **4,85**, sur `--bg2` = **4,72**.
L'avertissement porté ici jusqu'au 12 août 2026 — « `--mut` sous WCAG AA » — était **faux** :
mesure faite, c'est `clinical` qui échouait, pas `plasma`. Voir `tests/unit/contrast.test.ts`.

### `clinical` (clair)
```css
--bg:#eef2f8  --bg2:#e4eaf3  --panel:rgba(255,255,255,.74)  --panel2:rgba(20,60,120,.06)
--line:rgba(20,60,120,.16)  --line2:rgba(20,60,120,.3)
--txt:#0d1725  --txt2:#3c4c63  --mut:#596a82
--acc:#2b5bff  --acc2:#0aa9a0  --acc3:#7c3aed
--ok:#0f9d64  --warn:#b26a00  --bad:#d32546  --glow:43,91,255
```
⚠️ `--mut` valait `#6c7d95` jusqu'au 12 août 2026 : **3,73** sur `--bg` et **3,47** sur `--bg2`,
sous le seuil AA de 4,5 exigé par du texte de 9,5 px. Corrigé **à la source** (prototype) en
`#596a82` — 4,91 et 4,56 — puis `tokens.css` régénéré par extraction.

### Couleurs de catégorie (fixes, hors thème)
| Clé | FR | EN | Couleur | Glyphe |
|---|---|---|---|---|
| `health` | Santé | Health | `#2ee6a8` | ✚ |
| `sport` | Sport | Sports | `#4d7cff` | ▲ |
| `mind` | Esprit | Mind | `#b57cff` | ◉ |
| `work` | Travail | Work | (voir `CAT` dans le prototype) | ■ |
| `home` | Maison | Home | — | ◆ |
| `study` | Études | Study | — | ● |

Teintes d'avatar (OKLCH, `HUES`) : `188, 214, 266, 318, 158, 32`.
Avatar : `border-radius: taille × 0.3`, dégradé OKLCH sur la teinte, ombre
`0 (0.2×t)px (0.6×t)px -(0.28×t)px oklch(.72 .17 h / .9)` + `inset 0 1px 0 rgba(255,255,255,.35)`.

## Typographie

- Titres et interface : **Space Grotesk** 400 / 500 / 600 / 700
- Chiffres, libellés techniques, badges : **JetBrains Mono** 400 / 500 / 700
- Micro-libellé (`fLab`) : JetBrains Mono, `9.5px`, `letter-spacing .18em`, `uppercase`, `--mut`
- Corps d'interface : `12.5px` – `13px`
- Champs (`fIn`) : `13px`, padding `10px 12px`
- Puces / méta : `10.5px` – `11.5px`
- Titres de section : `15px` – `18px` ; grands nombres de statistiques : `28px` – `44px`

## Formes et profondeur

```
Rayons : 5px (puces) · 7px (petits boutons) · 9px (boutons) · 11px (champs, cartes internes)
         16px (panneaux) · 50%/99px (pastilles, avatars, barres de progression)
Bordures : 1px solid var(--line) ; accent 1px solid var(--line2)
Verre : background var(--panel) + backdrop-filter: blur(20px) saturate(150%)
        (+ préfixe -webkit-)
Lueur : box-shadow 0 Npx Mpx -Kpx rgba(var(--glow), α)
Focus : outline 1.5px solid var(--acc2) ; outline-offset 3px
Sélection : background rgba(var(--glow), .32)
Barres de défilement : 7px, pouce rgba(120,190,255,.28) → .5 au survol, border-radius 99px
```

## Espacements

Grilles et piles utilisent `gap` : `8 · 9 · 11 · 12 · 14 · 15 · 16 · 18 px`.
Padding de panneau : `13px 17px` (lignes de réglage), `14px 18px` (blocs), `12px 16px` (listes).
Largeur maximale de contenu : `1180px` (réglages), pleine largeur ailleurs.

## Animations (≈ 45 `@keyframes` — les utiles)

| Nom | Usage | Durée type |
|---|---|---|
| `fade` | entrée de vue | `.4s ease` |
| `rise` | apparition de carte | `.35s` |
| `pop` | validation de case (scale .6 → 1.18 → 1) | `.3s` |
| `slideup` | toast (translate -50 %) | `.25s` |
| `slidein` / `slR1` / `slL1` | tiroirs, transitions de mois | `.3s` |
| `breathe` | pastille de timer actif | `2s` infinite |
| `spin` / `spinr` | anneaux de chargement | `1.2s` linear |
| `scan`, `sweep`, `dash`, `flow`, `trace` | décor SVG, jauges | variable |
| `bootOut`, `bootRing`, `bootBar`, `bootTxt` | écran de démarrage | ~2s, une fois/session |
| `curPulse` | curseur personnalisé | `1.6s` |

Transitions : `.18s ease` (interrupteurs), `.2s` (fonds), `.5s ease` (barres de progression).

**Obligatoire :** `@media (prefers-reduced-motion: reduce)` neutralise toutes les animations
(`animation-duration:.001s`, `iteration-count:1`) — déjà présent, à conserver.

## Notes de portage

- Ces tokens sont à écrire tels quels dans `src/styles/tokens.css`, puis exposés à Tailwind v4 via
  `@theme` — ne pas les convertir en échelle Tailwind par défaut.
- Le `backdrop-filter` coûte cher : limiter aux panneaux de premier plan, jamais dans une liste.
- Les glyphes typographiques (`✚ ▲ ◉ ■ ◆ ● ◼ ✦ ↑ ∎`) servent d'icônes de catégorie ; en production,
  utiliser Lucide pour la navigation et les actions, conserver les glyphes uniquement comme
  marqueurs de catégorie/avatar (ils sont porteurs d'identité visuelle).
