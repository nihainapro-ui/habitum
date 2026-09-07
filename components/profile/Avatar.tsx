'use client';

/* Avatar génératif — 04-DESIGN-TOKENS.md § Teintes d'avatar.

   Rayon = taille × 0,3, dégradé OKLCH sur la teinte, ombre portée dans la même
   teinte. Aucune image : un avatar qui se dessine ne se télécharge pas, ne
   fuit pas vers un service tiers et ne casse pas hors ligne. */

export function Avatar({
  glyph,
  hue,
  size = 56,
  label,
  photo,
}: {
  glyph: string;
  hue: number;
  size?: number;
  label: string;
  /** Photo locale, dataURL JPEG produite par `reduirePhoto` (lot D). Absente,
   *  l'avatar génératif prend le relais — c'est le défaut, et il le reste. */
  photo?: string | null;
}) {
  /* La photo REMPLACE le dégradé, elle ne se pose pas dessus : une image
     opaque au-dessus d'un dégradé, c'est un dégradé qu'on calcule pour rien.
     Elle garde en revanche le même rayon et la même ombre — un avatar photo et
     un avatar génératif doivent avoir exactement la même silhouette, sinon la
     liste des profils devient un patchwork.

     `<img>` natif et non `next/image` : la source est une dataURL locale, il
     n'y a ni réseau, ni optimisation possible, et `next/image` tirerait
     `sharp` — que le dépôt n'appelle nulle part (voir `package.json`). */
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={label}
        width={size}
        height={size}
        className="flex-none object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          boxShadow: `0 ${size * 0.2}px ${size * 0.6}px -${size * 0.28}px oklch(.72 .17 ${hue} / .9), inset 0 1px 0 rgba(255,255,255,.35)`,
        }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className="grid flex-none place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * 0.42,
        /* SEULE encre restée en dur, et c'est justifié : le dégradé ci-dessous
           est en OKLCH à clarté fixe (.78 / .62), donc CLAIR dans les trois
           thèmes — il ne suit pas les jetons. `--bg` y serait blanc sur clair
           dans `clinical`. Voir `components/ui/encre.ts`. */
        color: '#04060d',
        background: `linear-gradient(135deg, oklch(.78 .16 ${hue}), oklch(.62 .19 ${hue + 24}))`,
        boxShadow: `0 ${size * 0.2}px ${size * 0.6}px -${size * 0.28}px oklch(.72 .17 ${hue} / .9), inset 0 1px 0 rgba(255,255,255,.35)`,
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </span>
  );
}
