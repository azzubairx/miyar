export type ModuleKind = 'food' | 'cosmetics';

export type ConfidenceLevel =
  | 'official_regulation'
  | 'official_scientific_opinion'
  | 'scientific_assessment'
  | 'secondary_reference'
  | 'unverified';

export type VerificationStatus = 'verified' | 'pending' | 'partial';

export interface Reference {
  id: string;
  authority: string;
  title_ar: string;
  title_en: string;
  document_number: string;
  published: string | null;
  updated?: string | null;
  url: string;
  type: ConfidenceLevel;
  accessed: string;
  note_ar?: string;
}

export interface RegulatoryStatus {
  framework: string;
  instrument: string;
  annex?: string;
  entry?: string;
  status:
    | 'authorised'
    | 'prohibited'
    | 'restricted'
    | 'permitted_preservative'
    | 'permitted_uv_filter'
    | 'labelling_required'
    | 'conditional'
    | 'not_listed';
  conditions_ar: string;
  reference_ids: string[];
}

export type LimitKind = 'adi' | 'max_concentration' | 'labelling_threshold';

export interface Limit {
  kind: LimitKind;
  value: number | null;
  unit: string;
  basis_ar?: string;
  product_types?: string[];
  areas?: string[];
  leave_on?: boolean | null;
  conditions_ar?: string;
  reference_ids: string[];
}

export interface ScientificAssessment {
  opinion_number: string;
  title_ar: string;
  adopted: string;
  summary_ar: string;
  conditions_ar?: string;
  reference_ids: string[];
}

export interface FoodAdditive {
  id: string;
  kind: 'food_additive';
  name_en: string;
  name_ar: string;
  e_number: string;
  synonyms_en: string[];
  synonyms_ar: string[];
  cas_number: string | null;
  functions_ar: string[];
  category_ar: string;
  regulatory_status: RegulatoryStatus[];
  limits: Limit[];
  scientific_assessment: ScientificAssessment[];
  confidence: ConfidenceLevel;
  last_reviewed: string;
  verification_status: VerificationStatus;
  notes_ar: string;
}

export interface CosmeticIngredient {
  id: string;
  kind: 'cosmetic_ingredient';
  name_en: string;
  name_ar: string;
  inci_name: string;
  synonyms_en: string[];
  synonyms_ar: string[];
  cas_number: string | null;
  ec_number: string | null;
  functions_ar: string[];
  category_ar: string;
  regulatory_status: RegulatoryStatus[];
  limits: Limit[];
  scientific_assessment: ScientificAssessment[];
  confidence: ConfidenceLevel;
  last_reviewed: string;
  verification_status: VerificationStatus;
  notes_ar: string;
}

export type KnowledgeEntry = FoodAdditive | CosmeticIngredient;

export interface KnowledgeBaseMeta {
  version: string;
  updated: string;
  platform_version: string;
  platform_updated: string;
  platform_changelog_ar: string[];
  food_additives_count: number;
  cosmetic_ingredients_count: number;
  references_count: number;
  scope_ar: string;
  changelog_ar: string[];
}

export interface KnowledgeBase {
  meta: KnowledgeBaseMeta;
  references: Reference[];
  foodAdditives: FoodAdditive[];
  cosmeticIngredients: CosmeticIngredient[];
}

/* ------------------------------- Food input ------------------------------ */

export type FoodProductType = 'food' | 'drink';
export type NutritionBasis = '100g' | '100ml';

export interface FoodNutritionInput {
  energy_kj?: number | null;
  energy_kcal?: number | null;
  fat_total_g?: number | null;
  fat_saturated_g?: number | null;
  fat_trans_g?: number | null;
  carbohydrates_g?: number | null;
  sugars_total_g?: number | null;
  sugars_added_g?: number | null;
  fibre_g?: number | null;
  fibre_type?: 'NSP' | 'AOAC' | null;
  protein_g?: number | null;
  sodium_mg?: number | null;
  salt_g?: number | null;
  fruit_veg_nuts_percent?: number | null;
}

export interface FoodProductInput {
  name: string;
  brand: string;
  productType: FoodProductType;
  category: string;
  packageSize: string;
  servingSize: string;
  ingredientsText: string;
  nutritionBasis: NutritionBasis;
  density_g_per_ml?: number | null;
  nutrition: FoodNutritionInput;
}

/* ----------------------------- Cosmetics input --------------------------- */

export type CosmeticApplication = 'leave-on' | 'rinse-off';

export interface CosmeticIngredientInput {
  raw: string;
  concentration_percent?: number | null;
}

export interface CosmeticsProductInput {
  name: string;
  brand: string;
  productType: string;
  category: string;
  application: CosmeticApplication;
  area: string;
  ingredientsText: string;
  concentrations: Record<string, number | null>;
  warnings: string;
}

/* -------------------------------- Results -------------------------------- */

export interface MatchedIngredient {
  raw: string;
  normalized: string;
  matched: boolean;
  entry?: KnowledgeEntry;
  suggestions: string[];
  position: number;
  concentration_percent?: number | null;
}

export interface DataCompleteness {
  percent: number;
  level: 'complete' | 'partial' | 'insufficient';
  missing_ar: string[];
  notes_ar: string[];
}

export interface FoodNpmBreakdown {
  energy: number | null;
  saturated_fat: number | null;
  sugars: number | null;
  sodium: number | null;
  fruit_veg_nuts: number | null;
  fibre: number | null;
  protein: number | null;
}

export interface FoodNpmResult {
  applicable: boolean;
  score: number | null;
  aPoints: number | null;
  cPoints: number | null;
  breakdown: FoodNpmBreakdown;
  classification:
    | 'less_healthy'
    | 'not_classified_less_healthy'
    | 'not_applicable';
  protein_excluded: boolean;
  limitations_ar: string[];
  reference_ids: string[];
}

export type AlertSeverity = 'info' | 'attention' | 'regulatory' | 'insufficient';

export interface EvaluationAlert {
  id: string;
  severity: AlertSeverity;
  title_ar: string;
  message_ar: string;
  ingredient_id?: string;
  reference_ids: string[];
}

export interface NutrientRow {
  key: string;
  label_ar: string;
  label_en: string;
  value: number | null;
  unit: string;
  points: number | null;
  note_ar?: string;
}

export interface FoodEvaluationResult {
  kind: 'food';
  id: string;
  generated_at: string;
  kb_version: string;
  product: FoodProductInput;
  ingredients: MatchedIngredient[];
  additives: MatchedIngredient[];
  unknownIngredients: string[];
  completeness: DataCompleteness;
  npm: FoodNpmResult;
  nutrients: NutrientRow[];
  alerts: EvaluationAlert[];
  reference_ids: string[];
  limitations_ar: string[];
}

export interface CosmeticsIngredientResult extends MatchedIngredient {
  regulatory_label_ar: string;
  severity: AlertSeverity;
  applied_limits: AppliedLimit[];
  notes_ar: string[];
}

export interface AppliedLimit {
  limit: Limit;
  applicable: boolean;
  result:
    | 'within_limit'
    | 'exceeds_limit'
    | 'concentration_unknown'
    | 'not_applicable';
  message_ar: string;
}

export interface CosmeticsEvaluationResult {
  kind: 'cosmetics';
  id: string;
  generated_at: string;
  kb_version: string;
  product: CosmeticsProductInput;
  ingredients: CosmeticsIngredientResult[];
  unknownIngredients: string[];
  completeness: DataCompleteness;
  counts: {
    prohibited: number;
    restricted: number;
    labelling: number;
    unknown: number;
    no_specific_restriction: number;
  };
  alerts: EvaluationAlert[];
  reference_ids: string[];
  limitations_ar: string[];
}

export type EvaluationResult = FoodEvaluationResult | CosmeticsEvaluationResult;

export interface HistoryItem {
  id: string;
  kind: ModuleKind;
  product_name: string;
  brand: string;
  created_at: string;
  summary_ar: string;
}
