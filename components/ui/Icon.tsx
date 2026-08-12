import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Repeat2,
  Settings,
  Target,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/lib/domain';

/* Icônes.

   IMPORTS NOMMÉS, jamais `import * as icons` : l'import étoile fait entrer
   toute la bibliothèque dans le bundle (plusieurs centaines de kilo-octets)
   et le budget de la phase est de 150 kB de First Load JS.

   Les GLYPHES TYPOGRAPHIQUES de catégorie sont conservés tels quels :
   04-DESIGN-TOKENS.md les qualifie de porteurs d'identité visuelle. Ce ne
   sont pas des icônes à remplacer, c'est la signature du produit. */

const ICONES = {
  dash: LayoutDashboard,
  today: CheckSquare,
  calendar: CalendarDays,
  habits: Repeat2,
  tasks: ListTodo,
  goals: Target,
  stats: BarChart3,
  timer: Timer,
  notes: NotebookPen,
  profile: User,
  settings: Settings,
  list: ClipboardList,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONES;

/** Glyphes de catégorie du prototype (`GLYPHS`), dans l'ordre des catégories. */
export const GLYPHES_CATEGORIE: Record<Category, string> = {
  health: '✚',
  sport: '▲',
  mind: '◉',
  work: '■',
  home: '◆',
  study: '●',
};

/** Icône décorative par défaut : `aria-hidden`. Le libellé voisin porte le
 *  sens ; annoncer les deux ferait répéter le lecteur d'écran. Passer `label`
 *  seulement quand l'icône est SEULE à porter l'information. */
export function Icon({
  name,
  size = 16,
  label,
}: {
  name: IconName;
  size?: number;
  label?: string;
}) {
  const Composant = ICONES[name];
  return (
    <Composant
      size={size}
      strokeWidth={1.6}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ flex: 'none' }}
    />
  );
}

/** Glyphe de catégorie. Décoratif : la catégorie est toujours écrite à côté. */
export function CategoryGlyph({ category }: { category: Category }) {
  return (
    <span aria-hidden="true" style={{ color: 'var(--acc2)' }}>
      {GLYPHES_CATEGORIE[category]}
    </span>
  );
}
