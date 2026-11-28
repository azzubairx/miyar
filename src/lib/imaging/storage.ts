import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FoodNutritionInput } from '../../types';
import type { ImagingKind } from './types';

interface CachedProduct {
  key: string;
  kind: ImagingKind;
  barcode: string;
  name: string;
  brand: string;
  ingredientsText: string;
  nutrition?: Partial<FoodNutritionInput>;
  source: 'open_food_facts' | 'open_beauty_facts';
  fetched_at: string;
}

interface MiyarImagingDB extends DBSchema {
  products: {
    key: string;
    value: CachedProduct;
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<MiyarImagingDB>> | null = null;

function getDb(): Promise<IDBPDatabase<MiyarImagingDB>> | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<MiyarImagingDB>('miyar-imaging', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) db.createObjectStore('products');
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

function cacheKey(kind: ImagingKind, barcode: string): string {
  return `${kind}:${barcode}`;
}

export async function getCachedProduct(
  kind: ImagingKind,
  barcode: string,
): Promise<CachedProduct | null> {
  const db = getDb();
  if (!db) return null;
  try {
    return (await (await db).get('products', cacheKey(kind, barcode))) ?? null;
  } catch {
    return null;
  }
}

export async function putCachedProduct(product: Omit<CachedProduct, 'key'>): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const value: CachedProduct = { ...product, key: cacheKey(product.kind, product.barcode) };
    await (await db).put('products', value, value.key);
  } catch {
    /* Cache failures must never block the import flow. */
  }
}

export async function clearProductCache(): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await (await db).clear('products');
  } catch {
    /* ignore */
  }
}

export async function getImagingSetting<T>(key: string, fallback: T): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    const value = await (await db).get('settings', key);
    return (value as T | undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setImagingSetting(key: string, value: unknown): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await (await db).put('settings', value, key);
  } catch {
    /* ignore */
  }
}
