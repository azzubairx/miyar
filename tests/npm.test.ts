import { describe, expect, it } from 'vitest';
import {
  evaluateNpm,
  fibrePoints,
  fruitVegNutsPoints,
  pointsAboveThresholds,
  proteinPoints,
} from '../src/lib/food/npm';
import { makeFoodProduct } from './helpers';

describe('FSA NPM point thresholds', () => {
  it('grants points only above the threshold, not at it', () => {
    expect(pointsAboveThresholds(335, [335, 670])).toBe(0);
    expect(pointsAboveThresholds(335.1, [335, 670])).toBe(1);
    expect(pointsAboveThresholds(670, [335, 670])).toBe(1);
    expect(pointsAboveThresholds(670.1, [335, 670])).toBe(2);
  });

  it('uses the official fruit, vegetable and nut point bands', () => {
    expect(fruitVegNutsPoints(0)).toBe(0);
    expect(fruitVegNutsPoints(40)).toBe(0);
    expect(fruitVegNutsPoints(40.1)).toBe(1);
    expect(fruitVegNutsPoints(60)).toBe(1);
    expect(fruitVegNutsPoints(60.1)).toBe(2);
    expect(fruitVegNutsPoints(80)).toBe(2);
    expect(fruitVegNutsPoints(80.1)).toBe(5);
  });

  it('uses different fibre thresholds for NSP and AOAC', () => {
    expect(fibrePoints(0.7, 'NSP')).toBe(0);
    expect(fibrePoints(0.8, 'NSP')).toBe(1);
    expect(fibrePoints(0.9, 'AOAC')).toBe(0);
    expect(fibrePoints(1.0, 'AOAC')).toBe(1);
    expect(fibrePoints(4.7, 'AOAC')).toBe(4);
    expect(fibrePoints(4.8, 'AOAC')).toBe(5);
  });

  it('uses the official protein thresholds', () => {
    expect(proteinPoints(1.6)).toBe(0);
    expect(proteinPoints(1.7)).toBe(1);
    expect(proteinPoints(8.1)).toBe(5);
  });
});

describe('FSA NPM worked examples', () => {
  it('worked example 1: fruit fromage frais scores 0', () => {
    const { npm } = evaluateNpm(makeFoodProduct());
    expect(npm.applicable).toBe(true);
    expect(npm.aPoints).toBe(4);
    expect(npm.cPoints).toBe(4);
    expect(npm.score).toBe(0);
    expect(npm.classification).toBe('not_classified_less_healthy');
  });

  it('worked example 2: vanilla ice cream scores 12 and excludes protein', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: 741,
          fat_saturated_g: 6.1,
          sugars_total_g: 18.7,
          sodium_mg: 60,
          fruit_veg_nuts_percent: 0,
          fibre_g: 0,
          fibre_type: 'NSP',
          protein_g: 3.6,
        },
      }),
    );
    expect(npm.aPoints).toBe(12);
    expect(npm.cPoints).toBe(0);
    expect(npm.score).toBe(12);
    expect(npm.protein_excluded).toBe(true);
    expect(npm.classification).toBe('less_healthy');
  });

  it('worked example 3: reconstituted milkshake scores 0', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        productType: 'drink',
        nutrition: {
          energy_kj: 299,
          fat_saturated_g: 1.0,
          sugars_total_g: 8.9,
          sodium_mg: 41,
          fruit_veg_nuts_percent: 0,
          fibre_g: 0.5,
          fibre_type: 'AOAC',
          protein_g: 3.2,
        },
      }),
    );
    expect(npm.aPoints).toBe(1);
    expect(npm.cPoints).toBe(1);
    expect(npm.score).toBe(0);
    expect(npm.classification).toBe('not_classified_less_healthy');
  });

  it('worked example 4: cup soup scores 5', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: 155,
          fat_saturated_g: 0.4,
          sugars_total_g: 3.6,
          sodium_mg: 471,
          fruit_veg_nuts_percent: 0,
          fibre_g: 0.2,
          fibre_type: 'AOAC',
          protein_g: 0.3,
        },
      }),
    );
    expect(npm.aPoints).toBe(5);
    expect(npm.cPoints).toBe(0);
    expect(npm.score).toBe(5);
    expect(npm.classification).toBe('less_healthy');
  });

  it('worked example 5: fruit and nut cereal bar scores 6', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: 1504,
          fat_saturated_g: 1.4,
          sugars_total_g: 35.7,
          sodium_mg: 0,
          fruit_veg_nuts_percent: 46,
          fibre_g: 4.8,
          fibre_type: 'AOAC',
          protein_g: 4.3,
        },
      }),
    );
    expect(npm.aPoints).toBe(12);
    expect(npm.cPoints).toBe(6);
    expect(npm.score).toBe(6);
    expect(npm.protein_excluded).toBe(true);
    expect(npm.classification).toBe('less_healthy');
  });

  it('worked example 6: fruit juice drink scores 2 and is classified for drinks', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
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
      }),
    );
    expect(npm.aPoints).toBe(2);
    expect(npm.cPoints).toBe(0);
    expect(npm.score).toBe(2);
    expect(npm.classification).toBe('less_healthy');
  });
});

describe('NPM conversions and missing data', () => {
  it('converts kcal to kJ', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: null,
          energy_kcal: 100,
          fat_saturated_g: 0,
          sugars_total_g: 0,
          sodium_mg: 0,
          fruit_veg_nuts_percent: 0,
          fibre_g: 0,
          fibre_type: 'NSP',
          protein_g: 0,
        },
      }),
    );
    expect(npm.breakdown.energy).toBe(1);
  });

  it('converts salt to sodium', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: 0,
          fat_saturated_g: 0,
          sugars_total_g: 0,
          sodium_mg: null,
          salt_g: 0.25,
          fruit_veg_nuts_percent: 0,
          fibre_g: 0,
          fibre_type: 'NSP',
          protein_g: 0,
        },
      }),
    );
    // 0.25 g salt = 100 mg sodium, which is > 90 and earns 1 point.
    expect(npm.breakdown.sodium).toBe(1);
  });

  it('does not compute a score when a required field is missing', () => {
    const { npm } = evaluateNpm(
      makeFoodProduct({
        nutrition: {
          energy_kj: 459,
          fat_saturated_g: null,
          sugars_total_g: 13.4,
          sodium_mg: 0.1,
          fruit_veg_nuts_percent: 8,
          fibre_g: 0.6,
          fibre_type: 'AOAC',
          protein_g: 6.5,
        },
      }),
    );
    expect(npm.applicable).toBe(false);
    expect(npm.score).toBeNull();
    expect(npm.classification).toBe('not_applicable');
  });
});
