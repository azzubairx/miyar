import type { CosmeticIngredient, FoodAdditive } from '../../types';
import { cosmeticAliasKey, normalizeText, stripCiParenthetical } from '../normalize';
import { matchFoodAdditives } from '../food/match';

export function findFoodAdditive(
  raw: string,
  additives: FoodAdditive[],
): FoodAdditive | null {
  const match = matchFoodAdditives(raw, additives);
  const entry = match.additives[0]?.entry;
  return entry && entry.kind === 'food_additive' ? entry : null;
}

const BASE_INGREDIENTS = new Set(['aqua', 'water', 'eau', 'aqua purificata']);

export function isBaseIngredient(raw: string): boolean {
  return normalizeText(stripCiParenthetical(raw))
    .split(' ')
    .some((token) => BASE_INGREDIENTS.has(token));
}

export function findCosmeticIngredient(
  raw: string,
  ingredients: CosmeticIngredient[],
): CosmeticIngredient | null {
  const normalized = cosmeticAliasKey(normalizeText(stripCiParenthetical(raw)));
  if (!normalized) return null;
  for (const entry of ingredients) {
    const candidates = [
      entry.inci_name,
      entry.name_en,
      entry.name_ar,
      ...entry.synonyms_en,
      ...entry.synonyms_ar,
    ];
    for (const candidate of candidates) {
      const candidateNormalized = cosmeticAliasKey(normalizeText(candidate));
      if (candidateNormalized && candidateNormalized === normalized) return entry;
    }
    // Parenthetical INCI names such as "Methylchloroisothiazolinone (and) ..."
    if (
      normalized.includes(cosmeticAliasKey(normalizeText(entry.inci_name))) ||
      cosmeticAliasKey(normalizeText(entry.inci_name)).includes(normalized)
    ) {
      return entry;
    }
  }
  return null;
}
