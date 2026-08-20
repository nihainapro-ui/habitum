'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { champStyle, Field } from '@/components/ui';

/* `?: T | undefined` plutôt que `?: T` — `exactOptionalPropertyTypes` (D23).
 *
 * Sous ce drapeau, `error?: string` signifie « absente, ou une chaîne », et
 * `error={undefined}` devient une erreur. La distinction est utile là où les
 * deux cas diffèrent — chez Radix, `open={undefined}` bascule un composant en
 * mode non contrôlé, et `components/ui/Dialog.tsx` la respecte par un spread
 * conditionnel.
 *
 * Ici, elle n'existe pas : un champ sans erreur et un champ dont l'erreur vaut
 * `undefined` s'affichent exactement pareil. Déclarer `| undefined` dit donc la
 * vérité sur ces composants, et évite de tordre vingt appels
 * `error={x ? … : undefined}` — qui est la forme naturelle quand on lit un
 * `FieldError` de react-hook-form. */

/* Contrôles de saisie de l'éditeur.

   Aucun n'est « intelligent » : ils affichent une valeur et rendent la
   suivante. La validation vit dans `lib/validation`, l'enregistrement dans le
   store. Un champ qui déciderait de ce qui est valide en aurait deux versions. */

const ENTREE = 'rounded-field w-full border outline-none';

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  type?: 'text' | 'date' | 'time' | 'number';
  placeholder?: string | undefined;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(props) => (
        <input
          {...props}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={ENTREE}
          style={champStyle}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
}) {
  return (
    <Field label={label}>
      {(props) => (
        <textarea
          {...props}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${ENTREE} min-h-[88px] resize-y`}
          style={champStyle}
        />
      )}
    </Field>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  error?: string | undefined;
}) {
  return (
    <Field label={label} error={error}>
      {(props) => (
        <select
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={ENTREE}
          style={champStyle}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Sélecteur de jours de semaine. Sept cases à cocher, pas sept boutons :
 *  l'état « ce jour est retenu » doit être annoncé, pas déduit d'une couleur. */
export function DayPicker({
  label,
  value,
  names,
  onChange,
  error,
}: {
  label: string;
  value: number[];
  names: string[];
  onChange: (v: number[]) => void;
  error?: string | undefined;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 p-0 text-[12px]" style={{ color: 'var(--txt2)' }}>
        {label}
      </legend>
      <div className="flex gap-1.5">
        {names.map((nom, i) => {
          const actif = value.includes(i);
          return (
            <button
              key={nom}
              type="button"
              role="checkbox"
              aria-checked={actif}
              aria-label={nom}
              onClick={() =>
                onChange(actif ? value.filter((d) => d !== i) : [...value, i].sort((a, b) => a - b))
              }
              className="rounded-btn flex-1 cursor-pointer border py-2 text-[11.5px]"
              style={{
                borderColor: actif ? 'var(--acc2)' : 'var(--line)',
                background: actif ? 'var(--panel2)' : 'transparent',
                color: actif ? 'var(--txt)' : 'var(--txt2)',
              }}
            >
              {nom}
            </button>
          );
        })}
      </div>
      {error ? (
        <span className="text-[11px]" style={{ color: 'var(--bad)' }}>
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

/** Liste de lignes ajoutables / supprimables — rappels, sous-éléments,
 *  sous-tâches. Une seule implémentation pour les trois. */
export function LigneListe({
  legend,
  items,
  addLabel,
  onAdd,
  onRemove,
  error,
  children,
}: {
  legend: string;
  items: readonly unknown[];
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string | undefined;
  children: (index: number) => ReactNode;
}) {
  const t = useTranslations('app');

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-[12px]" style={{ color: 'var(--txt2)' }}>
        {legend}
      </legend>

      {items.map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{children(i)}</div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`${t('delete')} ${i + 1}`}
            className="rounded-btn-sm grid h-8 w-8 flex-none cursor-pointer place-items-center border"
            style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="rounded-btn flex cursor-pointer items-center gap-2 self-start border px-3 py-1.5 text-[12px]"
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
      >
        <Plus size={12} aria-hidden="true" />
        {addLabel}
      </button>

      {error ? (
        <span className="text-[11px]" style={{ color: 'var(--bad)' }}>
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
