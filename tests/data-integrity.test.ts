import { describe, expect, it } from 'vitest';
import { cosmeticIngredients, foodAdditives, meta, references, referenceMap } from '../src/database';
import type { KnowledgeEntry } from '../src/types';

const allEntries: KnowledgeEntry[] = [...foodAdditives, ...cosmeticIngredients];

function collectRefs(entry: KnowledgeEntry): string[] {
  return [
    ...entry.regulatory_status.flatMap((status) => status.reference_ids),
    ...entry.limits.flatMap((limit) => limit.reference_ids),
    ...entry.scientific_assessment.flatMap((assessment) => assessment.reference_ids),
  ];
}

describe('knowledge base integrity', () => {
  it('has consistent metadata counts', () => {
    expect(meta.food_additives_count).toBe(foodAdditives.length);
    expect(meta.cosmetic_ingredients_count).toBe(cosmeticIngredients.length);
    expect(meta.references_count).toBe(references.length);
  });

  it('has unique IDs', () => {
    const ids = allEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const refIds = references.map((reference) => reference.id);
    expect(new Set(refIds).size).toBe(refIds.length);
  });

  it('resolves every referenced source', () => {
    const missing: string[] = [];
    for (const entry of allEntries) {
      for (const id of collectRefs(entry)) {
        if (!referenceMap.has(id)) missing.push(`${entry.id} -> ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('uses only http(s) URLs with document numbers', () => {
    for (const reference of references) {
      expect(reference.url, reference.id).toMatch(/^https?:\/\//);
      expect(reference.document_number.trim().length, reference.id).toBeGreaterThan(0);
      expect(reference.accessed, reference.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('does not leave placeholder text in the knowledge base', () => {
    const serialized = JSON.stringify(allEntries);
    expect(serialized).not.toMatch(/TODO|TBD|lorem ipsum|XXX/i);
  });

  it('has a scientific assessment reference where an opinion number is present', () => {
    for (const entry of allEntries) {
      for (const assessment of entry.scientific_assessment) {
        expect(assessment.reference_ids.length, `${entry.id} ${assessment.opinion_number}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('priority entries are present and correctly classified', () => {
  it('includes E171 as prohibited', () => {
    const e171 = foodAdditives.find((entry) => entry.e_number === 'E 171');
    expect(e171).toBeDefined();
    expect(e171?.regulatory_status.some((status) => status.status === 'prohibited')).toBe(true);
  });

  it('includes formaldehyde in Annex II', () => {
    const formaldehyde = cosmeticIngredients.find((entry) => entry.inci_name === 'Formaldehyde');
    expect(formaldehyde?.regulatory_status[0]).toMatchObject({ annex: 'II', status: 'prohibited' });
  });

  it('includes triclosan in Annex V with a 0.3% limit', () => {
    const triclosan = cosmeticIngredients.find((entry) => entry.inci_name === 'Triclosan');
    const limit = triclosan?.limits.find((item) => item.kind === 'max_concentration');
    expect(limit?.value).toBe(0.3);
    expect(limit?.reference_ids).toContain('REF-EU-1223-ANNEX-V');
  });

  it('includes the nine fragrance allergens with labelling thresholds', () => {
    const names = [
      'Eugenol',
      'Amyl Cinnamal',
      'Benzyl Salicylate',
      'Coumarin',
      'Geraniol',
      'Linalool',
      'Citronellol',
      'Hexyl Cinnamal',
      'Limonene',
    ];
    for (const name of names) {
      const entry = cosmeticIngredients.find((item) => item.inci_name === name);
      expect(entry, name).toBeDefined();
      const thresholds = entry?.limits.filter((limit) => limit.kind === 'labelling_threshold') ?? [];
      expect(thresholds.map((limit) => limit.value).sort(), name).toEqual([0.001, 0.01]);
    }
  });

  it('includes the six FSA worked-example inputs in documented form', () => {
    expect(referenceMap.get('REF-FSA-NPM-2011')?.document_number).toBe('January 2011');
  });
});
