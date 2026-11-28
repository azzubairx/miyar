import type { FoodNutritionInput } from '../types';
import { validateBarcode, type BarcodeValidation } from './imaging/barcode-format';
import { getCachedProduct, putCachedProduct } from './imaging/storage';

export interface BarcodeImportResult {
  ok: boolean;
  message_ar: string;
  source?: 'open_food_facts' | 'open_beauty_facts';
  barcode?: string;
  name?: string;
  brand?: string;
  packageSize?: string;
  servingSize?: string;
  ingredientsText?: string;
  nutrition?: Partial<FoodNutritionInput>;
  cached?: boolean;
  validation?: BarcodeValidation;
  needsReview?: boolean;
}

export interface BarcodeLookupOptions {
  allowExternal?: boolean;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

interface ProductPayload {
  product: Record<string, unknown> | null;
}

async function fetchProduct(
  baseUrl: string,
  barcode: string,
  fields: string[],
): Promise<ProductPayload> {
  const query = `fields=${fields.join(',')}`;

  // API v3 first; some mirrors and older Beauty Facts instances still use v2.
  try {
    const v3 = (await fetchJson(`${baseUrl}/api/v3/product/${barcode}?${query}`)) as {
      status?: string;
      product?: Record<string, unknown>;
    };
    if ((v3.status === 'success' || v3.status === 'success_with_warnings') && v3.product) {
      return { product: v3.product };
    }
    if (v3.status === 'failure') return { product: null };
  } catch {
    /* fall through to v2 */
  }

  const v2 = (await fetchJson(`${baseUrl}/api/v2/product/${barcode}.json?${query}`)) as {
    status?: number;
    product?: Record<string, unknown>;
  };
  return { product: v2.status === 1 && v2.product ? v2.product : null };
}

function cachedResult(
  kind: 'food' | 'cosmetics',
  cached: NonNullable<Awaited<ReturnType<typeof getCachedProduct>>>,
): BarcodeImportResult {
  return {
    ok: true,
    cached: true,
    needsReview: true,
    message_ar:
      'وُجد المنتج في ذاكرة الجهاز المحلية. لم يُجرَ أي اتصال خارجي، والقيم الخام تحتاج مراجعة قبل التقييم.',
    source: cached.source,
    barcode: cached.barcode,
    name: cached.name,
    brand: cached.brand,
    ingredientsText: cached.ingredientsText,
    nutrition: cached.nutrition,
  };
}

function invalidResult(validation: BarcodeValidation): BarcodeImportResult {
  return {
    ok: false,
    validation,
    message_ar: validation.message_ar,
  };
}

export async function importFoodBarcode(
  barcodeInput: string,
  options: BarcodeLookupOptions = {},
): Promise<BarcodeImportResult> {
  const validation = validateBarcode(barcodeInput);
  if (!validation.valid) return invalidResult(validation);
  const barcode = validation.digits;

  const cached = await getCachedProduct('food', barcode);
  if (cached) return cachedResult('food', cached);

  if (options.allowExternal === false) {
    return {
      ok: false,
      validation,
      message_ar:
        'البحث الخارجي معطّل. الباركود صالح، لكن لا توجد نسخة محلية من المنتج. فعّل Open Food Facts أو أدخل البيانات يدويًا.',
    };
  }

  try {
    const fields = [
      'product_name',
      'product_name_ar',
      'brands',
      'quantity',
      'serving_size',
      'ingredients_text',
      'ingredients_text_ar',
      'nutriments',
    ];
    const { product } = await fetchProduct('https://world.openfoodfacts.org', barcode, fields);
    if (!product) {
      return {
        ok: false,
        validation,
        message_ar: 'لم يُعثر على المنتج في Open Food Facts. يمكنك إدخال البيانات يدويًا.',
      };
    }

    const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
    const sodiumGrams = toNumber(nutriments['sodium_100g']);
    const nutrition: Partial<FoodNutritionInput> = {
      energy_kj: toNumber(nutriments['energy-kj_100g']),
      energy_kcal: toNumber(nutriments['energy-kcal_100g']),
      fat_total_g: toNumber(nutriments['fat_100g']),
      fat_saturated_g: toNumber(nutriments['saturated-fat_100g']),
      fat_trans_g: toNumber(nutriments['trans-fat_100g']),
      carbohydrates_g: toNumber(nutriments['carbohydrates_100g']),
      sugars_total_g: toNumber(nutriments['sugars_100g']),
      sugars_added_g: toNumber(nutriments['added-sugars_100g']),
      fibre_g: toNumber(nutriments['fiber_100g']),
      protein_g: toNumber(nutriments['proteins_100g']),
      sodium_mg: sodiumGrams !== null ? sodiumGrams * 1000 : null,
      salt_g: toNumber(nutriments['salt_100g']),
      fruit_veg_nuts_percent: toNumber(
        nutriments['fruits-vegetables-nuts-estimate-from-ingredients_100g'],
      ),
    };

    const result: BarcodeImportResult = {
      ok: true,
      needsReview: true,
      message_ar:
        'استُوردت الحقول الخام فقط من Open Food Facts. لم تُستورد أي درجة أو تصنيف خارجي، ويمكنك تعديل كل قيمة قبل التقييم.',
      source: 'open_food_facts',
      barcode,
      validation,
      name: String(product.product_name_ar || product.product_name || ''),
      brand: String(product.brands || ''),
      packageSize: String(product.quantity || ''),
      servingSize: String(product.serving_size || ''),
      ingredientsText: String(product.ingredients_text_ar || product.ingredients_text || ''),
      nutrition,
    };

    await putCachedProduct({
      kind: 'food',
      barcode,
      name: result.name ?? '',
      brand: result.brand ?? '',
      ingredientsText: result.ingredientsText ?? '',
      nutrition,
      source: 'open_food_facts',
      fetched_at: new Date().toISOString(),
    });

    return result;
  } catch {
    return {
      ok: false,
      validation,
      message_ar:
        'تعذّر الاتصال بقاعدة Open Food Facts. المنصة تعمل دون اتصال؛ أدخل البيانات يدويًا أو حاول لاحقًا.',
    };
  }
}

export async function importCosmeticsBarcode(
  barcodeInput: string,
  options: BarcodeLookupOptions = {},
): Promise<BarcodeImportResult> {
  const validation = validateBarcode(barcodeInput);
  if (!validation.valid) return invalidResult(validation);
  const barcode = validation.digits;

  const cached = await getCachedProduct('cosmetics', barcode);
  if (cached) return cachedResult('cosmetics', cached);

  if (options.allowExternal === false) {
    return {
      ok: false,
      validation,
      message_ar:
        'البحث الخارجي معطّل. الباركود صالح، لكن لا توجد نسخة محلية من المنتج. فعّل Open Beauty Facts أو أدخل المكونات يدويًا.',
    };
  }

  try {
    const fields = [
      'product_name',
      'product_name_ar',
      'brands',
      'quantity',
      'ingredients_text',
      'ingredients_text_ar',
    ];
    const { product } = await fetchProduct('https://world.openbeautyfacts.org', barcode, fields);
    if (!product) {
      return {
        ok: false,
        validation,
        message_ar: 'لم يُعثر على المنتج في Open Beauty Facts. يمكنك إدخال المكونات يدويًا.',
      };
    }

    const result: BarcodeImportResult = {
      ok: true,
      needsReview: true,
      message_ar:
        'استُوردت البيانات الخام فقط من Open Beauty Facts. لا تُستورد أي درجات أو تصنيفات خارجية، ويمكنك تعديل القائمة قبل التقييم.',
      source: 'open_beauty_facts',
      barcode,
      validation,
      name: String(product.product_name_ar || product.product_name || ''),
      brand: String(product.brands || ''),
      packageSize: String(product.quantity || ''),
      ingredientsText: String(product.ingredients_text_ar || product.ingredients_text || ''),
    };

    await putCachedProduct({
      kind: 'cosmetics',
      barcode,
      name: result.name ?? '',
      brand: result.brand ?? '',
      ingredientsText: result.ingredientsText ?? '',
      source: 'open_beauty_facts',
      fetched_at: new Date().toISOString(),
    });

    return result;
  } catch {
    return {
      ok: false,
      validation,
      message_ar:
        'تعذّر الاتصال بقاعدة Open Beauty Facts. المنصة تعمل دون اتصال؛ أدخل المكونات يدويًا أو حاول لاحقًا.',
    };
  }
}
