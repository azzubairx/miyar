import type {
  FoodNpmBreakdown,
  FoodNpmResult,
  FoodProductInput,
  NutrientRow,
} from '../../types';
import { isFiniteNumber, kcalToKj, saltToSodiumMg } from '../units';

const ENERGY_THRESHOLDS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const SAT_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SODIUM_THRESHOLDS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
const NSP_FIBRE_THRESHOLDS = [0.7, 1.4, 2.1, 2.8, 3.5];
const AOAC_FIBRE_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7];
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0];

export function pointsAboveThresholds(value: number, thresholds: number[]): number {
  let points = 0;
  for (const threshold of thresholds) {
    if (value > threshold) points += 1;
    else break;
  }
  return points;
}

export function fruitVegNutsPoints(percent: number): number {
  if (percent > 80) return 5;
  if (percent > 60) return 2;
  if (percent > 40) return 1;
  return 0;
}

export function fibrePoints(fibreG: number, type: 'NSP' | 'AOAC'): number {
  return pointsAboveThresholds(fibreG, type === 'AOAC' ? AOAC_FIBRE_THRESHOLDS : NSP_FIBRE_THRESHOLDS);
}

export function proteinPoints(proteinG: number): number {
  return pointsAboveThresholds(proteinG, PROTEIN_THRESHOLDS);
}

export interface NpmEvaluation {
  npm: FoodNpmResult;
  nutrients: NutrientRow[];
  notes: string[];
}

export function evaluateNpm(product: FoodProductInput): NpmEvaluation {
  const n = product.nutrition;
  const notes: string[] = [];

  let energyKj: number | null = null;
  if (isFiniteNumber(n.energy_kj)) {
    energyKj = n.energy_kj;
  } else if (isFiniteNumber(n.energy_kcal)) {
    energyKj = kcalToKj(n.energy_kcal);
    notes.push('حُوّلت الطاقة من كيلوكالوري إلى كيلوجول باستخدام المعامل 4.184.');
  }

  let sodiumMg: number | null = null;
  if (isFiniteNumber(n.sodium_mg)) {
    sodiumMg = n.sodium_mg;
  } else if (isFiniteNumber(n.salt_g)) {
    sodiumMg = saltToSodiumMg(n.salt_g);
    notes.push('حُوّل الملح إلى صوديوم بالعلاقة: صوديوم (مغ) = ملح (غ) ÷ 2.5 × 1000.');
  }

  const saturatedFat = isFiniteNumber(n.fat_saturated_g) ? n.fat_saturated_g : null;
  const sugars = isFiniteNumber(n.sugars_total_g) ? n.sugars_total_g : null;
  const fvn = isFiniteNumber(n.fruit_veg_nuts_percent) ? n.fruit_veg_nuts_percent : null;
  const protein = isFiniteNumber(n.protein_g) ? n.protein_g : null;
  const fibre = isFiniteNumber(n.fibre_g) ? n.fibre_g : null;
  const fibreType = n.fibre_type ?? (fibre !== null ? 'NSP' : null);

  if (fibre !== null && n.fibre_type === null) {
    notes.push(
      'لم يُحدد نوع الألياف؛ استُخدمت عتبات الألياف غير النشوية (NSP) الافتراضية. إذا كان المصدر يستخدم طريقة AOAC فقد تختلف النقاط.',
    );
  }

  const breakdown: FoodNpmBreakdown = {
    energy: energyKj === null ? null : pointsAboveThresholds(energyKj, ENERGY_THRESHOLDS),
    saturated_fat:
      saturatedFat === null ? null : pointsAboveThresholds(saturatedFat, SAT_FAT_THRESHOLDS),
    sugars: sugars === null ? null : pointsAboveThresholds(sugars, SUGARS_THRESHOLDS),
    sodium: sodiumMg === null ? null : pointsAboveThresholds(sodiumMg, SODIUM_THRESHOLDS),
    fruit_veg_nuts: fvn === null ? null : fruitVegNutsPoints(fvn),
    fibre: fibre === null || fibreType === null ? null : fibrePoints(fibre, fibreType),
    protein: protein === null ? null : proteinPoints(protein),
  };

  const aParts = [breakdown.energy, breakdown.saturated_fat, breakdown.sugars, breakdown.sodium];
  const cBaseParts = [breakdown.fruit_veg_nuts, breakdown.fibre];
  const aComplete = aParts.every((p) => p !== null);
  const cBaseComplete = cBaseParts.every((p) => p !== null);
  const proteinAvailable = breakdown.protein !== null;

  const aPoints = aComplete ? (aParts as number[]).reduce((sum, p) => sum + p, 0) : null;
  const cBase = cBaseComplete ? (cBaseParts as number[]).reduce((sum, p) => sum + p, 0) : null;

  const proteinExcluded =
    aPoints !== null && breakdown.fruit_veg_nuts !== null && aPoints >= 11 && breakdown.fruit_veg_nuts < 5;

  const cPoints =
    cBase === null || !proteinAvailable ? null : cBase + (proteinExcluded ? 0 : (breakdown.protein as number));

  const applicable = aPoints !== null && cPoints !== null && proteinAvailable;
  const score = applicable ? aPoints - cPoints : null;

  let classification: FoodNpmResult['classification'] = 'not_applicable';
  if (score !== null) {
    const threshold = product.productType === 'drink' ? 1 : 4;
    classification = score >= threshold ? 'less_healthy' : 'not_classified_less_healthy';
  }

  const limitations: string[] = [
    'نموذج FSA NPM مصمم أصلًا لتصنيف الأغذية في سياق الإعلان التلفزيوني الموجّه للأطفال في المملكة المتحدة، وليس مقياسًا شاملًا لجودة الغذاء أو سلامته.',
    'النتيجة تُحسب لكل 100 غرام أو 100 ملليلتر، ولا تعكس حجم الحصة الذي يستهلكه الشخص فعليًا.',
    'لا يتضمن النموذج تقييم الإضافات الغذائية أو الملوثات أو مسببات الحساسية أو درجة المعالجة.',
    'تعتمد دقة النتيجة على اكتمال بيانات الملصق ودقتها؛ غياب أي حقل مطلوب يمنع إصدار النتيجة.',
    'تصنيف «أقل صحة» في هذا النموذج لا يعني أن المنتج ضار، كما أن عدم التصنيف لا يعني أنه صحي.',
  ];
  if (product.productType === 'drink') {
    limitations.push('عتبة التصنيف للمشروبات هي 1 نقطة أو أكثر، بخلاف الأغذية الصلبة (4 نقاط أو أكثر).');
  }

  const nutrientRows: NutrientRow[] = [
    {
      key: 'energy',
      label_ar: 'الطاقة',
      label_en: 'Energy',
      value: energyKj === null ? null : Math.round(energyKj),
      unit: 'كج',
      points: breakdown.energy,
      note_ar: n.energy_kj == null && n.energy_kcal != null ? 'حُوّلت من كيلوكالوري' : undefined,
    },
    {
      key: 'saturated_fat',
      label_ar: 'الدهون المشبعة',
      label_en: 'Saturated fat',
      value: saturatedFat,
      unit: 'غ',
      points: breakdown.saturated_fat,
    },
    {
      key: 'sugars',
      label_ar: 'السكريات الكلية',
      label_en: 'Total sugars',
      value: sugars,
      unit: 'غ',
      points: breakdown.sugars,
    },
    {
      key: 'sodium',
      label_ar: 'الصوديوم',
      label_en: 'Sodium',
      value: sodiumMg === null ? null : Math.round(sodiumMg),
      unit: 'مغ',
      points: breakdown.sodium,
      note_ar: n.sodium_mg == null && n.salt_g != null ? 'حُوّلت من الملح' : undefined,
    },
    {
      key: 'fruit_veg_nuts',
      label_ar: 'الفواكه والخضروات والمكسرات',
      label_en: 'Fruit, vegetables & nuts',
      value: fvn,
      unit: '%',
      points: breakdown.fruit_veg_nuts,
    },
    {
      key: 'fibre',
      label_ar: `الألياف${fibreType ? ` (${fibreType})` : ''}`,
      label_en: 'Fibre',
      value: fibre,
      unit: 'غ',
      points: breakdown.fibre,
      note_ar: n.fibre_type === null && fibre !== null ? 'استُخدمت عتبات NSP افتراضيًا' : undefined,
    },
    {
      key: 'protein',
      label_ar: 'البروتين',
      label_en: 'Protein',
      value: protein,
      unit: 'غ',
      points: proteinExcluded ? 0 : breakdown.protein,
      note_ar: proteinExcluded ? 'استُبعدت نقاط البروتين وفق قاعدة A ≥ 11 وFVN < 5' : undefined,
    },
  ];

  return {
    npm: {
      applicable,
      score,
      aPoints,
      cPoints,
      breakdown,
      classification,
      protein_excluded: proteinExcluded,
      limitations_ar: limitations,
      reference_ids: ['REF-FSA-NPM-2011'],
    },
    nutrients: nutrientRows,
    notes,
  };
}
