'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { defilementVers, HAUTEUR_MAX, indexParFrappe, placerPanneau } from './select-calculs';

/* Menu déroulant — REMPLACE le `<select>` natif, et ce n'est pas une coquetterie.
 *
 * Le panneau d'un `<select>` natif est dessiné par le SYSTÈME D'EXPLOITATION,
 * pas par la page. Aucune propriété CSS ne l'atteint : ni son fond, ni la
 * couleur de la ligne survolée. `option { background }` est ignoré ou
 * partiellement appliqué selon l'OS. Résultat observé sur la vue Profil : un
 * panneau BLANC opaque, des libellés gris clair illisibles, et une ligne
 * survolée en bleu système `#0d6efd` — qui n'appartient à aucun des trois
 * thèmes et ne bougeait pas d'un pixel quand on passait de `neural` à `plasma`.
 *
 * Il n'y avait donc rien à corriger dans la feuille de style : il fallait que
 * le panneau devienne un élément du DOM. Ici, la ligne active est
 * `rgba(var(--glow), .16)` — bleue en `neural`, magenta en `plasma`, bleu
 * profond en `clinical`. Elle suit le thème PAR CONSTRUCTION, y compris si le
 * thème change alors que le menu est ouvert.
 *
 * `styles/globals.css` garde malgré tout un filet `color-scheme` pour tout
 * `<select>` natif qui échapperait à la conversion : le pire cas doit être
 * dégradé, pas blanc. */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Libellé visible ; sert de `aria-label` quand aucun `id` externe ne lie. */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Rendu à plat, sans bordure, pour les barres d'outils denses. */
  variant?: 'field' | 'inline';
  /** Repris de `Field` : le `<label htmlFor>` vise ce bouton. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-labelledby'?: string;
}

/** Délai après lequel la frappe recommence un mot, en millisecondes. */
const OUBLI_FRAPPE = 600;

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  placeholder,
  disabled = false,
  variant = 'field',
  id,
  'aria-describedby': decritPar,
  'aria-invalid': invalide,
  'aria-labelledby': libellePar,
}: SelectProps<T>) {
  const idAuto = useId();
  const idListe = `${idAuto}-liste`;
  const idOption = (i: number) => `${idAuto}-opt-${i}`;

  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const [pose, setPose] = useState<CSSProperties | null>(null);
  /* Second temps de l'ouverture. Le panneau naît décalé et transparent, puis
     bascule à sa place à l'image suivante : c'est ce qui donne la transition
     SANS image-clé — donc sans toucher `styles/motion.css`. Sous
     `prefers-reduced-motion`, `motion-reduce:transition-none` supprime le
     mouvement et le panneau apparaît directement en place. */
  const [entre, setEntre] = useState(false);

  const bouton = useRef<HTMLButtonElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const frappe = useRef({ tampon: '', a: 0 });

  const choisie = options.findIndex((o) => o.value === value);
  const courante = choisie >= 0 ? options[choisie] : undefined;

  /* --- ouverture / fermeture --------------------------------------------- */

  const ouvrir = useCallback(() => {
    if (disabled) return;
    setActif(choisie >= 0 ? choisie : 0);
    setOuvert(true);
  }, [disabled, choisie]);

  /** Ferme et REND LE FOCUS au bouton. Sans cela, `Échap` laisse le focus sur
   *  un panneau démonté : le clavier repart du début du document. */
  const fermer = useCallback((rendreLeFocus = true) => {
    setOuvert(false);
    if (rendreLeFocus) bouton.current?.focus();
  }, []);

  const valider = useCallback(
    (i: number) => {
      const o = options[i];
      if (!o || o.disabled) return;
      onChange(o.value);
      fermer();
    },
    [options, onChange, fermer],
  );

  /* --- placement ---------------------------------------------------------
     En `useLayoutEffect`, et APRÈS que le panneau soit dans le document.
     L'ordre compte : le retournement a besoin de la HAUTEUR RÉELLE du panneau,
     qu'on ne connaît qu'une fois les options rendues. Un panneau placé avant sa
     mesure calcule avec une hauteur de zéro — il tient donc toujours en bas, et
     ne se retourne jamais. D'où le rendu en deux temps : le panneau est monté
     masqué (`pose` nulle), mesuré, puis posé. */
  useLayoutEffect(() => {
    if (!ouvert) {
      setPose(null);
      setEntre(false);
      return;
    }

    const placer = () => {
      const b = bouton.current?.getBoundingClientRect();
      const hauteur = panneau.current?.offsetHeight ?? 0;
      if (!b) return;

      const { top } = placerPanneau({ haut: b.top, bas: b.bottom }, hauteur, window.innerHeight);
      setPose({ position: 'fixed', top, left: b.left, width: b.width, zIndex: 60 });
    };

    placer();
    const image = requestAnimationFrame(() => setEntre(true));

    /* Le menu SUIT son bouton : une page qui défile sous un panneau ancré en
       `fixed` le laisserait flotter au milieu de nulle part. */
    window.addEventListener('scroll', placer, true);
    window.addEventListener('resize', placer);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener('scroll', placer, true);
      window.removeEventListener('resize', placer);
    };
  }, [ouvert, options.length]);

  /* --- fermeture au clic extérieur ---------------------------------------
     `mousedown` et non `click` : un clic dont le bouton s'enfonce dehors doit
     fermer, même si l'utilisateur relâche ailleurs. */
  useEffect(() => {
    if (!ouvert) return;

    const dehors = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (bouton.current?.contains(cible) || panneau.current?.contains(cible)) return;
      setOuvert(false);
    };

    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, [ouvert]);

  /* --- défilement de l'option active -------------------------------------- */
  useEffect(() => {
    if (!ouvert) return;
    const liste = panneau.current;
    const el = liste?.querySelector<HTMLElement>(`[data-index="${actif}"]`);
    if (!liste || !el) return;

    liste.scrollTop = defilementVers(
      { haut: el.offsetTop, hauteur: el.offsetHeight },
      { scrollTop: liste.scrollTop, hauteur: liste.clientHeight },
    );
  }, [ouvert, actif]);

  /* --- clavier ------------------------------------------------------------ */

  const surTouche = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (disabled) return;

    if (!ouvert) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        ouvrir();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        fermer();
        return;
      case 'Tab':
        /* `Tab` VALIDE puis laisse partir le focus — c'est ce que fait un
           `<select>` natif, et ne pas le faire piégerait l'utilisateur. */
        valider(actif);
        setOuvert(false);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        valider(actif);
        return;
      case 'ArrowDown':
        e.preventDefault();
        setActif((i) => Math.min(options.length - 1, i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActif((i) => Math.max(0, i - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActif(0);
        return;
      case 'End':
        e.preventDefault();
        setActif(options.length - 1);
        return;
      default:
        break;
    }

    /* Frappe au vol : les caractères qui se suivent forment un mot, une pause
       le referme. Sans le tampon, taper « ar » chercherait « a » puis « r ». */
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = Date.now();
      const tampon = t - frappe.current.a > OUBLI_FRAPPE ? e.key : frappe.current.tampon + e.key;
      frappe.current = { tampon, a: t };

      const trouve = indexParFrappe(
        options.map((o) => o.label),
        tampon,
        /* Un tampon d'une seule lettre parcourt les homonymes ; un tampon plus
           long cherche depuis le début, sinon « ar » sauterait la bonne. */
        tampon.length === 1 ? actif : -1,
      );
      if (trouve >= 0) setActif(trouve);
    }
  };

  /* --- style -------------------------------------------------------------- */

  const plat = variant === 'inline';

  const styleBouton: CSSProperties = {
    height: 40,
    padding: plat ? '10px 6px' : '10px 12px',
    borderRadius: 11,
    background: plat ? 'transparent' : 'var(--panel2)',
    border: plat ? '1px solid transparent' : '1px solid var(--line)',
    color: 'var(--txt)',
    fontSize: 13,
    ...(ouvert
      ? { borderColor: 'var(--acc)', boxShadow: '0 0 0 3px rgba(var(--glow), .18)' }
      : null),
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <>
      <button
        ref={bouton}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-haspopup="listbox"
        aria-activedescendant={ouvert ? idOption(actif) : undefined}
        aria-label={libellePar ? undefined : label}
        aria-labelledby={libellePar}
        aria-describedby={decritPar}
        aria-invalid={invalide}
        disabled={disabled}
        data-open={ouvert ? '' : undefined}
        data-select-trigger
        onClick={() => (ouvert ? fermer(false) : ouvrir())}
        onKeyDown={surTouche}
        className="flex w-full items-center justify-between gap-2 outline-none select-none focus-visible:outline-[1.5px] focus-visible:outline-offset-[3px]"
        style={{ ...styleBouton, outlineColor: 'var(--acc2)' }}
      >
        <span className="truncate" style={{ color: courante ? 'var(--txt)' : 'var(--mut)' }}>
          {courante?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className="shrink-0"
          style={{
            color: 'var(--mut)',
            transform: ouvert ? 'rotate(180deg)' : 'none',
            transition: 'transform .18s ease',
          }}
        />
      </button>

      {ouvert
        ? createPortal(
            /* PORTAIL vers `document.body`, et z-index 60 — au-dessus des
               tiroirs, des boîtes et de la palette, qui sont tous à 50. Rendu
               sur place, le panneau serait coupé par le premier ancêtre en
               `overflow:hidden` : c'est le cas du tiroir d'édition. */
            <div
              ref={panneau}
              id={idListe}
              role="listbox"
              aria-label={label}
              data-select-panel
              className="rounded-field overflow-y-auto border p-[5px] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
              style={{
                position: 'fixed',
                zIndex: 60,
                /* POINTER-EVENTS EXPLICITE, et il n'est pas décoratif.
                   Radix pose `pointer-events: none` sur `<body>` tant qu'une
                   boîte MODALE est ouverte, et ne le rend qu'à son propre
                   contenu. Le panneau vit dans un portail vers `body`, donc
                   HORS de ce contenu : il héritait du blocage. Il s'affichait
                   au-dessus du tiroir — le z-index, lui, gagnait — mais chaque
                   clic le traversait pour atterrir sur le tiroir. Neuf des onze
                   appels du composant sont dans ce tiroir. */
                pointerEvents: 'auto',
                ...pose,
                /* Tant que la mesure n'a pas eu lieu, le panneau existe mais ne
                   se voit pas : il doit être dans le document pour qu'on
                   connaisse sa hauteur, et invisible pour qu'on ne le voie pas
                   sauter d'une place à l'autre. */
                ...(pose ? null : { top: 0, left: 0, visibility: 'hidden' as const }),
                opacity: entre ? 1 : 0,
                transform: entre ? 'none' : 'translateY(-4px)',
                maxHeight: HAUTEUR_MAX,
                background: 'var(--panel)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                borderColor: 'var(--line2)',
                boxShadow: '0 18px 44px -12px rgba(0,0,0,.66), 0 0 0 1px rgba(var(--glow), .10)',
              }}
            >
              {options.map((o, i) => {
                const selectionnee = o.value === value;
                const survolee = i === actif;
                return (
                  <div
                    key={o.value}
                    id={idOption(i)}
                    role="option"
                    data-index={i}
                    /* La VALEUR, adressable. Un `<option value>` natif l'offrait,
                       et la recette s'en servait (`selectOption('list')`). Sans
                       elle, viser une option demanderait de connaître son libellé
                       traduit — donc d'écrire un test qui casse à la première
                       reformulation. */
                    data-value={o.value}
                    aria-selected={selectionnee}
                    aria-disabled={o.disabled || undefined}
                    onMouseEnter={() => !o.disabled && setActif(i)}
                    onClick={() => valider(i)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-[7px] px-[11px] py-[9px] text-[13px]"
                    style={{
                      color: survolee || selectionnee ? 'var(--txt)' : 'var(--txt2)',
                      fontWeight: selectionnee ? 500 : 400,
                      background: selectionnee
                        ? 'rgba(var(--glow), .24)'
                        : survolee
                          ? 'rgba(var(--glow), .16)'
                          : 'transparent',
                      ...(o.disabled ? { opacity: 0.45, pointerEvents: 'none' } : null),
                    }}
                  >
                    <span className="truncate">{o.label}</span>

                    <span className="flex shrink-0 items-center gap-2">
                      {o.hint ? (
                        <span className="font-mono text-[11px]" style={{ color: 'var(--mut)' }}>
                          {o.hint}
                        </span>
                      ) : null}
                      {selectionnee ? (
                        <Check size={14} aria-hidden="true" style={{ color: 'var(--acc2)' }} />
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
