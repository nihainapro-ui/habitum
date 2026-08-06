/** Marqueur de portage : chaque route existe, aucune ne prétend être finie.
 *  À supprimer au fur et à mesure que les vues sont portées (phase 2–3 du plan). */
export function PortStatus({ view, title }: { view: string; title: string }) {
  return (
    <section style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 34, letterSpacing: '-0.03em', margin: 0 }}>{title}</h1>
      <p style={{ color: 'var(--mut)', lineHeight: 1.6, margin: 0 }}>
        Route en place, vue non encore portée. La référence exécutable de cet écran est le
        prototype, servi tel quel.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/prototype/Habitum.dc.html" style={{ fontSize: 14 }}>
          Ouvrir le prototype
        </a>
        <span style={{ color: 'var(--mut)', fontSize: 14 }}>
          spécification : docs/handoff/05-SPEC-VUES.md § {view}
        </span>
      </div>
    </section>
  );
}
