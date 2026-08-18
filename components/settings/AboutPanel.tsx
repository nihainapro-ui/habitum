'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Panel } from '@/components/ui';
import { VERSION } from '@/lib/version';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Page de version — tâche 8.8.

   Elle existe pour UNE raison : rendre un rapport d'anomalie exploitable. Sans
   compte et sans télémétrie, tout ce qu'on saura d'un incident est ce que la
   personne aura recopié. La version applicative dit quel code tournait ; la
   version de SCHÉMA dit quelle migration Dexie s'est exécutée — c'est la seule
   question qui compte quand des données ont disparu (docs/RUNBOOK.md § 3).

   Le lien vers le CHANGELOG n'est pas décoratif : il permet à qui constate un
   changement de comportement de vérifier s'il est voulu, sans ouvrir d'issue. */

const URL_CHANGELOG = 'https://github.com/nihainapro-ui/habitum/blob/main/CHANGELOG.md';

export function AboutPanel() {
  const ts = useTranslations('system');
  const { locale } = useLocaleSwitcher();

  /* Composé hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const schema = String(VERSION.schema);

  /* La date est formatée APRÈS LE MONTAGE, jamais au rendu.
     Les routes sont prérendues à la compilation (D12) : `Intl.DateTimeFormat`
     s'exécute alors dans le fuseau du serveur de build, puis dans celui du
     visiteur — deux chaînes différentes pour le même instant, et React signale
     l'écart à l'hydratation (erreur #418). C'est exactement le détour que fait
     déjà l'en-tête pour la date du jour ; le même piège, la même sortie.
     L'horodatage ISO tient la place en attendant : il est identique des deux
     côtés, et il reste lisible si le montage n'arrive jamais. */
  const [construite, setConstruite] = useState<string>(VERSION.builtAt ?? ts('verUnknown'));
  useEffect(() => {
    if (!VERSION.builtAt) return;
    setConstruite(
      new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date(VERSION.builtAt),
      ),
    );
  }, [locale, ts]);

  const lignes = [
    { cle: 'app', libelle: ts('verApp'), valeur: VERSION.app },
    { cle: 'schema', libelle: ts('verSchema'), valeur: schema },
    { cle: 'built', libelle: ts('verBuilt'), valeur: construite },
  ];

  return (
    <Panel title={ts('verTitle')}>
      <div className="flex flex-col gap-3">
        <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
          {ts('verHint')}
        </span>

        <dl data-version className="m-0 flex flex-col gap-2">
          {lignes.map((l) => (
            <div key={l.cle} className="flex flex-wrap items-baseline justify-between gap-3">
              <dt className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
                {l.libelle}
              </dt>
              {/* `data-version-value` porte le repère de masquage de la
                  non-régression visuelle : la date de construction change à
                  chaque build, et comparer un horodatage à un socle figé ferait
                  rougir trois captures à chaque compilation, sans qu'aucune
                  régression ne se soit produite. */}
              <dd
                data-version-value={l.cle}
                className="m-0 font-mono text-[11.5px]"
                style={{ color: 'var(--txt)' }}
              >
                {l.valeur}
              </dd>
            </div>
          ))}
        </dl>

        <a
          href={URL_CHANGELOG}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-btn self-start border px-4 py-2 text-[12.5px]"
          style={{ borderColor: 'var(--line)', color: 'var(--acc2)' }}
        >
          {ts('verChangelog')}
        </a>
      </div>
    </Panel>
  );
}
