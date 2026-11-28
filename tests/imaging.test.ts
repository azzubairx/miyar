import { describe, expect, it } from 'vitest';
import {
  barcodeDigits,
  expandUpcE,
  formatFromDecoder,
  gs1CheckDigit,
  validateBarcode,
} from '../src/lib/imaging/barcode-format';
import { parseIngredients } from '../src/lib/imaging/ingredients';
import { isNutritionRowText, parseNutritionLabel } from '../src/lib/imaging/nutrition';
import { describeCameraError } from '../src/lib/imaging/useCamera';
import type { OcrLine } from '../src/lib/imaging/types';

function line(text: string, confidence = 92, words: OcrLine['words'] = []): OcrLine {
  return { text, confidence, words };
}

describe('nutrition label parser', () => {
  it('parses an Arabic per-100g label with Arabic-Indic digits and decimal commas', () => {
    const result = parseNutritionLabel(
      [
        'القيم الغذائية',
        'لكل ١٠٠ غ',
        'الطاقة ١٥٠٠ كج / ٣٥٩ ككال',
        'الدهون الكلية ١٠ غ',
        'منها دهون مشبعة ٢,٥ غ',
        'الكربوهيدرات ٦٠ غ',
        'منها سكريات ٢٠ غ',
        'الألياف ٣ غ',
        'البروتين ٨ غ',
        'الملح ٠,٨ غ',
      ].join('\n'),
    );

    expect(result.basis).toBe('100g');
    expect(result.fields.energy_kj?.value).toBe(1500);
    expect(result.fields.energy_kcal?.value).toBe(359);
    expect(result.fields.fat_total_g?.value).toBe(10);
    expect(result.fields.fat_saturated_g?.value).toBe(2.5);
    expect(result.fields.carbohydrates_g?.value).toBe(60);
    expect(result.fields.sugars_total_g?.value).toBe(20);
    expect(result.fields.fibre_g?.value).toBe(3);
    expect(result.fields.protein_g?.value).toBe(8);
    expect(result.fields.salt_g?.value).toBe(0.8);
    expect(result.convertedFromServing).toBe(false);
  });

  it('chooses the per-100 column when two numeric columns are present', () => {
    const lines: OcrLine[] = [
      line('Nutrition facts Per 100 g Per serving', 95, [
        { text: 'Per', confidence: 95, x0: 20, y0: 0, x1: 50, y1: 12 },
        { text: '100', confidence: 95, x0: 55, y0: 0, x1: 85, y1: 12 },
        { text: 'g', confidence: 95, x0: 88, y0: 0, x1: 96, y1: 12 },
        { text: 'Per', confidence: 95, x0: 360, y0: 0, x1: 390, y1: 12 },
        { text: 'serving', confidence: 95, x0: 395, y0: 0, x1: 450, y1: 12 },
      ]),
      line('Energy 1000 kJ 240 kcal', 94, [
        { text: 'Energy', confidence: 94, x0: 10, y0: 20, x1: 70, y1: 32 },
        { text: '1000', confidence: 94, x0: 80, y0: 20, x1: 115, y1: 32 },
        { text: 'kJ', confidence: 94, x0: 120, y0: 20, x1: 140, y1: 32 },
        { text: '240', confidence: 94, x0: 370, y0: 20, x1: 395, y1: 32 },
        { text: 'kcal', confidence: 94, x0: 400, y0: 20, x1: 430, y1: 32 },
      ]),
      line('Fat 10 g 4 g', 94, [
        { text: 'Fat', confidence: 94, x0: 10, y0: 40, x1: 40, y1: 52 },
        { text: '10', confidence: 94, x0: 82, y0: 40, x1: 100, y1: 52 },
        { text: 'g', confidence: 94, x0: 104, y0: 40, x1: 112, y1: 52 },
        { text: '4', confidence: 94, x0: 374, y0: 40, x1: 386, y1: 52 },
        { text: 'g', confidence: 94, x0: 390, y0: 40, x1: 398, y1: 52 },
      ]),
      line('Sugars 20 g 8 g', 94, [
        { text: 'Sugars', confidence: 94, x0: 10, y0: 60, x1: 60, y1: 72 },
        { text: '20', confidence: 94, x0: 82, y0: 60, x1: 100, y1: 72 },
        { text: 'g', confidence: 94, x0: 104, y0: 60, x1: 112, y1: 72 },
        { text: '8', confidence: 94, x0: 374, y0: 60, x1: 386, y1: 72 },
        { text: 'g', confidence: 94, x0: 390, y0: 60, x1: 398, y1: 72 },
      ]),
    ];
    const result = parseNutritionLabel(lines.map((item) => item.text).join('\n'), lines, 94);

    expect(result.basis).toBe('100g');
    expect(result.fields.energy_kj?.value).toBe(1000);
    expect(result.fields.energy_kcal).toBeUndefined();
    expect(result.fields.fat_total_g?.value).toBe(10);
    expect(result.fields.sugars_total_g?.value).toBe(20);
    expect(result.fields.fat_total_g?.needsReview).toBe(false);
  });

  it('converts per-serving values when serving size is readable', () => {
    const result = parseNutritionLabel(
      [
        'Nutrition facts',
        'Per serving',
        'Serving size 30 g',
        'Energy 120 kcal',
        'Fat 3 g',
        'Saturated fat 1 g',
        'Sugars 9 g',
        'Protein 2 g',
        'Salt 0.2 g',
      ].join('\n'),
    );

    expect(result.basis).toBe('100g');
    expect(result.convertedFromServing).toBe(true);
    expect(result.servingSize).toEqual({ value: 30, unit: 'g', raw: 'Serving size 30 g' });
    expect(result.fields.energy_kcal?.value).toBe(400);
    expect(result.fields.fat_total_g?.value).toBe(10);
    expect(result.fields.sugars_total_g?.value).toBe(30);
    expect(result.fields.salt_g?.value).toBeCloseTo(0.6667, 3);
    expect(result.warnings_ar.some((warning) => warning.includes('حُوّلت'))).toBe(true);
  });

  it('normalizes sodium from grams and salt from milligrams', () => {
    const result = parseNutritionLabel(
      ['Per 100 g', 'Sodium 0.2 g', 'Salt 500 mg'].join('\n'),
    );
    expect(result.fields.sodium_mg?.value).toBe(200);
    expect(result.fields.salt_g?.value).toBe(0.5);
  });

  it('does not invent a value when the unit is missing', () => {
    const result = parseNutritionLabel(['Per 100 g', 'Protein 8'].join('\n'));
    expect(result.fields.protein_g?.value).toBe(8);
    expect(result.fields.protein_g?.needsReview).toBe(true);
    expect(result.warnings_ar.length).toBeGreaterThan(0);
  });

  it('parses merged label/value tokens such as Salt0.8g and Protein8g', () => {
    const result = parseNutritionLabel(['Per100g', 'Salt0.8g', 'Protein8g'].join('\n'));
    expect(result.basis).toBe('100g');
    expect(result.fields.salt_g?.value).toBe(0.8);
    expect(result.fields.protein_g?.value).toBe(8);
  });

  it('distinguishes nutrition rows from ingredient lines in a shared photo', () => {
    expect(isNutritionRowText('Sugars 20 g')).toBe(true);
    expect(isNutritionRowText('Per 100 g')).toBe(true);
    expect(isNutritionRowText('Energy 1500 kJ / 359 kcal')).toBe(true);
    expect(isNutritionRowText('Water, Sugar, Wheat flour')).toBe(false);
    expect(isNutritionRowText('Colour (E102), Preservative (E211), Milk')).toBe(false);
  });
});

describe('ingredients parser', () => {
  it('preserves order, parentheses and E-numbers in an Arabic food list', () => {
    const result = parseIngredients(
      'المكونات: ماء، سكر، دقيق قمح، ملون (E102)، حافظة (E211)، حليب',
    );
    expect(result.items.map((item) => item.raw)).toEqual([
      'ماء',
      'سكر',
      'دقيق قمح',
      'ملون (E102)',
      'حافظة (E211)',
      'حليب',
    ]);
    expect(result.items[3].eNumbers).toEqual(['e102']);
    expect(result.items[4].eNumbers).toEqual(['e211']);
    expect(result.items[3].parenthetical).toEqual(['E102']);
    expect(result.warnings_ar.some((warning) => warning.includes('حليب'))).toBe(true);
  });

  it('keeps INCI compounds and does not infer concentrations', () => {
    const result = parseIngredients(
      'Ingredients: Aqua, Sodium Laureth Sulfate, Methylchloroisothiazolinone (and) Methylisothiazolinone, Parfum',
      [],
      'cosmetics',
    );
    expect(result.items).toHaveLength(4);
    expect(result.items[2].raw).toBe(
      'Methylchloroisothiazolinone (and) Methylisothiazolinone',
    );
    expect(result.items[2].parenthetical).toEqual(['and']);
    expect(result.items.some((item) => 'concentration' in item)).toBe(false);
  });

  it('flags low-confidence OCR items for review', () => {
    const lines: OcrLine[] = [line('Aqua, Glycerin, Parfum', 42)];
    const result = parseIngredients('Aqua, Glycerin, Parfum', lines, 'cosmetics', 42);
    expect(result.items.every((item) => item.needsReview)).toBe(true);
    expect(result.warnings_ar.some((warning) => warning.includes('منخفضة'))).toBe(true);
  });

  it('ignores list prefixes and bullet characters', () => {
    const result = parseIngredients('Ingredients:\n- Aqua\n- Glycerin\n• Parfum');
    expect(result.items.map((item) => item.raw)).toEqual(['Aqua', 'Glycerin', 'Parfum']);
  });
});

describe('barcode format validation', () => {
  it('validates EAN-13, EAN-8 and UPC-A check digits', () => {
    expect(validateBarcode('4006381333931')).toMatchObject({
      format: 'EAN-13',
      valid: true,
      checkDigit: 1,
    });
    expect(validateBarcode('96385074')).toMatchObject({ format: 'EAN-8', valid: true });
    expect(validateBarcode('036000291452')).toMatchObject({
      format: 'UPC-A',
      valid: true,
      digits: '036000291452',
    });
  });

  it('preserves leading zeros and converts Arabic digits', () => {
    expect(barcodeDigits('٠٣٦٠٠٠٢٩١٤٥٢')).toBe('036000291452');
    expect(validateBarcode('٠٣٦٠٠٠٢٩١٤٥٢').digits).toBe('036000291452');
  });

  it('rejects a wrong check digit', () => {
    expect(validateBarcode('4006381333930').valid).toBe(false);
  });

  it('computes the GS1 check digit', () => {
    expect(gs1CheckDigit('400638133393')).toBe(1);
    expect(gs1CheckDigit('9638507')).toBe(4);
  });

  it('expands and validates UPC-E without dropping zeros', () => {
    const expanded = expandUpcE('04210005');
    expect(expanded).toHaveLength(12);
    expect(expanded?.startsWith('0')).toBe(true);
    expect(validateBarcode('04210005', 'UPCE').format).toBe('UPC-E');
    expect(validateBarcode(expanded ?? '', 'UPCA').valid).toBe(true);
  });

  it('validates GTIN-14 and maps decoder names', () => {
    expect(validateBarcode('10012345678902').format).toBe('GTIN-14');
    expect(validateBarcode('10012345678902').valid).toBe(true);
    expect(formatFromDecoder('EAN13')).toBe('EAN-13');
    expect(formatFromDecoder('ITF14')).toBe('GTIN-14');
    expect(formatFromDecoder('QRCode')).toBeNull();
  });

  it('reports unsupported lengths clearly', () => {
    const result = validateBarcode('12345');
    expect(result.valid).toBe(false);
    expect(result.message_ar).toContain('غير مدعوم');
  });
});

describe('camera error messages', () => {
  const errorWith = (name: string) => Object.assign(new Error(name), { name });

  it('explains a denied permission and points to the gallery', () => {
    const message = describeCameraError(errorWith('NotAllowedError'));
    expect(message).toContain('لم يُسمح');
    expect(message).toContain('المعرض');
  });

  it('explains a missing camera without pretending it works', () => {
    expect(describeCameraError(errorWith('NotFoundError'))).toContain('لم نجد كاميرا');
    expect(describeCameraError(errorWith('OverconstrainedError'))).toContain('لم نجد كاميرا');
  });

  it('explains a camera busy in another app', () => {
    expect(describeCameraError(errorWith('NotReadableError'))).toContain('مشغولة');
  });

  it('falls back to a neutral message for unknown failures', () => {
    expect(describeCameraError(null)).toContain('تعذّر تشغيل الكاميرا');
  });
});
