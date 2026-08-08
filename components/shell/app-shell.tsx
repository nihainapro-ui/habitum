import type { ReactNode } from 'react';
import Link from 'next/link';

const NAV = [
  { href: '/app', label: 'Tableau de bord' },
  { href: '/app/today', label: "Aujourd'hui" },
  { href: '/app/habits', label: 'Habitudes' },
  { href: '/app/tasks', label: 'Tâches' },
  { href: '/app/goals', label: 'Objectifs' },
  { href: '/app/calendar', label: 'Calendrier' },
  { href: '/app/stats', label: 'Statistiques' },
  { href: '/app/timer', label: 'Focus' },
  { href: '/app/notes', label: 'Notes' },
  { href: '/app/profile', label: 'Profil' },
  { href: '/app/settings', label: 'Réglages' },
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
