import { describe, expect, it } from 'vitest';
import { evaluateCosmetics } from '../src/lib/cosmetics/evaluate';
import { cosmeticIngredients, meta } from '../src/database';
import type { CosmeticsProductInput } from '../src/types';

function makeProduct(overrides: Partial<CosmeticsProductInput> = {}): CosmeticsProductInput {
  return {
    name: 'منتج اختبار',
    brand: 'علامة اختبار',
    productType: 'face-cream',
    category: '',
    application: 'leave-on',
    area: 'face',
    ingredientsText: '',
    concentrations: {},
    warnings: '',
    ...overrides,
  };
}

const evaluate = (overrides: Partial<CosmeticsProductInput> = {}) =>
  evaluateCosmetics(makeProduct(overrides), cosmeticIngredients, meta.version);

describe('cosmetics prohibited and restricted substances', () => {
  it('flags formaldehyde as prohibited', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Glycerin, Formaldehyde' });
    expect(result.counts.prohibited).toBe(1);
    expect(result.ingredients[2].regulatory_label_ar).toBe('محظور');
    expect(result.alerts[0].severity).toBe('regulatory');
  });

  it('treats hydroquinone outside artificial nails as prohibited', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Hydroquinone', concentrations: { Hydroquinone: 1 } });
    expect(result.ingredients[1].regulatory_label_ar).toBe('محظور');
  });

  it('checks triclosan against the 0.3% limit in hand soap', () => {
    const base = {
      productType: 'hand-soap',
      application: 'rinse-off' as const,
      area: 'other',
      ingredientsText: 'Aqua, Triclosan',
    };
    const within = evaluate({ ...base, concentrations: { Triclosan: 0.2 } });
    expect(within.ingredients[1].regulatory_label_ar).toBe('مادة حافظة مسموحة');
    expect(within.ingredients[1].applied_limits[0].result).toBe('within_limit');

    const exceeds = evaluate({ ...base, concentrations: { Triclosan: 0.5 } });
    expect(exceeds.ingredients[1].regulatory_label_ar).toBe('يتجاوز حدًا تنظيميًا');
    expect(exceeds.ingredients[1].severity).toBe('regulatory');
  });

  it('flags triclosan as not permitted in a face cream category', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Triclosan', concentrations: { Triclosan: 0.1 } });
    expect(result.ingredients[1].regulatory_label_ar).toBe('غير مسموح في هذه الفئة');
    expect(result.ingredients[1].severity).toBe('regulatory');
  });

  it('rejects methylisothiazolinone in leave-on products', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Methylisothiazolinone', concentrations: { Methylisothiazolinone: 0.001 } });
    expect(result.ingredients[1].regulatory_label_ar).toBe('غير مسموح في هذه الفئة');
    expect(result.ingredients[1].severity).toBe('regulatory');
  });

  it('accepts methylisothiazolinone at 0.0015% in rinse-off products', () => {
    const result = evaluate({
      productType: 'shampoo',
      application: 'rinse-off',
      area: 'hair',
      ingredientsText: 'Aqua, Methylisothiazolinone',
      concentrations: { Methylisothiazolinone: 0.0015 },
    });
    expect(result.ingredients[1].regulatory_label_ar).toBe('مادة حافظة مسموحة');
    expect(result.ingredients[1].applied_limits[0].result).toBe('within_limit');
  });

  it('uses the most specific salicylic acid limit for body lotion', () => {
    const result = evaluate({
      productType: 'body-lotion',
      area: 'body',
      ingredientsText: 'Aqua, Salicylic Acid',
      concentrations: { 'Salicylic Acid': 0.8 },
    });
    const applied = result.ingredients[1].applied_limits;
    expect(applied[0].limit.value).toBe(0.5);
    expect(applied[0].result).toBe('exceeds_limit');
  });

  it('accepts salicylic acid 2.5% in a rinse-off shampoo', () => {
    const result = evaluate({
      productType: 'shampoo',
      application: 'rinse-off',
      area: 'hair',
      ingredientsText: 'Aqua, Salicylic Acid',
      concentrations: { 'Salicylic Acid': 2.5 },
    });
    expect(result.ingredients[1].applied_limits[0].limit.value).toBe(3);
    expect(result.ingredients[1].applied_limits[0].result).toBe('within_limit');
  });

  it('flags retinol above the body lotion limit', () => {
    const result = evaluate({
      productType: 'body-lotion',
      area: 'body',
      ingredientsText: 'Aqua, Retinol',
      concentrations: { Retinol: 0.1 },
    });
    expect(result.ingredients[1].regulatory_label_ar).toBe('يتجاوز حدًا تنظيميًا');
  });
});

describe('fragrance allergen labelling', () => {
  it('applies the leave-on labelling threshold below the limit', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Limonene', concentrations: { Limonene: 0.0005 } });
    const ingredient = result.ingredients[1];
    expect(ingredient.regulatory_label_ar).toBe('وسم إلزامي');
    expect(ingredient.severity).toBe('info');
    expect(ingredient.applied_limits[0].result).toBe('within_limit');
  });

  it('flags a leave-on concentration above 0.001%', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Limonene', concentrations: { Limonene: 0.01 } });
    const ingredient = result.ingredients[1];
    expect(ingredient.regulatory_label_ar).toBe('وسم إلزامي');
    expect(ingredient.severity).toBe('attention');
    expect(ingredient.applied_limits[0].result).toBe('exceeds_limit');
  });

  it('cannot verify labelling without a concentration', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Limonene' });
    const ingredient = result.ingredients[1];
    expect(ingredient.regulatory_label_ar).toBe('وسم إلزامي — تركيز غير معروف');
    expect(ingredient.severity).toBe('attention');
  });
});

describe('cosmetics matching and honesty about unknowns', () => {
  it('maps sodium methylparaben to methylparaben', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Sodium Methylparaben', concentrations: { 'Sodium Methylparaben': 0.2 } });
    expect(result.ingredients[1].entry?.id).toBe('COS-ING-0016');
    expect(result.ingredients[1].matched).toBe(true);
  });

  it('matches the MCI/MI mixture by INCI name', () => {
    const result = evaluate({
      productType: 'shampoo',
      application: 'rinse-off',
      area: 'hair',
      ingredientsText: 'Aqua, Methylchloroisothiazolinone (and) Methylisothiazolinone',
      concentrations: { 'Methylchloroisothiazolinone (and) Methylisothiazolinone': 0.001 },
    });
    expect(result.ingredients[1].entry?.name_en).toBe(
      'Methylchloroisothiazolinone (and) Methylisothiazolinone',
    );
    expect(result.ingredients[1].applied_limits[0].result).toBe('within_limit');
  });

  it('never treats an unknown ingredient as safe', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Unobtainium Extract' });
    expect(result.unknownIngredients).toContain('Unobtainium Extract');
    expect(result.ingredients[1].severity).toBe('insufficient');
    expect(result.counts.unknown).toBe(1);
  });

  it('does not report water as an unknown ingredient or coverage gap', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Glycerin' });
    expect(result.ingredients[0].regulatory_label_ar).toBe('مكوّن أساسي');
    expect(result.unknownIngredients).not.toContain('Aqua');
    expect(result.alerts.some((alert) => alert.title_ar.includes('Aqua'))).toBe(false);
  });

  it('counts an unverifiable fragrance allergen in the labelling axis', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Limonene' });
    expect(result.counts.labelling).toBe(1);
  });

  it('does not produce a composite score', () => {
    const result = evaluate({ ingredientsText: 'Aqua, Glycerin' });
    expect('score' in result).toBe(false);
  });

  it('reports unknown concentration instead of assuming compliance', () => {
    const result = evaluate({
      productType: 'sunscreen',
      area: 'body',
      ingredientsText: 'Aqua, Titanium Dioxide',
    });
    const ingredient = result.ingredients[1];
    expect(ingredient.applied_limits.some((limit) => limit.result === 'concentration_unknown')).toBe(true);
    expect(ingredient.regulatory_label_ar).toBe('مرشح UV مسموح');
  });
});
