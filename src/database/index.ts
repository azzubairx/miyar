import type {
  CosmeticIngredient,
  FoodAdditive,
  KnowledgeBase,
  KnowledgeBaseMeta,
  Reference,
} from '../types';
import metaJson from './meta.json';
import referencesJson from './references/references.json';
import foodJson from './food/additives.json';
import cosmeticsJson from './cosmetics/ingredients.json';

const meta = metaJson as KnowledgeBaseMeta;
const references = (referencesJson as { references: Reference[] }).references;
const foodAdditives = (foodJson as { foodAdditives: FoodAdditive[] }).foodAdditives;
const cosmeticIngredients = (cosmeticsJson as { cosmeticIngredients: CosmeticIngredient[] })
  .cosmeticIngredients;

export const knowledgeBase: KnowledgeBase = {
  meta,
  references,
  foodAdditives,
  cosmeticIngredients,
};

export const referenceMap = new Map(references.map((reference) => [reference.id, reference]));

export function getReference(id: string): Reference | undefined {
  return referenceMap.get(id);
}

export function getReferences(ids: string[]): Reference[] {
  return ids.map((id) => referenceMap.get(id)).filter((reference): reference is Reference => Boolean(reference));
}

export { meta, references, foodAdditives, cosmeticIngredients };
