import type { FoodAdditive, MatchedIngredient } from '../../types';
import {
  eNumberAliases,
  normalizeText,
  normalizeWithENumbers,
  splitIngredientList,
} from '../normalize';

function buildAliases(additive: FoodAdditive): string[] {
  const aliases = new Set<string>();
  for (const alias of eNumberAliases(additive.e_number)) aliases.add(alias);
  for (const synonym of additive.synonyms_en) {
    const normalized = normalizeText(synonym);
    if (normalized.length >= 3) aliases.add(normalized);
    for (const e of eNumberAliases(synonym)) aliases.add(e);
  }
  for (const synonym of additive.synonyms_ar) {
    const normalized = normalizeText(synonym);
    if (normalized.length >= 3) aliases.add(normalized);
  }
  const name = normalizeText(additive.name_en);
  if (name.length >= 3) aliases.add(name);
  const nameAr = normalizeText(additive.name_ar);
  if (nameAr.length >= 3) aliases.add(nameAr);
  return [...aliases];
}

export interface FoodMatchResult {
  additives: MatchedIngredient[];
  unknownIngredients: string[];
  tokens: Array<{ raw: string; concentration: number | null }>;
}

export function matchFoodAdditives(
  ingredientsText: string,
  additives: FoodAdditive[],
): FoodMatchResult {
  const tokens = splitIngredientList(ingredientsText);
  const normText = ` ${normalizeWithENumbers(ingredientsText)} `;
  const matched = new Map<string, MatchedIngredient>();
  const matchedTokenKeys = new Set<string>();

  for (const additive of additives) {
    const aliases = buildAliases(additive);
    let hit = false;

    for (const alias of aliases) {
      if (/^e\d{3}[a-z]?$/.test(alias)) {
        if (normText.includes(` ${alias} `)) {
          hit = true;
          break;
        }
      } else if (normText.includes(` ${alias} `)) {
        hit = true;
        break;
      }
    }

    if (!hit) continue;

    const matchingToken = tokens.find((token) => {
      const tokenNorm = ` ${normalizeWithENumbers(token.raw)} `;
      return aliases.some((alias) =>
        /^e\d{3}[a-z]?$/.test(alias) ? tokenNorm.includes(` ${alias} `) : tokenNorm.includes(` ${alias} `),
      );
    });

    const raw = matchingToken?.raw ?? additive.name_en;
    const key = `${additive.id}:${normalizeText(raw)}`;
    if (matched.has(key)) continue;

    matched.set(key, {
      raw,
      normalized: normalizeText(raw),
      matched: true,
      entry: additive,
      suggestions: [],
      position: matchingToken ? tokens.indexOf(matchingToken) : 0,
      concentration_percent: matchingToken?.concentration ?? null,
    });
    if (matchingToken) matchedTokenKeys.add(normalizeText(matchingToken.raw));
  }

  const unknownIngredients = tokens
    .filter((token) => !matchedTokenKeys.has(normalizeText(token.raw)))
    .map((token) => token.raw)
    .filter((raw, index, all) => all.indexOf(raw) === index);

  return {
    additives: [...matched.values()].sort((a, b) => a.position - b.position),
    unknownIngredients,
    tokens,
  };
}
