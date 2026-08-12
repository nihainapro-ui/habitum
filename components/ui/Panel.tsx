import type { ReactNode } from 'react';

/* Panneau de premier plan — rayon 16, verre dépoli.
   04-DESIGN-TOKENS.md : `backdrop-filter: blur(20px) saturate(150%)` est
   réservé aux panneaux de PREMIER PLAN. Jamais dans une liste : le coût de
   composition se paie par élément, et une liste de 200 cartes floutées
   effondre le défilement. */
export function Panel({
  title,
  actions,
  padding = 20,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  padding?: number;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-panel border"
      style={{
        borderColor: 'var(--line)',
        background: 'var(--panel)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }}
    >
      {title || actions ? (
        <header
          className="flex items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: 'var(--line)' }}
        >
          <h2 className="m-0 truncate text-[13px] font-semibold">{title}</h2>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
