import type { FoodProductInput } from '../src/types';

export function makeFoodProduct(overrides: Partial<FoodProductInput> = {}): FoodProductInput {
  const { nutrition, ...rest } = overrides;
  return {
    name: 'منتج اختبار',
    brand: 'علامة اختبار',
    productType: 'food',
    category: 'اختبار',
    packageSize: '',
    servingSize: '',
    ingredientsText: '',
    nutritionBasis: '100g',
    density_g_per_ml: null,
    ...rest,
    nutrition: {
      energy_kj: 459,
      fat_saturated_g: 1.8,
      sugars_total_g: 13.4,
      sodium_mg: 0.1,
      fruit_veg_nuts_percent: 8,
      fibre_g: 0.6,
      fibre_type: 'AOAC',
      protein_g: 6.5,
      ...nutrition,
    },
  };
}
