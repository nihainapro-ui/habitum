'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2, RotateCcw, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { telechargerJson } from '@/lib/features/backup';
import { ImportError, MAX_IMPORT_BYTES, type ImportReport } from '@/lib/data';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Export, import et copie de secours — tâche 5.8.

   L'IMPORT AFFICHE SON RAPPORT, et c'est tout l'enjeu : « importé » sans
   chiffre laisse croire que tout est passé. `ImportReport` sait exactement ce
   qui a été lu, gardé et écarté, et POURQUOI — cette information existait
   depuis la phase 1 sans que personne puisse la lire.

   Avant chaque import, et avant chaque réinitialisation, une copie de secours
   est prise automatiquement. Elle vit dans le même navigateur : elle protège
   d'un geste malheureux, pas d'une perte d'appareil. L'interface ne prétend pas
   autre chose, et c'est pour cela que le rappel d'export existe toujours. */

/** Nombre de refus détaillés affichés. Au-delà, la liste devient un mur. */
const MAX_ECARTES = 8;

const bouton = 'rounded-btn flex cursor-pointer items-center gap-2 border px-4 py-2 text-[12.5px]';

export function DataSection() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const { locale } = useLocaleSwitcher();

  const exportJson = useStore((s) => s.exportJson);
  const importJson = useStore((s) => s.importJson);
  const restoreBackup = useStore((s) => s.restoreBackup);
  const backupAt = useStore((s) => s.backupAt);

  const fichier = useRef<HTMLInputElement>(null);
  const [rapport, setRapport] = useState<ImportReport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [restauree, setRestauree] = useState(false);
  /* Tâche 8.2 (plan 8, § 8.5) — l'import d'une grosse sauvegarde prend des
     DIZAINES DE SECONDES, et l'écran ne disait rien pendant tout ce temps :
     ni sablier, ni bouton grisé. Mesuré à 32 s sur un fichier de 2 Mo. Une
     interface muette sur une opération longue, c'est une interface qu'on croit
     plantée — et l'utilisateur ferme l'onglet AU MILIEU d'une écriture. */
  const [enCours, setEnCours] = useState(false);

  const exporter = async () => {
    try {
      telechargerJson(await exportJson());
      setErreur(null);
    } catch {
      /* D5 — un échec d'export doit se voir. Le prototype n'avait aucun
         `try/catch` : l'échec restait muet. */
      setErreur(ts('expFail'));
    }
  };

  const importer = async (f: File) => {
    setRapport(null);
    setRestauree(false);
    /* Contrôle de taille AVANT lecture : ouvrir un fichier de 400 Mo pour
       découvrir qu'il est trop gros fige l'onglet le temps de le lire. */
    if (f.size > MAX_IMPORT_BYTES) {
      setErreur(ts('impTooBig'));
      return;
    }
    setEnCours(true);
    try {
      setRapport(await importJson(await f.text()));
      setErreur(null);
    } catch (e) {
      /* Les refus de l'importeur portent un CODE stable : l'interface affiche
         le libellé traduit correspondant, jamais le message technique. */
      const code = e instanceof ImportError ? e.code : 'FORMAT';
      setErreur(code === 'TOO_BIG' ? ts('impTooBig') : ts(`imp_${code}` as 'imp_JSON'));
    } finally {
      /* `finally` : un import qui échoue doit rendre l'interface, sinon le
         refus laisse les boutons grisés pour toujours. */
      setEnCours(false);
    }
  };

  const restaurer = async () => {
    const r = await restoreBackup();
    setRapport(r);
    setRestauree(r !== null);
  };

  /* Composés hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const compte = rapport ? `${rapport.kept} / ${rapport.read}` : '';
  const dateCopie = backupAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date(backupAt),
      )
    : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px]">{ts('localBackup')}</span>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {t('localOnly')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Les deux boutons sont DÉSACTIVÉS pendant l'import. Ce n'est pas
            cosmétique : relancer un import par-dessus un import en cours
            reprendrait une copie de secours au milieu de l'écriture
            précédente. `opacity` suit l'état, pour que la raison du blocage se
            voie au lieu de se deviner. */}
        <button
          type="button"
          onClick={() => void exporter()}
          disabled={enCours}
          className={bouton}
          style={{
            borderColor: 'var(--line)',
            color: 'var(--txt2)',
            opacity: enCours ? 0.45 : 1,
            cursor: enCours ? 'progress' : 'pointer',
          }}
        >
          <Download size={13} aria-hidden="true" />
          {t('exportBtn')}
        </button>

        <button
          type="button"
          onClick={() => fichier.current?.click()}
          disabled={enCours}
          className={bouton}
          style={{
            borderColor: 'var(--line)',
            color: 'var(--txt2)',
            opacity: enCours ? 0.45 : 1,
            cursor: enCours ? 'progress' : 'pointer',
          }}
        >
          <Upload size={13} aria-hidden="true" />
          {t('importBtn')}
        </button>

        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          aria-label={t('importBtn')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            /* Le champ est vidé : réimporter DEUX FOIS le même fichier doit
               marcher, et sans cela le second choix ne déclenche rien. */
            e.target.value = '';
            if (f) void importer(f);
          }}
        />
      </div>

      <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
        {ts('impMerge')}
      </span>

      {/* ANNONCÉ, pas seulement affiché : `role="status"` place le message dans
          une région live polie, donc un lecteur d'écran le lit sans qu'on ait
          à déplacer le focus. Une opération de trente secondes qui ne dit rien
          à qui ne voit pas l'écran est une opération qui n'existe pas. */}
      {enCours ? (
        <p
          role="status"
          data-testid="import-busy"
          className="m-0 flex items-center gap-2 text-[12px]"
          style={{ color: 'var(--acc2)' }}
        >
          <Loader2 size={13} aria-hidden="true" className="motion-safe:animate-spin" />
          {ts('impBusy')}
        </p>
      ) : null}

      {erreur ? (
        <p role="alert" className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
          {erreur}
        </p>
      ) : null}

      {rapport ? (
        <section
          data-testid="import-report"
          role="status"
          className="rounded-panel flex flex-col gap-2 border p-3.5"
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
        >
          <span className="text-[12.5px] font-semibold">
            {restauree
              ? ts('bakRestored')
              : t('importDone', { kept: rapport.kept, read: rapport.read })}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--txt2)' }}>
            {compte}
          </span>

          {rapport.dropped.length > 0 ? (
            <>
              <span className="text-[11.5px]" style={{ color: 'var(--warn)' }}>
                {ts('impPartial')}
              </span>
              <ul
                data-dropped
                className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-[10.5px]"
                style={{ color: 'var(--mut)' }}
              >
                {rapport.dropped.slice(0, MAX_ECARTES).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        <span className="text-[13px]">{ts('bakTitle')}</span>
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {ts('bakHint')}
        </span>

        {backupAt ? (
          <div className="flex flex-wrap items-center gap-3">
            <span data-testid="backup-at" className="font-mono text-[11px]">
              {dateCopie}
            </span>
            <button
              type="button"
              onClick={() => void restaurer()}
              className={bouton}
              style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
            >
              <RotateCcw size={13} aria-hidden="true" />
              {ts('bakRestore')}
            </button>
          </div>
        ) : (
          <span className="text-[12px]" style={{ color: 'var(--mut)' }}>
            {ts('bakEmpty')}
          </span>
        )}
      </div>
    </div>
  );
}
