import type { StateCreator } from 'zustand';
import { shoppingRepo } from '@/lib/data';
import type { AppState, ShoppingActions } from '../types';

export const createShoppingSlice: StateCreator<AppState, [], [], ShoppingActions> = (set, get) => ({
  async createShoppingItem(label) {
    const propre = label.trim();
    if (!propre) return;
    const item = await shoppingRepo.create({ label: propre, done: false });
    set((s) => ({ shopping: [...s.shopping, item] }));
  },

  async toggleShoppingItem(id) {
    const item = get().shopping.find((x) => x.id === id);
    if (!item) return;
    const suivant = await shoppingRepo.update(id, { done: !item.done });
    if (!suivant) return;
    set((s) => ({ shopping: s.shopping.map((x) => (x.id === id ? suivant : x)) }));
  },

  async deleteShoppingItem(id) {
    await shoppingRepo.softDelete(id);
    set((s) => ({ shopping: s.shopping.filter((x) => x.id !== id) }));
  },
});
