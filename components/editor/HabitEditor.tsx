'use client';

import { useMemo, useState, type RefObject } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import {
  addDays,
  CATEGORIES,
  HABIT_GOAL_KINDS,
  nbJoursJournalises,
  resumeJours,
  startOfWeek,
  today,
  type Habit,
  type HabitGoalKind,
  epurerRappel,
  rappelsHabitude,
} from '@/lib/domain';
import { habitFormSchema, type HabitForm } from '@/lib/validation/habit.schema';
import { useStore } from '@/lib/store';
import { FeuilleConfirmation } from '@/components/ui';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { DayPicker, LigneListe, Select, TextArea, TextInput } from './fields';
import { RappelChamps } from './RappelChamps';
import { EditorTabs } from './EditorTabs';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur d'habitude — quatre onglets sur bureau (05-SPEC-VUES.md § 5), un
   seul écran progressif sur téléphone (refonte mobile, PDF p. 7).

   Le brouillon est ISOLÉ : `react-hook-form` tient son propre état, et rien
   n'est écrit tant que « Enregistrer » n'a pas été pressé. Sur bureau, fermer
   la feuille jette le brouillon — c'est ce qu'attend quiconque a déjà appuyé
   sur Échap. Sur téléphone, fermer avec des modifications demande d'abord
   « Abandonner ? » (p. 7) : le pouce ferme plus facilement qu'une touche.

   Les CHAMPS sont les mêmes dans les deux formes — un seul `useForm`, un seul
   schéma, un seul enregistrement. Seule la mise en page change : les
   fragments `definition`, `planning`, `rappels`, `avance` sont assemblés en
   onglets ou en colonne. Deux formulaires auraient divergé au premier champ.

   G8 — les sept types viennent de `HABIT_GOAL_KINDS`, jamais d'une liste
   recopiée : un `<select>` qui n'en proposerait que quatre reproduirait à
   l'interface le défaut qui a fait disparaître des habitudes à l'import. */

/** Libellés des sept types, dans l'espace `editor`. */
const CLES_TYPE: Record<HabitGoalKind, string> = {
  check: 'gCheck',
  count: 'gCount',
  time: 'gTime',
  total: 'gCount',
  list: 'gList',
  limit: 'gLimit',
  exact: 'gCount',
};

/** Les types dont la cible et l'unité ont un sens. */
const AVEC_CIBLE = new Set<HabitGoalKind>(['count', 'time', 'total', 'limit', 'exact']);

/** Clé de la phrase sous les sept cases, par forme de sélection. */
const CLES_JOURS = {
  none: 'mobDaysNone',
  all: 'mobDaysAll',
  weekdays: 'mobDaysWeekdays',
  weekend: 'mobDaysWeekend',
  custom: 'mobDaysCustom',
} as const;

const versFormulaire = (h?: Habit): HabitForm => ({
  name: h?.name ?? '',
  category: h?.category ?? 'health',
  goalKind: h?.goal.kind ?? 'check',
  target: h?.goal.target ?? 1,
  step: h?.goal.step ?? 1,
  unit: h?.goal.unit ?? '',
  subItems: h?.subItems ?? [],
  mode: h?.mode ?? 'dow',
  days: h?.days ?? [0, 1, 2, 3, 4, 5, 6],
  interval: h?.interval ?? 2,
  start: h?.start ?? '',
  end: h?.end ?? '',
  reminders: h ? rappelsHabitude(h) : [],
  /* `notify` absent vaut OUI : une habitude non réglée suit sa source. */
  notify: h?.notify !== false,
  note: h?.note ?? '',
  archived: h?.archived ?? false,
});

/** Garde de fermeture : rend `true` si la feuille peut se fermer tout de
 *  suite, `false` si l'éditeur a pris la main (confirmation en cours). */
export type GardeFermeture = RefObject<(() => boolean) | null>;

export function HabitEditor({
  id,
  onClose,
  mobile = false,
  garde,
}: {
  id: string | null;
  onClose: () => void;
  /** Forme de la refonte mobile (PDF p. 7). Décidée par l'hôte, qui est monté
   *  depuis le chargement : décidée ici, elle arriverait après un premier
   *  rendu en onglets. */
  mobile?: boolean;
  garde?: GardeFermeture | undefined;
}) {
  const t = useTranslations('editor');
  const ta = useTranslations('app');
  const tc = useTranslations('cat');
  const { locale } = useLocaleSwitcher();

  const habit = useStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const joursHistorique = useStore((s) => (id ? nbJoursJournalises(s.logIndex, id) : 0));
  const createHabit = useStore((s) => s.createHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const flashToast = useStore((s) => s.flashToast);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<HabitForm>({
    resolver: zodResolver(habitFormSchema) as Resolver<HabitForm>,
    defaultValues: versFormulaire(habit),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as HabitForm;

  /* Brouillon modifié ? Comparé aux valeurs initiales plutôt que lu dans
     `formState.isDirty` : les champs écrivent par `setValue` sans
     `shouldDirty`, et ce drapeau resterait faux. */
  const initial = useMemo(() => JSON.stringify(versFormulaire(habit)), [habit]);
  const modifie = JSON.stringify(v) !== initial;

  const [abandon, setAbandon] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [avanceOuvert, setAvanceOuvert] = useState(false);

  /* La garde est (ré)installée à chaque rendu : elle lit `modifie`, qui
     change. Sur bureau elle laisse toujours fermer — comportement d'origine. */
  if (garde) {
    garde.current = () => {
      if (!mobile || !modifie) return true;
      setAbandon(true);
      return false;
    };
  }

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const lundi = startOfWeek(today(), 'mon');
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(lundi, i)));
  }, [locale]);

  const enregistrer = handleSubmit(async (valeurs) => {
    const entree = {
      name: valeurs.name,
      category: valeurs.category,
      goal: {
        kind: valeurs.goalKind,
        target: valeurs.target,
        step: valeurs.step,
        unit: valeurs.unit,
      },
      mode: valeurs.mode,
      days: valeurs.days,
      interval: valeurs.interval,
      subItems: valeurs.subItems,
      reminders: valeurs.reminders.map(epurerRappel),
      ...(valeurs.notify ? {} : { notify: false }),
      /* Omis, jamais posés à `undefined` — D23. L'objet part en base : dans
         IndexedDB, une clé absente et une clé qui vaut `undefined` ne se
         lisent pas pareil, et le modèle vise la synchronisation, où l'écart
         entre « jamais renseigné » et « effacé » décide de la fusion. */
      ...(valeurs.start ? { start: valeurs.start } : {}),
      ...(valeurs.end ? { end: valeurs.end } : {}),
      note: valeurs.note,
      archived: valeurs.archived,
    };

    if (habit) await updateHabit(habit.id, entree);
    else await createHabit(entree);
    /* Succès (PDF p. 7) : retour à la liste, toast « Habitude enregistrée ».
       Téléphone seulement — le bureau ne pose pas de toast à l'enregistrement,
       et son rendu est celui du socle visuel. */
    if (mobile) flashToast('app.hSaved', valeurs.name);
    onClose();
  });

  /* Le message d'erreur d'un schéma zod est une CLÉ, pas une phrase : une
     phrase écrite dans le schéma resterait française dans les deux langues. */
  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  /* --- Les fragments, communs aux deux formes ------------------------- */

  const champNom = (
    <TextInput
      label={t('fName')}
      value={v.name}
      onChange={(x) => setValue('name', x)}
      error={errors.name ? messageErreur(errors.name.message) : undefined}
    />
  );

  const champCategorie = (
    <Select
      label={t('fCat')}
      value={v.category}
      onChange={(x) => setValue('category', x)}
      options={CATEGORIES.map((c) => ({ value: c, label: tc(c) }))}
    />
  );

  const champType = (
    <Select
      label={t('fGoal')}
      value={v.goalKind}
      onChange={(x) => setValue('goalKind', x)}
      options={HABIT_GOAL_KINDS.map((k) => ({ value: k, label: t(CLES_TYPE[k]) }))}
    />
  );

  const champsCible = AVEC_CIBLE.has(v.goalKind) ? (
    <div className="flex gap-3">
      <div className="flex-1">
        <TextInput
          label={t('fTarget')}
          type="number"
          value={String(v.target)}
          onChange={(x) => setValue('target', Number(x) || 0)}
          error={errors.target ? messageErreur(errors.target.message) : undefined}
        />
      </div>
      <div className="flex-1">
        <TextInput label={t('fUnit')} value={v.unit} onChange={(x) => setValue('unit', x)} />
      </div>
    </div>
  ) : null;

  const champsSousElements =
    v.goalKind === 'list' ? (
      <LigneListe
        legend={t('fSub')}
        items={v.subItems}
        addLabel={t('addSub')}
        onAdd={() => setValue('subItems', [...v.subItems, { label: '' }])}
        onRemove={(i) =>
          setValue(
            'subItems',
            v.subItems.filter((_, j) => j !== i),
          )
        }
        error={errors.subItems ? messageErreur('subItemsRequired') : undefined}
      >
        {(i) => (
          <TextInput
            label={`${t('fSub')} ${i + 1}`}
            value={v.subItems[i]?.label ?? ''}
            onChange={(x) =>
              setValue(
                'subItems',
                v.subItems.map((s, j) => (j === i ? { label: x } : s)),
              )
            }
          />
        )}
      </LigneListe>
    ) : null;

  const champMode = (
    <Select
      label={t('fRep')}
      value={v.mode}
      onChange={(x) => setValue('mode', x)}
      options={[
        { value: 'dow' as const, label: t('mDow') },
        { value: 'every' as const, label: t('mEvery') },
        { value: 'week' as const, label: t('mWeek') },
        { value: 'month' as const, label: t('repMonth') },
      ]}
    />
  );

  const champIntervalle =
    v.mode === 'every' ? (
      <TextInput
        label={t('fEvery')}
        type="number"
        value={String(v.interval)}
        onChange={(x) => setValue('interval', Number(x) || 1)}
      />
    ) : null;

  const champsDates = (
    <div className="flex gap-3">
      <div className="flex-1">
        <TextInput
          label={t('fStart')}
          type="date"
          value={v.start}
          onChange={(x) => setValue('start', x)}
        />
      </div>
      <div className="flex-1">
        <TextInput
          label={t('fEnd')}
          type="date"
          value={v.end}
          onChange={(x) => setValue('end', x)}
          error={errors.end ? messageErreur(errors.end.message) : undefined}
        />
      </div>
    </div>
  );

  /* Rappels. Le même composant que les trois autres éditeurs : un rappel
     d'habitude se règle comme un rappel de tâche — heure, type, calendrier —
     et l'habitude n'a pas de règle générale de repli, d'où l'absence de ligne
     d'aide. « Jours avant » n'a pas de sens ici : une habitude n'a pas
     d'échéance, elle revient. */
  const rappels = (
    <RappelChamps
      notify={v.notify}
      rappels={v.reminders}
      onNotify={(x) => setValue('notify', x)}
      onRappels={(x) => setValue('reminders', x)}
      calendriers={['days']}
    />
  );

  const champsNoteArchive = (
    <>
      <TextArea
        label={t('fNote')}
        value={v.note}
        onChange={(x) => setValue('note', x)}
        placeholder={t('noteHint')}
      />
      <label className="flex items-center gap-2.5 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
        <input
          type="checkbox"
          checked={v.archived}
          onChange={(e) => setValue('archived', e.target.checked)}
        />
        {t('arch')}
      </label>
      <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
        {t('archNote')}
      </span>
    </>
  );

  /* --- Forme MOBILE : un écran progressif (PDF p. 7) ------------------- */

  if (mobile) {
    const titre = habit ? t('editH') : t('newH');
    const jours = resumeJours(v.days);
    const phraseJours = t(CLES_JOURS[jours.forme], { n: jours.n });
    const basculerJour = (i: number) =>
      setValue(
        'days',
        v.days.includes(i) ? v.days.filter((d) => d !== i) : [...v.days, i].sort((a, b) => a - b),
      );
    const nomVide = v.name.trim().length === 0;
    const modeLabel = { dow: 'mDow', every: 'mEvery', week: 'mWeek', month: 'repMonth' } as const;

    return (
      <form
        data-testid="editeur-habitude-mobile"
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="flex min-h-full flex-col"
      >
        {/* Zone sûre + Annuler / Titre / Enregistrer (PDF p. 7 : « Observé —
            titre collé à la barre système »). Le titre est centré et tronqué ;
            les deux commandes ont 44 px de haut. */}
        <header
          className="sticky top-0 z-10 flex items-center gap-2 border-b px-2"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--bg2)',
            paddingTop: 'calc(6px + env(safe-area-inset-top))',
            paddingBottom: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => (modifie ? setAbandon(true) : onClose())}
            className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-2 text-[15px]"
            style={{ color: 'var(--txt2)' }}
          >
            {t('cancel')}
          </button>
          <h2 className="m-0 min-w-0 flex-1 truncate text-center text-[17px] font-semibold">
            {titre}
          </h2>
          <button
            type="submit"
            disabled={nomVide}
            className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-2 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            style={{ color: 'var(--acc2)' }}
          >
            {t('save')}
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 px-4 py-4">
          {champNom}

          <div className="grid grid-cols-2 gap-3">
            {champCategorie}
            {champType}
          </div>
          {champsCible}
          {champsSousElements}

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-[12px]" style={{ color: 'var(--txt2)' }}>
              {t('fDays')}
            </legend>
            {v.mode === 'dow' ? (
              <>
                <div className="grid grid-cols-7 gap-1.5" data-testid="jours-44">
                  {nomsJours.map((nom, i) => {
                    const actif = v.days.includes(i);
                    return (
                      <button
                        key={nom}
                        type="button"
                        role="checkbox"
                        aria-checked={actif}
                        aria-label={nom}
                        onClick={() => basculerJour(i)}
                        className="rounded-pill grid aspect-square min-h-[44px] w-full cursor-pointer place-items-center border text-[14px] font-semibold"
                        style={{
                          borderColor: actif ? 'var(--acc2)' : 'var(--line)',
                          background: actif ? 'var(--acc2)' : 'transparent',
                          color: actif ? 'var(--bg)' : 'var(--txt2)',
                        }}
                      >
                        {nom.charAt(0).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                <span
                  data-testid="phrase-jours"
                  className="text-[12px]"
                  style={{ color: errors.days ? 'var(--bad)' : 'var(--mut)' }}
                >
                  {errors.days ? messageErreur('daysRequired') : phraseJours}
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAvanceOuvert(true)}
                aria-expanded={avanceOuvert}
                className="rounded-field flex min-h-[44px] cursor-pointer items-center justify-between border px-3 text-left text-[13px]"
                style={{ borderColor: 'var(--line)', color: 'var(--txt)' }}
              >
                {v.mode === 'every' ? ta('freqEvery', { n: v.interval }) : t(modeLabel[v.mode])}
                <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--mut)' }} />
              </button>
            )}
          </fieldset>

          {/* Pas de conteneur autour des rappels : la cible tactile de
              l'interrupteur dépasse son rail de 3 px (documenté dans
              `Switch.tsx`), et tout conteneur sans garniture entre lui et la
              colonne rembourrée le mesurerait en débordement. */}
          <span className="-mb-3 text-[12px]" style={{ color: 'var(--txt2)' }}>
            {t('fRem')}
          </span>
          {rappels}

          {/* Réglages avancés, repliés : répétition, dates, note, archivage.
              Ce que l'on règle une fois, pas ce que l'on corrige chaque
              semaine. */}
          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAvanceOuvert((x) => !x)}
              aria-expanded={avanceOuvert}
              className="rounded-field flex min-h-[52px] cursor-pointer items-center justify-between gap-3 border px-3 text-left"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[13.5px] font-semibold" style={{ color: 'var(--txt)' }}>
                  {t('mobAdvanced')}
                </span>
                {/* `--txt2` et non `--mut` : sur `--panel2`, `--mut` tombe à 4,38
                    — sous AA pour du texte de 11,5 px (mesuré par axe). */}
                <span className="text-[11.5px]" style={{ color: 'var(--txt2)' }}>
                  {t('mobAdvancedHint')}
                </span>
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                style={{
                  color: 'var(--mut)',
                  transform: avanceOuvert ? 'rotate(180deg)' : 'none',
                  transition: 'transform .2s',
                }}
              />
            </button>
            {avanceOuvert ? (
              <div className="flex flex-col gap-4" data-testid="reglages-avances">
                {champMode}
                {champIntervalle}
                {champsDates}
                {champsNoteArchive}
              </div>
            ) : null}
          </section>

          {habit ? (
            <button
              type="button"
              onClick={() => setSuppression(true)}
              className="mt-2 min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 text-[13.5px]"
              style={{ color: 'var(--bad)' }}
            >
              {t('mobDelHabit')}
            </button>
          ) : null}
        </div>

        {/* Bouton principal ancré : en aplat turquoise, jamais en dégradé
            (PDF p. 7 et 17). `sticky bottom-0` dans la feuille qui défile,
            au-dessus du clavier quand il s'ouvre. */}
        <div
          className="sticky bottom-0 border-t px-4 pt-3"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--bg2)',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="submit"
            disabled={nomVide}
            className="rounded-pill min-h-[52px] w-full cursor-pointer border-0 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
          >
            {t('save')}
          </button>
        </div>

        <FeuilleConfirmation
          open={abandon}
          onOpenChange={setAbandon}
          question={t('mobAbandonAsk')}
          consequence={t('mobAbandonD')}
          actionLabel={t('mobAbandonYes')}
          keepLabel={t('mobAbandonNo')}
          destructive={false}
          onConfirm={() => {
            setAbandon(false);
            onClose();
          }}
        />

        {habit ? (
          <FeuilleConfirmation
            open={suppression}
            onOpenChange={setSuppression}
            question={t('mobDelAsk', { name: habit.name, n: joursHistorique })}
            consequence={t('mobDelD')}
            actionLabel={t('mobDelYes')}
            keepLabel={ta('keep')}
            onConfirm={() => {
              setSuppression(false);
              void deleteHabit(habit.id);
              onClose();
            }}
          />
        ) : null}
      </form>
    );
  }

  /* --- Forme BUREAU : quatre onglets, inchangée --------------------------- */

  const definition = (
    <>
      {champNom}
      {champCategorie}
      {champType}
      {champsCible}
      {champsSousElements}
    </>
  );

  const planning = (
    <>
      {champMode}

      {v.mode === 'dow' ? (
        <DayPicker
          label={t('fDays')}
          value={v.days}
          names={nomsJours}
          onChange={(x) => setValue('days', x)}
          error={errors.days ? messageErreur('daysRequired') : undefined}
        />
      ) : null}

      {champIntervalle}
      {champsDates}
    </>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
      className="flex flex-col gap-4"
    >
      <EditorTabs
        label={ta('mainNav')}
        onglets={[
          { value: 'def', label: t('tabDef'), content: definition },
          { value: 'plan', label: t('tabPlan'), content: planning },
          { value: 'rem', label: t('tabRem'), content: rappels },
          { value: 'adv', label: t('tabAdv'), content: champsNoteArchive },
        ]}
      />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          habit
            ? () => {
                void deleteHabit(habit.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
