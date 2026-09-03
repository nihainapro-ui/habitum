'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarDays,
  Maximize2,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
} from 'lucide-react';
import { useProgression, useStore } from '@/lib/store';
import { applyRail, readRailCookie, type EtatRail } from '@/lib/rail';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';
import { itemActif } from './nav-items';
import { MonthPicker } from './month-picker';

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
 * titre, lui, est le seul à porter `flex:1 1 120px` et `min-width:0`.
 *
 * SUR TÉLÉPHONE, L'EN-TÊTE NE SE REPLIE PLUS. `flex-wrap` faisait tomber la
 * recherche et « Nouveau » sur une seconde rangée : deux boutons qui coûtaient
 * un sixième de la hauteur utile d'un écran de 360 px. Tout tient maintenant
 * sur une ligne, et pour que ce soit tenable trois choses changent sous
 * 640/768 px :
 *
 * - le bouton MENU apparaît (< 768 px) — seul chemin au doigt vers les sept
 *   vues que la barre basse ne porte pas. Il reste visible en mode zen, sans
 *   quoi le zen mobile masquerait la dernière navigation atteignable ;
 * - la recherche se réduit à une cible carrée de 34 px (< 768 px) ;
 * - la pilule de profil et le mode zen disparaissent (< 640 px). Le profil est
 *   dans le tiroir ; le zen, lui, masque la barre basse — c'est une commande de
 *   bureau, et son raccourci ⌘\ reste intact pour qui a un clavier.
 *
 * Ce qui reste vaut ~137 px de commandes : le titre garde plus de 200 px sur un
 * écran de 360, au lieu des ~130 qu'il aurait eus en gardant tout. */

export function Header() {
  const t = useTranslations();
  const pathname = usePathname() ?? '';
  const zen = useStore((s) => s.ui.zen);
  const isDemo = useStore((s) => s.isDemo);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const toggleZen = useStore((s) => s.toggleZen);
  const openEditor = useStore((s) => s.openEditor);
  const menuOpen = useStore((s) => s.ui.menuOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);

  const [moisOuvert, setMoisOuvert] = useState(false);

  /* `MonthPicker` clôt l'en-tête (dernier enfant), le bouton qui l'ouvre vit
     plus haut, juste avant la recherche : les deux ne partagent donc PAS le
     même `RadixDialog.Root`, et ce bouton n'est jamais le `Dialog.Trigger`
     que Radix reconnaît. Son retour de focus automatique — `context
     .triggerRef.current?.focus()` dans `@radix-ui/react-dialog` — vise
     exactement CET élément-là ; ici `triggerRef` reste `null` pour toujours,
     et à la fermeture le focus tombe hors du document. Trouvé par le test de
     la tâche 2 (`toBeFocused` échouait après `Escape`), pas supposé : on
     referme donc la boucle nous-mêmes, une fois le dialogue DÉMONTÉ (l'effet
     réagit à `moisOuvert`, pas au clic d'Échap) pour ne pas se faire reprendre
     la main par le piège de focus encore actif. */
  const boutonCalendrierRef = useRef<HTMLButtonElement>(null);
  const moisEtaitOuvert = useRef(false);
  useEffect(() => {
    if (moisEtaitOuvert.current && !moisOuvert) {
      boutonCalendrierRef.current?.focus();
    }
    moisEtaitOuvert.current = moisOuvert;
  }, [moisOuvert]);

  /* Lecture APRÈS montage, comme `RailFooter` le fait pour le thème : la
     préférence n'existe que dans le navigateur, la lire au rendu divergerait à
     l'hydratation. Ce que l'état sert ici est l'ICÔNE du bouton, pas la
     visibilité du rail — celle-ci est déjà tranchée avant la première peinture
     par `public/theme.js`, donc rien ne clignote. */
  const [rail, setRail] = useState<EtatRail>('on');
  useEffect(() => {
    setRail(readRailCookie());
  }, []);
  const basculerRail = () => {
    const prochain: EtatRail = rail === 'off' ? 'on' : 'off';
    setRail(prochain);
    applyRail(prochain);
  };

  const item = itemActif(pathname);

  const prog = useProgression();

  return (
    <header
      /* `pt-[calc(...)]` et non un `paddingTop` en ligne : le style en ligne
         aurait aussi écrasé `md:py-[14px]`, et l'en-tête de bureau aurait
         maigri de 3 px. Encoche : l'en-tête est collé en haut, c'est donc lui
         qui doit s'en écarter ; l'inset vaut 0 partout où il n'y en a pas —
         bureau compris, ce qui laisse les captures de référence inchangées. */
      className="sticky top-0 z-[18] flex flex-nowrap items-center gap-2 border-b px-[13px] py-[11px] pt-[calc(11px+env(safe-area-inset-top))] md:gap-4 md:px-[26px] md:py-[14px] md:pt-[calc(14px+env(safe-area-inset-top))]"
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
      {/* Bouton du tiroir — mobile seulement. Au-dessus de 768 px le rail est
          rendu et un second accès aux mêmes onze vues n'apporterait rien. */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-expanded={menuOpen}
        aria-label={t('app.menuOpen')}
        title={t('app.menuOpen')}
        className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border md:hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
      >
        <Menu size={16} strokeWidth={1.9} aria-hidden="true" />
      </button>

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
        className="hidden max-w-[190px] flex-none items-center gap-[9px] rounded-full border py-[5px] pr-[13px] pl-[5px] text-[11.5px] sm:flex"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
      >
        <ProfilePastille level={prog.level} />
        <span className="hidden min-w-0 truncate min-[1200px]:inline">{t('app.navProfile')}</span>
      </Link>

      {/* Masquer le rail — BUREAU SEULEMENT. Sous 768 px il n'est pas rendu, et
          c'est la barre basse qui navigue : l'interrupteur n'y aurait rien à
          masquer. `aria-pressed` dit l'état, l'icône le montre. */}
      <button
        type="button"
        onClick={basculerRail}
        aria-pressed={rail === 'off'}
        aria-label={rail === 'off' ? t('app.railShow') : t('app.railHide')}
        title={rail === 'off' ? t('app.railShow') : t('app.railHide')}
        className="hidden h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border md:grid"
        style={{
          borderColor: rail === 'off' ? 'var(--acc2)' : 'var(--line)',
          background: rail === 'off' ? 'rgba(var(--glow),.2)' : 'var(--panel2)',
          color: rail === 'off' ? 'var(--acc2)' : 'var(--txt2)',
          transition: 'border-color .2s,background .2s,color .2s',
        }}
      >
        {rail === 'off' ? (
          <PanelLeft size={15} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={15} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={toggleZen}
        aria-pressed={zen}
        aria-label={zen ? t('app.zenOff') : t('app.zenOn')}
        title={zen ? t('app.zenOff') : t('app.zenOn')}
        className="hidden h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border sm:grid"
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

      {/* Le calendrier est visible à TOUTES les largeurs, contrairement au mode
          zen et à la pilule de profil qui disparaissent sous 640 px. C'est le
          geste que la spec vient chercher — « aller voir un autre jour, vite » —
          et il est né de captures prises sur téléphone : le masquer là serait le
          retirer à l'appareil qui l'a demandé. Sa cible fait 34 px, `flex-none`,
          comme la recherche repliée : le bloc de titre reste le seul à s'étirer.
          `tests/e2e/shell.spec.ts` mesure l'en-tête aux cinq largeurs. */}
      <button
        ref={boutonCalendrierRef}
        type="button"
        onClick={() => setMoisOuvert(true)}
        aria-label={t('app.openMonth')}
        title={t('app.openMonth')}
        className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
      >
        <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label={t('app.search')}
        className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[11px] border text-xs md:flex md:h-auto md:w-auto md:min-w-0 md:flex-[0_1_190px] md:items-center md:gap-[10px] md:overflow-hidden md:px-[13px] md:py-[9px]"
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

      <MonthPicker open={moisOuvert} onOpenChange={setMoisOuvert} />
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
