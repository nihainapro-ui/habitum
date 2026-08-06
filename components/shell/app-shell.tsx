import type { ReactNode } from 'react';
import Link from 'next/link';

const NAV = [
  { href: '/', label: 'Tableau de bord' },
  { href: '/today', label: "Aujourd'hui" },
  { href: '/habits', label: 'Habitudes' },
  { href: '/tasks', label: 'Tâches' },
  { href: '/goals', label: 'Objectifs' },
  { href: '/calendar', label: 'Calendrier' },
  { href: '/stats', label: 'Statistiques' },
  { href: '/timer', label: 'Focus' },
  { href: '/notes', label: 'Notes' },
  { href: '/profile', label: 'Profil' },
  { href: '/settings', label: 'Réglages' },
];

/** Coque de navigation minimale. Le rail complet, le mode zen et la palette ⌘K
 *  sont spécifiés dans docs/handoff/05-SPEC-VUES.md et restent à porter. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <nav
        aria-label="Navigation principale"
        style={{
          borderRight: '1px solid var(--line)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <strong style={{ fontSize: 18, letterSpacing: '-0.02em', marginBottom: 16 }}>
          Habitum
        </strong>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{ color: 'var(--mut)', padding: '8px 10px', borderRadius: 8, fontSize: 14 }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main style={{ padding: 40 }}>{children}</main>
    </div>
  );
}
