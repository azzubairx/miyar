import type { FoodNutritionInput } from '../../types';

export type ImagingKind = 'food' | 'cosmetics';

export type CaptureRole = 'nutrition' | 'ingredients' | 'front' | 'serving' | 'other';

export interface CapturedImage {
  id: string;
  role: CaptureRole;
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
  fileName?: string;
  preprocessing: {
    rotation: number;
    deskewAngle: number;
    cropped: boolean;
    grayscale: boolean;
  };
}

export interface OcrWord {
  text: string;
  confidence: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  words: OcrWord[];
}

export interface OcrImageResult {
  imageId: string;
  role: CaptureRole;
  text: string;
  confidence: number;
  lines: OcrLine[];
  durationMs: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
  label_ar: string;
}

export type NutritionFieldKey =
  | 'energy_kj'
  | 'energy_kcal'
  | 'fat_total_g'
  | 'fat_saturated_g'
  | 'fat_trans_g'
  | 'carbohydrates_g'
  | 'sugars_total_g'
  | 'sugars_added_g'
  | 'fibre_g'
  | 'protein_g'
  | 'sodium_mg'
  | 'salt_g'
  | 'fruit_veg_nuts_percent';

export interface ParsedNutritionField {
  key: NutritionFieldKey;
  value: number;
  unit: string;
  confidence: number;
  needsReview: boolean;
  sourceText: string;
  note_ar?: string;
}

export interface ParsedServingSize {
  value: number;
  unit: 'g' | 'ml';
  raw: string;
}

export type NutritionBasisDetection = '100g' | '100ml' | 'serving' | 'unknown';

export interface NutritionParseResult {
  basis: NutritionBasisDetection;
  basisLabel_ar: string;
  servingSize: ParsedServingSize | null;
  fields: Partial<Record<NutritionFieldKey, ParsedNutritionField>>;
  warnings_ar: string[];
  rawText: string;
  convertedFromServing: boolean;
}

export interface ParsedIngredientItem {
  raw: string;
  position: number;
  confidence: number;
  needsReview: boolean;
  eNumbers: string[];
  parenthetical: string[];
  note_ar?: string;
}

export interface IngredientsParseResult {
  items: ParsedIngredientItem[];
  warnings_ar: string[];
  rawText: string;
  kind: ImagingKind;
}

export interface ConfirmedFoodCapture {
  source: 'ocr';
  reviewConfirmed: true;
  nutrition: Partial<FoodNutritionInput>;
  nutritionBasis: '100g' | '100ml';
  ingredientsText: string;
  productName?: string;
  servingSize?: string;
  ocrConfidence: number;
}

export interface ConfirmedCosmeticsCapture {
  source: 'ocr';
  reviewConfirmed: true;
  ingredientsText: string;
  productName?: string;
  ocrConfidence: number;
}

export interface BarcodeDecodeResult {
  text: string;
  format: string;
  timestamp: number;
}

export type CameraState = 'idle' | 'starting' | 'active' | 'error';
