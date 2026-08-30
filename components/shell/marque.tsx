/* Marque du produit dans le rail — portée du bloc `lay.brand`
   (`public/prototype/Habitum.dc.html`, lignes 111–120).

   Trois couches empilées, et l'ordre compte :
     1. un dégradé conique qui TOURNE — c'est lui, le liseré animé ;
     2. un disque au fond de la page posé 1,5 px en retrait, qui masque le
        centre du dégradé et ne laisse dépasser qu'un anneau ;
     3. le glyphe, au-dessus.

   L'anneau n'est donc pas une bordure : une bordure ne peut pas porter de
   dégradé conique. C'est un fond qu'on recouvre.

   `@keyframes spin` vit dans `styles/motion.css`, et la préférence « mouvement
   réduit » l'immobilise avec tout le reste. */
export function MarqueHabitum({ size = 38 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      className="relative grid flex-none place-items-center"
      style={{ width: size, height: size }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '12px',
          background: 'conic-gradient(from 0deg,var(--acc),var(--acc2),var(--acc3),var(--acc))',
          animation: 'spin 7s linear infinite',
          /* Un demi-pixel de flou : sans lui, les quatre arrêts du dégradé
             conique se voient comme quatre coutures nettes. */
          filter: 'blur(.4px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '1.5px',
          borderRadius: '11px',
          background: 'var(--bg)',
        }}
      />
      <svg
        width={size / 2}
        height={size / 2}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--acc2)"
        strokeWidth="1.7"
        style={{ position: 'relative' }}
      >
        <circle cx="12" cy="5" r="2.1" />
        <circle cx="5" cy="16" r="2.1" />
        <circle cx="19" cy="16" r="2.1" />
        <circle cx="12" cy="12" r="2.1" />
        <path d="M12 7.1v2.8M10.2 13.4 6.6 14.6M13.8 13.4l3.6 1.2" />
      </svg>
    </div>
  );
}
