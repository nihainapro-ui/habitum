'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Maximize2, Plus, Search } from 'lucide-react';
import { useProgression, useStore } from '@/lib/store';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';
import { itemActif } from './nav-items';

/* En-tête — porté de `<header data-topbar>` (`Habitum.dc.html`, lignes 208–235).
 *
 * De gauche à droite : pastille d'état, TITRE DE LA VUE, sur-titre et badge de
 * démonstration ; puis pilule de profil, mode zen, indice, filet, recherche,
 * et le bouton « Nouveau ».
 *
 * LE TITRE VIT ICI, PAS DANS LA VUE. C'est le prototype qui en décide, et ce
 * n'est pas cosmétique : les onze vues commencent alors directement par leur
 * donnée, sans réserver 60 px à un titre que la barre porte déjà. Le `<h1>` de
 * la page est donc celui-ci — il y en a UN, et il change avec la route.
 *
 * PIÈGE DÉJÀ PAYÉ (`docs/handoff/reference/CARTE-DU-FICHIER.md` § 3) : « un
 * élément à largeur fixe dans l'en-tête vole la place du titre et du
 * sous-titre, y compris au-dessus de 1060 px ». Tout ce qui est ajouté à droite
 * porte donc `flex-none` et se réduit à sa marque sous 1200 px ; le bloc de
 * titre, lui, est le seul à porter `flex:1 1 120px` et `min-width:0`. */

export function Header() {
  const t = useTranslations();
  const pathname = usePathname() ?? '';
  const zen = useStore((s) => s.ui.zen);
  const isDemo = useStore((s) => s.isDemo);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const toggleZen = useStore((s) => s.toggleZen);
  const openEditor = useStore((s) => s.openEditor);

  const item = itemActif(pathname);

  const prog = useProgression();

  return (
    <header
      className="sticky top-0 z-[18] flex flex-wrap items-center gap-3 border-b px-[13px] py-[11px] md:flex-nowrap md:gap-4 md:px-[26px] md:py-[14px]"
      style={{
        borderColor: 'var(--line)',
        /* Dégradé et flou : le contenu qui passe dessous se devine sans jamais
           venir concurrencer le titre. */
        background:
          'linear-gradient(180deg,color-mix(in srgb,var(--bg) 86%,transparent),color-mix(in srgb,var(--bg) 62%,transparent))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="flex min-w-0 flex-[1_1_120px] flex-col gap-[3px] overflow-hidden">
        <div className="flex min-w-0 items-center gap-[9px]">
          <span
            aria-hidden="true"
            style={{
              width: '5px',
              height: '5px',
              flex: 'none',
              borderRadius: '50%',
              background: 'var(--acc2)',
              boxShadow: '0 0 8px var(--acc2)',
              animation: 'flick 2.2s ease-in-out infinite',
            }}
          />
          <h1
            className="m-0 truncate text-[15px] md:text-[17px]"
            style={{ fontWeight: 600, letterSpacing: '-.2px' }}
          >
            {item ? t(`app.${item.key}`) : 'Habitum'}
          </h1>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--mut)',
            }}
          >
            {item ? t(`app.${item.subKey}`) : ''}
          </span>

          {isDemo ? (
            <span
              title={t('system.demoTag')}
              className="shrink-0 rounded-full px-2 py-[1px] text-[10.5px] whitespace-nowrap"
              style={{ background: 'var(--panel2)', color: 'var(--txt2)' }}
            >
              {/* Sous 1200 px, le badge se réduit à sa marque : il ne doit pas
                  voler la place du sur-titre (CHANGELOG, lot 1).

                  Le libellé accessible est un TEXTE masqué, pas un `aria-label` :
                  posé sur un `<span>` sans rôle, l'attribut est proscrit — les
                  lecteurs d'écran l'ignorent, et le badge redevenait muet. */}
              <span className="hidden min-[1200px]:inline">{t('system.demoTag')}</span>
              <span className="min-[1200px]:hidden">
                <span aria-hidden="true">◆</span>
                <span className="sr-only">{t('system.demoTag')}</span>
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href="/app/profile"
        aria-label={t('app.navProfile')}
        className="flex max-w-[190px] flex-none items-center gap-[9px] rounded-full border py-[5px] pr-[13px] pl-[5px] text-[11.5px]"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
      >
        <ProfilePastille level={prog.level} />
        <span className="hidden min-w-0 truncate min-[1200px]:inline">{t('app.navProfile')}</span>
      </Link>

      <button
        type="button"
        onClick={toggleZen}
        aria-pressed={zen}
        aria-label={zen ? t('app.zenOff') : t('app.zenOn')}
        title={zen ? t('app.zenOff') : t('app.zenOn')}
        className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border"
        style={{
          borderColor: zen ? 'var(--acc2)' : 'var(--line)',
          background: zen ? 'rgba(var(--glow),.2)' : 'var(--panel2)',
          color: zen ? 'var(--acc2)' : 'var(--txt2)',
          transition: 'border-color .2s,background .2s,color .2s',
        }}
      >
        <Maximize2 size={14} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {/* L'indice. Il est DÉRIVÉ du journal (`lib/domain/progression.ts`), pas
          décoratif — un compte vierge affiche 16, pas un nombre flatteur. */}
      <div className="hidden flex-none items-center gap-[9px] min-[1060px]:flex">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '.1em',
            color: 'var(--mut)',
          }}
        >
          {t('app.idxLbl')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--acc2)',
            textShadow: '0 0 14px var(--acc2)',
          }}
        >
          {prog.index}
        </span>
      </div>

      <div
        aria-hidden="true"
        className="hidden flex-none min-[1060px]:block"
        style={{ width: '1px', height: '26px', background: 'var(--line)' }}
      />

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t('app.search')}
        className="flex min-w-0 flex-[0_1_190px] cursor-pointer items-center gap-[10px] overflow-hidden rounded-[11px] border px-[13px] py-[9px] text-xs"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--mut)' }}
      >
        <Search size={13} strokeWidth={1.9} aria-hidden="true" style={{ flex: 'none' }} />
        <span className="hidden flex-1 truncate text-left min-[1320px]:block">
          {t('app.search')}
        </span>
        <span
          aria-hidden="true"
          className="hidden flex-none min-[1320px]:block"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            border: '1px solid var(--line)',
            borderRadius: '5px',
            padding: '1px 5px',
          }}
        >
          ⌘K
        </span>
      </button>

      <button
        type="button"
        onClick={() => openEditor({ kind: 'task', id: null })}
        aria-label={t('app.newItem')}
        className="flex flex-none cursor-pointer items-center gap-2 rounded-[11px] px-4 py-[10px] text-xs"
        style={{
          border: 0,
          background: 'linear-gradient(135deg,var(--acc),var(--acc2))',
          /* Encre déduite du thème, jamais écrite en dur : `--bg` est par
             construction la couleur la plus éloignée des accents de son thème.
             Un `#04060d` en dur serait sombre sur sombre dans `clinical`, dont
             les accents sont foncés — le défaut corrigé par la tâche 8.3. */
          color: ENCRE_SUR_TEINTE,
          fontWeight: 700,
          boxShadow: '0 8px 26px -10px rgba(var(--glow),.9)',
        }}
      >
        <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
        <span className="hidden sm:inline">{t('app.newItem')}</span>
      </button>
    </header>
  );
}

/** Pastille de profil. Le prototype y met le glyphe d'avatar ; tant que la vue
 *  Profil ne fournit pas d'avatar à la coque, elle porte le niveau — un nombre
 *  réel, pas un décor. */
function ProfilePastille({ level }: { level: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center"
      style={{
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg,var(--acc),var(--acc3))',
        color: ENCRE_SUR_TEINTE,
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 700,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
      }}
    >
      {level}
    </span>
  );
}
