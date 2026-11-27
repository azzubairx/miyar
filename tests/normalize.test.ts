import { describe, expect, it } from 'vitest';
import {
  canonicalENumber,
  cosmeticAliasKey,
  eNumberAliases,
  normalizeText,
  normalizeWithENumbers,
  splitIngredientList,
  stripCiParenthetical,
} from '../src/lib/normalize';

describe('normalization', () => {
  it('normalizes Arabic letters, diacritics and digits', () => {
    expect(normalizeText('أَحْمَدٌ')).toBe('احمد');
    expect(normalizeText('مُسْتَحْضَر')).toBe('مستحضر');
    expect(normalizeText('فيتامين أ ٢٠٢٦')).toBe('فيتامين ا 2026');
  });

  it('normalizes English case and punctuation', () => {
    expect(normalizeText('  Titanium-Dioxide (CI 77891)  ')).toBe('titanium dioxide ci 77891');
  });

  it('canonicalizes E numbers', () => {
    expect(canonicalENumber('E 102')).toBe('e102');
    expect(canonicalENumber('e-102')).toBe('e102');
    expect(canonicalENumber('E102')).toBe('e102');
  });

  it('expands E-number ranges', () => {
    expect(eNumberAliases('E 220–E 228')).toEqual([
      'e220',
      'e221',
      'e222',
      'e223',
      'e224',
      'e225',
      'e226',
      'e227',
      'e228',
    ]);
    expect(eNumberAliases('E 102')).toEqual(['e102']);
  });

  it('normalizes E numbers inside free text', () => {
    expect(normalizeWithENumbers('ملون (E 102) وحافظة E-211')).toContain('e102');
    expect(normalizeWithENumbers('ملون (E 102) وحافظة E-211')).toContain('e211');
  });
});

describe('ingredient list splitting', () => {
  it('splits on commas, semicolons, Arabic commas and newlines', () => {
    const result = splitIngredientList('Aqua, Glycerin; Parfum\nLimonene، Linalool');
    expect(result.map((item) => item.raw)).toEqual(['Aqua', 'Glycerin', 'Parfum', 'Limonene', 'Linalool']);
  });

  it('respects parentheses', () => {
    const result = splitIngredientList('Titanium Dioxide (CI 77891, nano), Aqua');
    expect(result).toHaveLength(2);
    expect(result[0].raw).toBe('Titanium Dioxide (CI 77891, nano)');
  });

  it('extracts a trailing percentage without inventing one', () => {
    const result = splitIngredientList('Triclosan 0.3%, Aqua 70 %');
    expect(result[0]).toEqual({ raw: 'Triclosan', concentration: 0.3 });
    expect(result[1]).toEqual({ raw: 'Aqua', concentration: 70 });
    expect(splitIngredientList('Aqua')[0].concentration).toBeNull();
  });

  it('handles decimal commas', () => {
    expect(splitIngredientList('Triclosan 0,3%')[0].concentration).toBe(0.3);
  });
});

describe('cosmetic aliases and CI parentheses', () => {
  it('maps common aliases', () => {
    expect(cosmeticAliasKey('sodium methylparaben')).toBe('methylparaben');
    expect(cosmeticAliasKey('vitamin a')).toBe('retinol');
    expect(cosmeticAliasKey('bha')).toBe('salicylic acid');
  });

  it('strips CI parentheticals only', () => {
    expect(stripCiParenthetical('Titanium Dioxide (CI 77891)')).toBe('Titanium Dioxide');
    expect(stripCiParenthetical('Parfum (Fragrance)')).toBe('Parfum (Fragrance)');
  });
});
