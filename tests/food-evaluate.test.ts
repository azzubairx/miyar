import { describe, expect, it } from 'vitest';
import { evaluateFood } from '../src/lib/food/evaluate';
import { foodAdditives, meta } from '../src/database';
import type { KnowledgeEntry } from '../src/types';
import { makeFoodProduct } from './helpers';

const evaluate = (overrides = {}) =>
  evaluateFood(makeFoodProduct(overrides), foodAdditives, meta.version);

const eNumber = (entry: KnowledgeEntry | undefined) =>
  entry && entry.kind === 'food_additive' ? entry.e_number : undefined;

describe('food additive matching and alerts', () => {
  it('detects tartrazine by E number and exposes its ADI without claiming exposure', () => {
    const result = evaluate({ ingredientsText: 'ماء، سكر، ملون (E102)، حامض ستريك' });
    expect(result.additives).toHaveLength(1);
    expect(eNumber(result.additives[0].entry)).toBe('E 102');
    const adiAlert = result.alerts.find((alert) => alert.id.startsWith('adi-'));
    expect(adiAlert).toBeDefined();
    expect(adiAlert?.message_ar).toContain('لا تحسب المنصة التعرض الفعلي');
  });

  it('detects an additive by its English name', () => {
    const result = evaluate({ ingredientsText: 'Water, sugar, Tartrazine, citric acid' });
    expect(result.additives.some((item) => eNumber(item.entry) === 'E 102')).toBe(true);
  });

  it('flags titanium dioxide E171 as prohibited', () => {
    const result = evaluate({ ingredientsText: 'سكر، E171، نشاء' });
    const alert = result.alerts.find((item) => item.severity === 'regulatory');
    expect(alert?.title_ar).toContain('E 171');
    expect(alert?.title_ar).toContain('محظورة');
    expect(alert?.message_ar).toContain('لم يعد مسموحًا');
  });

  it('expands the sulphite E 220–E 228 range', () => {
    const result = evaluate({ ingredientsText: 'عصير، E223 (ميتابيسلفيت الصوديوم)' });
    expect(result.additives.some((item) => eNumber(item.entry) === 'E 220–E 228')).toBe(true);
  });

  it('keeps unmatched ingredients instead of treating them as safe', () => {
    const result = evaluate({ ingredientsText: 'ماء، سكر، مادة غامضة' });
    expect(result.unknownIngredients).toContain('مادة غامضة');
    expect(result.alerts.some((alert) => alert.id === 'no-additives-matched')).toBe(true);
  });
});

describe('food data completeness and conversions', () => {
  it('reports incomplete data and refuses a score', () => {
    const result = evaluate({
      nutrition: {
        energy_kj: 459,
        fat_saturated_g: null,
        sugars_total_g: null,
        sodium_mg: 0.1,
        fruit_veg_nuts_percent: 8,
        fibre_g: 0.6,
        fibre_type: 'AOAC',
        protein_g: 6.5,
      },
    });
    expect(result.completeness.level).toBe('partial');
    expect(result.completeness.missing_ar).toContain('الدهون المشبعة');
    expect(result.npm.score).toBeNull();
    expect(result.alerts.some((alert) => alert.id === 'npm-not-applicable')).toBe(true);
  });

  it('adds a conversion note when salt is used instead of sodium', () => {
    const result = evaluate({
      nutrition: {
        energy_kj: 459,
        fat_saturated_g: 1.8,
        sugars_total_g: 13.4,
        sodium_mg: null,
        salt_g: 0.25,
        fruit_veg_nuts_percent: 8,
        fibre_g: 0.6,
        fibre_type: 'AOAC',
        protein_g: 6.5,
      },
    });
    expect(result.alerts.some((alert) => alert.message_ar.includes('حُوّل الملح إلى صوديوم'))).toBe(true);
    expect(result.completeness.percent).toBe(100);
  });

  it('warns when fibre type is not specified', () => {
    const result = evaluate({
      nutrition: {
        energy_kj: 459,
        fat_saturated_g: 1.8,
        sugars_total_g: 13.4,
        sodium_mg: 0.1,
        fruit_veg_nuts_percent: 8,
        fibre_g: 0.6,
        fibre_type: null,
        protein_g: 6.5,
      },
    });
    expect(result.alerts.some((alert) => alert.id === 'fibre-type-default')).toBe(true);
  });

  it('marks a drink using the drink threshold', () => {
    const result = evaluate({
      productType: 'drink',
      nutrition: {
        energy_kj: 184,
        fat_saturated_g: 0,
        sugars_total_g: 10.3,
        sodium_mg: 0,
        fruit_veg_nuts_percent: 15,
        fibre_g: 0,
        fibre_type: 'AOAC',
        protein_g: 0.1,
      },
    });
    expect(result.npm.score).toBe(2);
    expect(result.npm.classification).toBe('less_healthy');
  });
});
