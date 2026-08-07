import { db } from '../db';
import { makeRepo } from './base';
import type { ShoppingItem } from '@/lib/domain';

export const shoppingRepo = makeRepo<ShoppingItem>(db.shopping);
