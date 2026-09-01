'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { Field, champStyle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { formaterCode, genererCode, LONGUEUR_CODE } from '@/lib/sync';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Appairage de deux appareils — la seule interface de toute la synchronisation.

   CE QU'ELLE REFUSE DE FAIRE, et pourquoi c'est le sujet.

   **Pas de compte, pas de mot de passe, pas d'adresse électronique.** Un code
   de vingt caractères dérive à la fois l'identifiant d'espace et la clé de
   chiffrement (`lib/sync/crypto.ts`). Le serveur ne voit jamais que du
   chiffré, et n'a rien à savoir de qui le lui envoie.

   **Elle ne promet pas une sauvegarde.** Synchroniser deux appareils n'est pas
   sauvegarder : effacer une habitude l'efface PARTOUT, c'est le but. Le rappel
   d'export reste donc entier, et le dit ici même — sans quoi l'utilisateur
   croirait ses données à l'abri parce qu'elles sont à deux endroits.

   **Elle avertit avant de montrer le code.** Il est affiché masqué : c'est le
   seul secret, il ouvre toutes les données, et une capture d'écran de réglages
   circule plus facilement qu'un mot de passe.

   **Le code perdu n'est pas récupérable.** Ni par nous, ni par personne — la
   clé ne quitte pas l'appareil. C'est écrit avant l'appairage, pas après. */

const bouton = 'rounded-btn flex cursor-pointer items-center gap-2 border px-4 py-2 text-[12.5px]';

export function SyncSection() {
  const t = useTranslations('sync');
  const { locale } = useLocaleSwitcher();

  const sync = useStore((s) => s.sync);
  const activerSync = useStore((s) => s.activerSync);
  const desactiverSync = useStore((s) => s.desactiverSync);
  const synchroniserMaintenant = useStore((s) => s.synchroniserMaintenant);

  const [saisi, setSaisi] = useState('');
  const [refus, setRefus] = useState(false);
  const [revele, setRevele] = useState(false);
  const [copie, setCopie] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [effacerRelais, setEffacerRelais] = useState(false);

  /* Le dépôt n'a pas de serveur configuré (`NEXT_PUBLIC_SYNC_URL`) : la section
     n'existe pas. Montrer un appairage qui ne peut aboutir serait le mensonge
     d'interface que `SettingsView` refuse déjà pour les rappels. */
  if (!sync.disponible) return null;

  const appairer = async (code: string) => {
    setRefus(!(await activerSync(code)));
  };

  const copier = async () => {
    if (!sync.code) return;
    try {
      await navigator.clipboard.writeText(sync.code);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      /* Presse-papiers refusé (contexte non sécurisé, permission) : le code
         reste lisible et sélectionnable à l'écran. Rien à signaler. */
    }
  };

  /* Composés hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const codeAffiche = sync.code ? formaterCode(sync.code) : '';
  const codeMasque = '•'.repeat(LONGUEUR_CODE + 4);
  const dateSync = sync.lastAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date(sync.lastAt),
      )
    : '';

  if (!sync.actif) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px]">{t('offTitle')}</span>
          <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
            {t('offHint')}
          </span>
        </div>

        <p className="m-0 text-[11.5px]" style={{ color: 'var(--warn)' }}>
          {t('lostWarn')}
        </p>

        {/* Dit AVANT l'appairage, pas après. C'est la confusion la plus
            probable, et la plus coûteuse : croire ses données à l'abri parce
            qu'elles sont à deux endroits, puis effacer par mégarde. */}
        <p className="m-0 text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('backupNote')}
        </p>

        <button
          type="button"
          onClick={() => void appairer(genererCode())}
          className={bouton}
          style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)', alignSelf: 'flex-start' }}
        >
          {t('generate')}
        </button>

        <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          <Field
            label={t('haveCode')}
            hint={t('haveCodeHint')}
            error={refus ? t('badCode') : undefined}
          >
            {(props) => (
              <input
                {...props}
                value={saisi}
                onChange={(e) => {
                  setSaisi(e.target.value);
                  setRefus(false);
                }}
                autoComplete="off"
                spellCheck={false}
                className="font-mono tracking-[0.12em] uppercase"
                style={champStyle}
              />
            )}
          </Field>
          <button
            type="button"
            onClick={() => void appairer(saisi)}
            className={bouton}
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)', alignSelf: 'flex-start' }}
          >
            {t('pair')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px]">{t('onTitle')}</span>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('onHint')}
        </span>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('backupNote')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
          {t('yourCode')}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <code
            data-testid="sync-code"
            className="rounded-btn border px-3 py-2 font-mono text-[12.5px] tracking-[0.12em] select-all"
            style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
          >
            {revele ? codeAffiche : codeMasque}
          </code>
          <button
            type="button"
            onClick={() => setRevele((v) => !v)}
            className={bouton}
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {revele ? t('hide') : t('reveal')}
          </button>
          <button
            type="button"
            onClick={() => void copier()}
            className={bouton}
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {copie ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copie ? t('copied') : t('copy')}
          </button>
        </div>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('codeHint')}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        {/* `role="status"` : l'état de la dernière synchronisation est lu par un
            lecteur d'écran quand il change, sans déplacer le focus. */}
        <p role="status" data-testid="sync-state" className="m-0 text-[12px]">
          {sync.enCours ? (
            <span className="flex items-center gap-2" style={{ color: 'var(--acc2)' }}>
              <Loader2 size={13} aria-hidden="true" className="motion-safe:animate-spin" />
              {t('busy')}
            </span>
          ) : sync.lastAt ? (
            <span style={{ color: 'var(--mut)' }}>{t('lastAt', { date: dateSync })}</span>
          ) : (
            <span style={{ color: 'var(--mut)' }}>{t('never')}</span>
          )}
        </p>

        {/* L'échec est traduit PAR GENRE. « Pas de réseau » et « mauvais code »
            n'appellent pas le même geste : le second seul demande d'agir. */}
        {sync.echec ? (
          <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
            {t(`err_${sync.echec}` as 'err_reseau')}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void synchroniserMaintenant()}
          disabled={sync.enCours}
          className={bouton}
          style={{
            borderColor: 'var(--line)',
            color: 'var(--txt2)',
            alignSelf: 'flex-start',
            opacity: sync.enCours ? 0.45 : 1,
            cursor: sync.enCours ? 'progress' : 'pointer',
          }}
        >
          <RefreshCw size={13} aria-hidden="true" />
          {t('now')}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        <span className="text-[13px]">{t('offT')}</span>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('offD')}
        </span>

        {/* Confirmation en DEUX TEMPS, comme la réinitialisation : le premier
            bouton n'oublie rien, il ouvre la question. */}
        {confirme ? (
          <div className="flex flex-col gap-3">
            {/* L'effacement du relais est un CHOIX SÉPARÉ, et décoché par
                défaut. Désappairer et effacer ne sont pas le même geste :
                le premier concerne cet appareil, le second est irréversible
                et vaut pour tous. Les fondre en un seul bouton ferait
                détruire des données à qui voulait seulement se déconnecter. */}
            <label className="flex cursor-pointer items-start gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={effacerRelais}
                onChange={(e) => setEffacerRelais(e.target.checked)}
                className="mt-0.5"
              />
              <span style={{ color: 'var(--txt2)' }}>{t('wipe')}</span>
            </label>
            <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
              {t('wipeHint')}
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void desactiverSync(effacerRelais).then((ok) => {
                    /* Un effacement raté ne referme PAS la question : l'appareil
                     reste appairé, et l'erreur s'affiche au-dessus. Refermer
                     donnerait à croire que c'est fait. */
                    if (!ok) return;
                    setConfirme(false);
                    setRevele(false);
                    setEffacerRelais(false);
                  });
                }}
                className={bouton}
                style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
              >
                {effacerRelais ? t('offYesWipe') : t('offYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirme(false)}
                className={bouton}
                style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
              >
                {t('offNo')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirme(true)}
            className={bouton}
            style={{ borderColor: 'var(--line)', color: 'var(--bad)', alignSelf: 'flex-start' }}
          >
            <Unlink size={13} aria-hidden="true" />
            {t('off')}
          </button>
        )}
      </div>
    </div>
  );
}
