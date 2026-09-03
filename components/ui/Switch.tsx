'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';

/* Interrupteur — `role="switch"` fourni par Radix, donc annoncé « activé /
   désactivé » et pilotable à la barre d'espace sans code de notre part.

   `reason` n'est pas décoratif : la phase 5 exige qu'aucun interrupteur ne
   soit mort. Un interrupteur désactivé DOIT dire pourquoi (tâche 5.4) — et le
   dire AUX LECTEURS D'ÉCRAN autant qu'à l'œil, d'où `aria-describedby`. Une
   justification qu'on ne peut que voir ne justifie rien pour qui n'y voit pas.

   `reason` s'affiche aussi sur un interrupteur ACTIF : c'est là que se disent
   les limites d'un réglage qui fonctionne — « seulement quand Habitum est
   ouvert » n'est pas une excuse, c'est le contrat. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  reason,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  reason?: string;
}) {
  const idRaison = useId();

  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px]" style={{ color: 'var(--txt)' }}>
          {label}
        </span>
        {reason ? (
          <span id={idRaison} data-reason className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {reason}
          </span>
        ) : null}
      </span>

      {/* La CIBLE fait 44 px, le RAIL en fait 22 — tâche 8.3.

          Le rail dessiné mesurait 38 × 22 et servait aussi de zone cliquable :
          22 px de haut, sous les 24 px que WCAG 2.2 § 2.5.8 exige au niveau AA,
          et très loin des 44 px que recommandent Apple et Android. Un
          interrupteur qu'on rate au doigt se rattrape en le rouvrant — ou en
          basculant celui d'à côté.

          La cible est donc portée par la racine, transparente et carrée ; le
          rail visible est un élément INTÉRIEUR. Le dessin ne change pas d'un
          pixel, seule la surface atteignable grandit. C'est aussi pour cela que
          la marge verticale de la ligne (`py-1.5`) n'a pas bougé : la hauteur
          gagnée est déjà celle du rembourrage. */}
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={reason ? idRaison : undefined}
        data-switch-rail
        className="grid shrink-0 place-items-center"
        style={{
          width: 44,
          height: 44,
          /* La marge négative rend au dessin la place que la cible prend en
             plus : le rail reste exactement où il était, au pixel près. Les
             3 px qui débordent horizontalement tombent dans le rembourrage du
             panneau (14 px) — les cinq paliers le vérifient.

             `data-switch-rail` est posé ICI, sur le rail (`RadixSwitch.Root`)
             lui-même, et non sur le `<label>` comme avant : c'est ce
             déplacement qui permet à `debordements.spec.ts` de retrouver, à
             coup sûr et sans en prendre d'autres, les deux seuls éléments que
             ce débordement atteint réellement — le `<label>` (parent DIRECT
             du rail) et le conteneur de ce `<label>` (son propre parent
             DIRECT, une `<div>` de `ProfileView`). Le rail porte l'attribut
             mais ne déborde jamais lui-même : sa largeur est fixée à 44 px et
             rien à l'intérieur ne la dépasse. L'exclusion ne remonte donc que
             de deux niveaux ancêtres au-dessus du rail, jamais plus haut et
             jamais par le contenu (`querySelector` sur tout un sous-arbre) —
             elle ne couvre ni le texte du libellé, ni `span[data-reason]`
             (une case de plus bas dans le même `<label>`), ni quoi que ce
             soit hors de ces deux ancêtres précis. Un vrai texte coupé, y
             compris sur `reason`, reste mesuré normalement partout ailleurs. */
          margin: '-11px -3px',
          background: 'transparent',
          border: 0,
          padding: 0,
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          className="rounded-pill relative block border"
          style={{
            width: 38,
            height: 22,
            borderColor: checked ? 'var(--acc2)' : 'var(--line)',
            background: checked ? 'var(--acc2)' : 'transparent',
            transition: 'background .18s ease, border-color .18s ease',
          }}
        >
          <RadixSwitch.Thumb
            className="rounded-pill block"
            style={{
              width: 16,
              height: 16,
              background: checked ? 'var(--bg)' : 'var(--mut)',
              transform: `translateX(${checked ? 18 : 2}px)`,
              transition: 'transform .18s ease, background .18s ease',
            }}
          />
        </span>
      </RadixSwitch.Root>
    </label>
  );
}
