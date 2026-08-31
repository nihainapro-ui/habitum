'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Bandeau de mise à jour — tâche 5.7.

   RÈGLE : une nouvelle version ne s'installe jamais sous les doigts de
   l'utilisateur. Le service worker attend (`skipWaiting: false`), le bandeau
   annonce, et c'est le clic qui recharge. Une application qui se recharge toute
   seule pendant qu'on écrit une note vient de faire perdre la note.

   Écrit avec l'API `ServiceWorker` du navigateur, sans passer par la
   bibliothèque cliente de Serwist : le message `SKIP_WAITING` est le protocole
   standard, la version installée le comprend déjà, et cela fait une dépendance
   de moins dans le bundle de TOUTES les pages. */

export function UpdateBanner() {
  const ts = useTranslations('system');
  const [enAttente, setEnAttente] = useState<ServiceWorker | null>(null);
  const [refuse, setRefuse] = useState(false);
  /* Le rechargement n'a lieu QUE si l'utilisateur l'a demandé.
     `controllerchange` survient aussi à la toute première installation, quand
     le service worker prend le contrôle d'un onglet déjà ouvert
     (`clientsClaim`) : recharger là serait recharger la page de quelqu'un qui
     n'a rien demandé et qui n'a même pas vu de bandeau. Le drapeau sert aussi
     de garde contre un double rechargement. */
  const demande = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let annule = false;

    const surControleur = () => {
      if (!demande.current) return;
      demande.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', surControleur);

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || annule) return;

      /* Une version peut déjà attendre : l'onglet a pu être ouvert après elle. */
      if (reg.waiting) setEnAttente(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nouveau = reg.installing;
        if (!nouveau) return;
        nouveau.addEventListener('statechange', () => {
          /* `controller` non nul distingue une MISE À JOUR d'une première
             installation. À la première, il n'y a rien à annoncer. */
          if (nouveau.state === 'installed' && navigator.serviceWorker.controller) {
            setEnAttente(nouveau);
          }
        });
      });
    });

    return () => {
      annule = true;
      navigator.serviceWorker.removeEventListener('controllerchange', surControleur);
    };
  }, []);

  const appliquer = useCallback(() => {
    demande.current = true;
    enAttente?.postMessage({ type: 'SKIP_WAITING' });
  }, [enAttente]);

  if (!enAttente || refuse) return null;

  return (
    <div
      role="status"
      data-testid="update-banner"
      /* z-45 : AU-DESSUS de la barre basse et des toasts (z-40), en DESSOUS
          des modales (z-50). À égalité avec elles, le bandeau gagnait par
          l'ordre du document — il est monté en dernier dans la coque — et
          couvrait une entrée du tiroir de navigation comme un pan de la
          palette ⌘K. Un avis passif ne passe pas devant un dialogue. */
      className="rounded-panel fixed right-4 bottom-24 left-4 z-[45] mx-auto flex max-w-[420px] flex-wrap items-center gap-3 border p-3.5 md:bottom-4"
      style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
    >
      <span className="min-w-0 flex-1 text-[12.5px]">{ts('updT')}</span>
      <button
        type="button"
        onClick={appliquer}
        className="rounded-btn cursor-pointer border-0 px-3 py-1.5 text-[12px] font-bold"
        style={{
          background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
          color: ENCRE_SUR_TEINTE,
        }}
      >
        {ts('updNow')}
      </button>
      <button
        type="button"
        onClick={() => setRefuse(true)}
        className="rounded-btn cursor-pointer border px-3 py-1.5 text-[12px]"
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
      >
        {ts('updLater')}
      </button>
    </div>
  );
}
