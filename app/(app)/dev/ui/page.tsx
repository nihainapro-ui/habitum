'use client';

import { useState } from 'react';
import {
  Card,
  CategoryGlyph,
  Chip,
  Dialog,
  Field,
  Icon,
  Panel,
  Ring,
  Segmented,
  Sheet,
  Switch,
  Toast,
  Tooltip,
  champStyle,
} from '@/components/ui';

/* Galerie de contrôle des primitives.

   Elle n'est PAS un écran produit : elle est redirigée en production
   (next.config.mjs) et exclue de la règle qui interdit les chaînes en dur —
   ses libellés sont des noms de composants, pas du texte à traduire.

   Chaque section porte `data-testid="ui-<nom>"` : c'est ce que
   tests/e2e/ui-gallery.spec.ts parcourt, dans les trois thèmes. */

function Section({
  id,
  titre,
  children,
}: {
  id: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section data-testid={`ui-${id}`} className="flex flex-col gap-3">
      <h2
        className="m-0 font-mono text-[9.5px] tracking-[0.18em] uppercase"
        style={{ color: 'var(--mut)' }}
      >
        {titre}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export default function GalerieUI() {
  const [actif, setActif] = useState(false);
  const [segment, setSegment] = useState<'7' | '30' | '90'>('30');
  const [dialogue, setDialogue] = useState(false);
  const [tiroir, setTiroir] = useState(false);

  return (
    <div className="flex max-w-[900px] flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] tracking-tight">Galerie des primitives</h1>
        <p className="m-0 text-[13px]" style={{ color: 'var(--mut)' }}>
          Douze primitives, trois thèmes, deux langues. Basculer le thème :
          <code className="font-mono"> document.documentElement.dataset.theme</code>
        </p>
      </header>

      <Section id="panel" titre="Panel">
        <div className="w-full max-w-[420px]">
          <Panel title="Panneau" actions={<Chip size="sm">action</Chip>}>
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
              Verre dépoli, rayon 16. Premier plan uniquement.
            </p>
          </Panel>
        </div>
      </Section>

      <Section id="card" titre="Card">
        <div className="w-[240px]">
          <Card>Carte simple</Card>
        </div>
        <div className="w-[240px]">
          <Card interactive tone="accent" onClick={() => setActif((v) => !v)}>
            Carte interactive
          </Card>
        </div>
      </Section>

      <Section id="chip" titre="Chip">
        <Chip>neutre</Chip>
        <Chip tone="ok">réussi</Chip>
        <Chip tone="warn">à surveiller</Chip>
        <Chip tone="bad">manqué</Chip>
        <Chip size="sm">petite</Chip>
      </Section>

      <Section id="switch" titre="Switch">
        <div className="w-[320px]">
          <Switch checked={actif} onChange={setActif} label="Interrupteur" />
          <Switch
            checked={false}
            onChange={() => {}}
            label="Désactivé"
            disabled
            reason="Disponible en phase 5"
          />
        </div>
      </Section>

      <Section id="field" titre="Field">
        <div className="w-[320px] flex flex-col gap-4">
          <Field label="Nom" hint="Deux caractères minimum">
            {(props) => (
              <input
                {...props}
                className="rounded-field border"
                style={champStyle}
                defaultValue="Méditer"
              />
            )}
          </Field>
          <Field label="Cible" error="Valeur invalide">
            {(props) => (
              <input
                {...props}
                className="rounded-field border"
                style={champStyle}
                defaultValue="-1"
              />
            )}
          </Field>
        </div>
      </Section>

      <Section id="segmented" titre="Segmented">
        <Segmented
          label="Fenêtre"
          value={segment}
          onChange={setSegment}
          options={[
            { value: '7', label: '7 j' },
            { value: '30', label: '30 j' },
            { value: '90', label: '90 j' },
          ]}
        />
      </Section>

      <Section id="sheet" titre="Sheet">
        <Sheet
          open={tiroir}
          onOpenChange={setTiroir}
          title="Tiroir"
          description="Plein écran sous 768 px."
          trigger={
            <button
              type="button"
              className="rounded-btn border px-3 py-1.5 text-[12px]"
              style={{ borderColor: 'var(--line)' }}
            >
              Ouvrir le tiroir
            </button>
          }
        >
          <p className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
            Même sémantique que la modale, autre géométrie.
          </p>
        </Sheet>
      </Section>

      <Section id="dialog" titre="Dialog">
        <Dialog
          open={dialogue}
          onOpenChange={setDialogue}
          title="Modale"
          description="Piège de focus et Escape fournis par Radix."
          trigger={
            <button
              type="button"
              className="rounded-btn border px-3 py-1.5 text-[12px]"
              style={{ borderColor: 'var(--line)' }}
            >
              Ouvrir la modale
            </button>
          }
        >
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
            Le focus revient au déclencheur à la fermeture.
          </p>
        </Dialog>
      </Section>

      <Section id="toast" titre="Toast">
        <div className="w-full max-w-[420px]">
          <Toast
            message="« Méditer » supprimée"
            actionLabel="Annuler"
            onAction={() => {}}
            onDismiss={() => {}}
            dismissLabel="Fermer"
          />
        </div>
      </Section>

      <Section id="tooltip" titre="Tooltip">
        <Tooltip label="Série en cours">
          <button
            type="button"
            className="rounded-btn border px-3 py-1.5 text-[12px]"
            style={{ borderColor: 'var(--line)' }}
          >
            Survoler ou tabuler
          </button>
        </Tooltip>
      </Section>

      <Section id="ring" titre="Ring">
        <Ring value={0} label="0 %" />
        <Ring value={0.42} label="42 %" />
        <Ring value={1} label="100 %" />
      </Section>

      <Section id="icon" titre="Icon">
        <div className="flex items-center gap-3" style={{ color: 'var(--txt2)' }}>
          <Icon name="dash" />
          <Icon name="today" />
          <Icon name="habits" />
          <Icon name="stats" />
          <Icon name="timer" />
        </div>
        <div className="flex items-center gap-3 text-[15px]">
          <CategoryGlyph category="health" />
          <CategoryGlyph category="sport" />
          <CategoryGlyph category="mind" />
          <CategoryGlyph category="work" />
          <CategoryGlyph category="home" />
          <CategoryGlyph category="study" />
        </div>
      </Section>
    </div>
  );
}
