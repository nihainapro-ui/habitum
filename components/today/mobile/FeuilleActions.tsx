'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FeuilleBasse, FeuilleConfirmation } from '@/components/ui';

/* Feuille d'actions d'une ligne — refonte mobile.

   Sur bureau, la ligne porte un menu « ⋮ » (`ActionDrawer.tsx`) : Réussi ·
   Modifier · Passer · Reporter · Note · Supprimer. Sur téléphone, la maquette
   (PDF p. 5) ne laisse à droite de la ligne que l'action principale — pas à
   pas ou lancement de Focus — et fait de l'appui sur la ligne le chemin vers
   l'éditeur. Or « Passer », « Reporter », « Note » et « Saisir la valeur »
   n'ont pas d'autre porte, et retirer une fonctionnalité est interdit (§ 7).

   Cette feuille est le compromis : l'appui sur le NOM ouvre une feuille basse
   dont « Modifier » est la première ligne — l'éditeur reste à un appui de plus
   — et qui porte tout le reste, en cibles de 52 px, atteignables au clavier
   comme au doigt. Les glissements (Focus, Reporter) ne sont que des
   raccourcis vers ce qui est ici.

   La suppression demande CONFIRMATION (PDF p. 2 : « toute action destructive
   → confirmation »), avec une conséquence chiffrée pour une habitude ; puis
   le toast « Annuler » de `withUndo` reste — deux protections, l'une
   n'expire pas, l'autre dure six secondes. */

export interface ActionsLigne {
  onEdit: () => void;
  onComplete: () => void;
  /** Habitudes à compteur : saisie directe de la valeur du jour. */
  onSetValue?: ((valeur: number) => void) | undefined;
  onFocus?: (() => void) | undefined;
  onSkip?: (() => void) | undefined;
  onSnooze?: (() => void) | undefined;
  onDelete: () => void;
  note: string;
  onNote: (valeur: string) => void;
}

export function FeuilleActions({
  open,
  onOpenChange,
  name,
  done,
  value,
  deleteQuestion,
  deleteConsequence,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  done: boolean;
  /** Valeur du jour, pour pré-remplir la saisie directe. */
  value?: number | undefined;
  deleteQuestion: string;
  deleteConsequence: string;
  actions: ActionsLigne;
}) {
  const t = useTranslations('app');
  const [panneau, setPanneau] = useState<'liste' | 'valeur' | 'note'>('liste');
  const [confirmer, setConfirmer] = useState(false);
  const [brouillonNote, setBrouillonNote] = useState(actions.note);
  const [brouillonValeur, setBrouillonValeur] = useState(String(value ?? 0));

  const fermer = () => {
    onOpenChange(false);
    setPanneau('liste');
  };
  const faire = (action: () => void) => {
    fermer();
    action();
  };

  const ligne =
    'rounded-field flex min-h-[52px] w-full cursor-pointer items-center border px-4 text-left text-[14px]';
  const style = { borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt)' };

  const Bouton = ({
    onClick,
    children,
    tone,
  }: {
    onClick: () => void;
    children: ReactNode;
    tone?: 'bad';
  }) => (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={ligne}
        style={tone === 'bad' ? { ...style, color: 'var(--bad)' } : style}
      >
        {children}
      </button>
    </li>
  );

  return (
    <>
      <FeuilleBasse
        open={open && !confirmer}
        onOpenChange={(v) => {
          if (!v) fermer();
        }}
        title={name}
        description={t('moreA')}
        testId="feuille-actions"
      >
        {panneau === 'liste' ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            <Bouton onClick={() => faire(actions.onEdit)}>{t('edit')}</Bouton>
            <Bouton onClick={() => faire(actions.onComplete)}>
              {done ? t('mobMarkUndone') : t('markDone')}
            </Bouton>
            {actions.onSetValue ? (
              <Bouton
                onClick={() => {
                  setBrouillonValeur(String(value ?? 0));
                  setPanneau('valeur');
                }}
              >
                {t('mobSetValue')}
              </Bouton>
            ) : null}
            {actions.onFocus ? (
              <Bouton onClick={() => faire(actions.onFocus!)}>{t('mobFocusAction')}</Bouton>
            ) : null}
            {actions.onSkip ? (
              <Bouton onClick={() => faire(actions.onSkip!)}>{t('skip')}</Bouton>
            ) : null}
            {actions.onSnooze ? (
              <Bouton onClick={() => faire(actions.onSnooze!)}>{t('reschedule')}</Bouton>
            ) : null}
            <Bouton
              onClick={() => {
                setBrouillonNote(actions.note);
                setPanneau('note');
              }}
            >
              {t('addNote')}
            </Bouton>
            <Bouton tone="bad" onClick={() => setConfirmer(true)}>
              {t('delete')}
            </Bouton>
          </ul>
        ) : null}

        {panneau === 'valeur' ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(brouillonValeur);
              if (Number.isFinite(n) && n >= 0) faire(() => actions.onSetValue?.(Math.round(n)));
            }}
          >
            <label className="flex flex-col gap-1.5 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
              {t('mobValueOf')}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={brouillonValeur}
                onChange={(e) => setBrouillonValeur(e.target.value)}
                className="rounded-field min-h-[48px] w-full border px-3 font-mono text-[16px] outline-none"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--txt)' }}
              />
            </label>
            <button
              type="submit"
              className="rounded-pill min-h-[48px] cursor-pointer border-0 px-4 text-[14px] font-semibold"
              style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
            >
              {t('mobValueOk')}
            </button>
          </form>
        ) : null}

        {panneau === 'note' ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={brouillonNote}
              onChange={(e) => setBrouillonNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              aria-label={t('addNote')}
              className="rounded-field min-h-[120px] w-full resize-y border p-3 text-[14px] outline-none"
              style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--txt)' }}
            />
            <button
              type="button"
              onClick={() => faire(() => actions.onNote(brouillonNote))}
              className="rounded-pill min-h-[48px] cursor-pointer border-0 px-4 text-[14px] font-semibold"
              style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
            >
              {t('save')}
            </button>
          </div>
        ) : null}
      </FeuilleBasse>

      <FeuilleConfirmation
        open={confirmer}
        onOpenChange={(v) => {
          setConfirmer(v);
          if (!v) fermer();
        }}
        question={deleteQuestion}
        consequence={deleteConsequence}
        actionLabel={t('delete')}
        keepLabel={t('keep')}
        onConfirm={() => {
          setConfirmer(false);
          faire(actions.onDelete);
        }}
      />
    </>
  );
}
