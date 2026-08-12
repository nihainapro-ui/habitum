'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { champStyle, Panel } from '@/components/ui';
import { useStore } from '@/lib/store';
import { RowCheck } from '@/components/today/RowCheck';

/* Liste de courses — champ `shop` du prototype, table `shopping` du modèle.
   Colonne latérale de la vue Tâches (05-SPEC-VUES.md § 6). */

export function ShoppingList() {
  const t = useTranslations('app');
  const articles = useStore((s) => s.shopping);
  const createShoppingItem = useStore((s) => s.createShoppingItem);
  const toggleShoppingItem = useStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useStore((s) => s.deleteShoppingItem);
  const [brouillon, setBrouillon] = useState('');

  const ajouter = () => {
    if (!brouillon.trim()) return;
    void createShoppingItem(brouillon);
    setBrouillon('');
  };

  return (
    <Panel title={t('shopping')} padding={14}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                ajouter();
              }
            }}
            aria-label={t('addItem')}
            placeholder={t('addItem')}
            className="rounded-field min-w-0 flex-1 border outline-none"
            style={champStyle}
          />
          <button
            type="button"
            onClick={ajouter}
            aria-label={t('add')}
            className="rounded-btn grid h-9 w-9 flex-none cursor-pointer place-items-center border"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>

        <ul data-shopping className="m-0 flex list-none flex-col gap-2 p-0">
          {articles.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5">
              <RowCheck
                size={20}
                name={a.label}
                checked={a.done}
                onToggle={() => void toggleShoppingItem(a.id)}
              />
              <span
                className="min-w-0 flex-1 truncate text-[13px]"
                style={{
                  color: a.done ? 'var(--mut)' : 'var(--txt)',
                  textDecoration: a.done ? 'line-through' : 'none',
                }}
              >
                {a.label}
              </span>
              <button
                type="button"
                onClick={() => void deleteShoppingItem(a.id)}
                aria-label={`${t('delete')} : ${a.label}`}
                className="rounded-btn-sm grid h-6 w-6 flex-none cursor-pointer place-items-center"
                style={{ color: 'var(--mut)' }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
