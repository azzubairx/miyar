import type { FoodNutritionInput } from '../types';

export interface BarcodeImportResult {
  ok: boolean;
  message_ar: string;
  source?: 'open_food_facts' | 'open_beauty_facts';
  barcode?: string;
  name?: string;
  brand?: string;
  ingredientsText?: string;
  nutrition?: Partial<FoodNutritionInput>;
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value.trim());
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

export async function importFoodBarcode(barcodeInput: string): Promise<BarcodeImportResult> {
  const barcode = barcodeInput.trim();
  if (!isBarcode(barcode)) {
    return { ok: false, message_ar: 'أدخل باركودًا رقميًا من 8 إلى 14 رقمًا.' };
  }

  try {
    const fields = [
      'product_name',
      'product_name_ar',
      'brands',
      'ingredients_text',
      'ingredients_text_ar',
      'nutriments',
    ].join(',');
    const data = (await fetchJson(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`,
    )) as {
      status?: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      return {
        ok: false,
        message_ar: 'لم يُعثر على المنتج في Open Food Facts. يمكنك إدخال البيانات يدويًا.',
      };
    }

    const product = data.product;
    const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
    const nutrition: Partial<FoodNutritionInput> = {
      energy_kj: toNumber(nutriments['energy-kj_100g']),
      energy_kcal: toNumber(nutriments['energy-kcal_100g']),
      fat_saturated_g: toNumber(nutriments['saturated-fat_100g']),
      sugars_total_g: toNumber(nutriments['sugars_100g']),
      fibre_g: toNumber(nutriments['fiber_100g']),
      protein_g: toNumber(nutriments['proteins_100g']),
      sodium_mg: toNumber(nutriments['sodium_100g']) !== null ? (toNumber(nutriments['sodium_100g']) as number) * 1000 : null,
      salt_g: toNumber(nutriments['salt_100g']),
      fruit_veg_nuts_percent: toNumber(nutriments['fruits-vegetables-nuts-estimate-from-ingredients_100g']),
    };

    return {
      ok: true,
      message_ar:
        'استُوردت الحقول الخام فقط من Open Food Facts. لم تُستورد أي درجة أو تصنيف خارجي، ويمكنك تعديل كل قيمة قبل التقييم.',
      source: 'open_food_facts',
      barcode,
      name: String(product.product_name_ar || product.product_name || ''),
      brand: String(product.brands || ''),
      ingredientsText: String(product.ingredients_text_ar || product.ingredients_text || ''),
      nutrition,
    };
  } catch {
    return {
      ok: false,
      message_ar:
        'تعذّر الاتصال بقاعدة Open Food Facts. المنصة تعمل دون اتصال؛ أدخل البيانات يدويًا أو حاول لاحقًا.',
    };
  }
}

export async function importCosmeticsBarcode(barcodeInput: string): Promise<BarcodeImportResult> {
  const barcode = barcodeInput.trim();
  if (!isBarcode(barcode)) {
    return { ok: false, message_ar: 'أدخل باركودًا رقميًا من 8 إلى 14 رقمًا.' };
  }

  try {
    const fields = ['product_name', 'product_name_ar', 'brands', 'ingredients_text', 'ingredients_text_ar'].join(',');
    const data = (await fetchJson(
      `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json?fields=${fields}`,
    )) as {
      status?: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      return {
        ok: false,
        message_ar: 'لم يُعثر على المنتج في Open Beauty Facts. يمكنك إدخال المكونات يدويًا.',
      };
    }

    const product = data.product;
    return {
      ok: true,
      message_ar:
        'استُوردت البيانات الخام فقط من Open Beauty Facts. لا تُستورد أي درجات أو تصنيفات خارجية، ويمكنك تعديل القائمة قبل التقييم.',
      source: 'open_beauty_facts',
      barcode,
      name: String(product.product_name_ar || product.product_name || ''),
      brand: String(product.brands || ''),
      ingredientsText: String(product.ingredients_text_ar || product.ingredients_text || ''),
    };
  } catch {
    return {
      ok: false,
      message_ar:
        'تعذّر الاتصال بقاعدة Open Beauty Facts. المنصة تعمل دون اتصال؛ أدخل المكونات يدويًا أو حاول لاحقًا.',
    };
  }
}
