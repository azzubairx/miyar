import type {
  DataCompleteness,
  EvaluationAlert,
  FoodEvaluationResult,
  FoodProductInput,
} from '../../types';
import { evaluateNpm } from './npm';
import { matchFoodAdditives } from './match';
import { isFiniteNumber } from '../units';
import { normalizeText } from '../normalize';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `eval-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function completenessOf(product: FoodProductInput): DataCompleteness {
  const n = product.nutrition;
  const checks: Array<{ label: string; ok: boolean }> = [
    { label: 'الطاقة', ok: isFiniteNumber(n.energy_kj) || isFiniteNumber(n.energy_kcal) },
    { label: 'الدهون المشبعة', ok: isFiniteNumber(n.fat_saturated_g) },
    { label: 'السكريات الكلية', ok: isFiniteNumber(n.sugars_total_g) },
    { label: 'الصوديوم أو الملح', ok: isFiniteNumber(n.sodium_mg) || isFiniteNumber(n.salt_g) },
    { label: 'نسبة الفواكه والخضروات والمكسرات', ok: isFiniteNumber(n.fruit_veg_nuts_percent) },
    { label: 'الألياف', ok: isFiniteNumber(n.fibre_g) },
    { label: 'البروتين', ok: isFiniteNumber(n.protein_g) },
  ];
  const present = checks.filter((check) => check.ok).length;
  const percent = Math.round((present / checks.length) * 100);
  return {
    percent,
    level: percent === 100 ? 'complete' : percent >= 50 ? 'partial' : 'insufficient',
    missing_ar: checks.filter((check) => !check.ok).map((check) => check.label),
    notes_ar:
      percent === 100
        ? ['جميع الحقول المطلوبة لحساب النموذج متوفرة.']
        : ['الحقول الناقصة تمنع حساب نتيجة النموذج؛ لا تُستبدل بقيم مفترضة.'],
  };
}

export function evaluateFood(
  product: FoodProductInput,
  foodAdditives: Parameters<typeof matchFoodAdditives>[1],
  kbVersion: string,
): FoodEvaluationResult {
  const { npm, nutrients, notes } = evaluateNpm(product);
  const match = matchFoodAdditives(product.ingredientsText, foodAdditives);
  const completeness = completenessOf(product);
  const alerts: EvaluationAlert[] = [];
  const referenceIds = new Set<string>(npm.reference_ids);

  if (!npm.applicable) {
    alerts.push({
      id: 'npm-not-applicable',
      severity: 'insufficient',
      title_ar: 'لا تتوفر معلومات كافية لحساب النموذج',
      message_ar: `لا يمكن إصدار نتيجة FSA NPM دون اكتمال الحقول المطلوبة. الحقول الناقصة: ${completeness.missing_ar.join('، ')}.`,
      reference_ids: ['REF-FSA-NPM-2011'],
    });
  } else if (npm.classification === 'less_healthy') {
    alerts.push({
      id: 'npm-less-healthy',
      severity: 'attention',
      title_ar: 'تصنيف إعلاني: منتج «أقل صحة»',
      message_ar:
        'وفق عتبة FSA NPM المحددة للإعلان، يقع هذا المنتج في فئة «أقل صحة». هذا تصنيف إعلاني وليس تشخيصًا صحيًا فرديًا، ولا يعني أن المنتج ضار بحد ذاته.',
      reference_ids: ['REF-FSA-NPM-2011'],
    });
  } else {
    alerts.push({
      id: 'npm-not-less-healthy',
      severity: 'info',
      title_ar: 'لم يُصنّف «أقل صحة» وفق النموذج',
      message_ar:
        'النتيجة أقل من عتبة التصنيف الإعلاني. عدم التصنيف لا يعني أن المنتج صحي أو متوازن غذائيًا، بل يعني فقط أنه لا يستوفي عتبة FSA NPM.',
      reference_ids: ['REF-FSA-NPM-2011'],
    });
  }

  for (const additive of match.additives) {
    const entry = additive.entry;
    if (!entry || entry.kind !== 'food_additive') continue;
    const prohibited = entry.regulatory_status.some((status) => status.status === 'prohibited');
    if (prohibited) {
      alerts.push({
        id: `prohibited-${entry.id}`,
        severity: 'regulatory',
        title_ar: `${entry.name_ar} (${entry.e_number}): مادة محظورة`,
        message_ar: entry.regulatory_status[0]?.conditions_ar ?? 'هذه المادة محظورة في الاتحاد الأوروبي.',
        ingredient_id: entry.id,
        reference_ids: entry.regulatory_status.flatMap((status) => status.reference_ids),
      });
      continue;
    }

    const adi = entry.limits.find((limit) => limit.kind === 'adi');
    if (adi && adi.value !== null) {
      alerts.push({
        id: `adi-${entry.id}`,
        severity: 'info',
        title_ar: `${entry.name_ar} (${entry.e_number}): مدخول يومي مقبول ${adi.value} ${adi.unit}`,
        message_ar:
          'وجود المادة لا يعني تجاوز المدخول اليومي المقبول. لا تحسب المنصة التعرض الفعلي لغياب كمية الاستهلاك ووزن الجسم؛ الحد مرجعي ولا يُترجم إلى حكم على هذا المنتج.',
        ingredient_id: entry.id,
        reference_ids: adi.reference_ids,
      });
    } else {
      alerts.push({
        id: `no-adi-${entry.id}`,
        severity: 'info',
        title_ar: `${entry.name_ar} (${entry.e_number}): لا توجد قيمة ADI رقمية`,
        message_ar:
          'لم تحدد EFSA قيمة مدخول يومي مقبول رقمية لهذه المادة في المرجع المتاح. غياب القيمة الرقمية لا يعني سلامة غير مشروطة، ولا يبرر تجاوز حدود الاستخدام في فئات الغذاء.',
        ingredient_id: entry.id,
        reference_ids: entry.limits.flatMap((limit) => limit.reference_ids),
      });
    }
  }

  for (const note of notes) {
    alerts.push({
      id: `conversion-${note.slice(0, 12)}`,
      severity: 'info',
      title_ar: 'تحويل بيانات',
      message_ar: note,
      reference_ids: ['REF-FSA-NPM-2011'],
    });
  }

  if (product.nutrition.fibre_g !== null && product.nutrition.fibre_type === null) {
    alerts.push({
      id: 'fibre-type-default',
      severity: 'attention',
      title_ar: 'نوع الألياف غير محدد',
      message_ar:
        'استُخدمت عتبات الألياف غير النشوية (NSP) افتراضيًا. إذا كانت بيانات الملصق مبنية على طريقة AOAC فقد تختلف نقاط الألياف والنتيجة النهائية.',
      reference_ids: ['REF-FSA-NPM-2011'],
    });
  }

  if (match.additives.length === 0) {
    alerts.push({
      id: 'no-additives-matched',
      severity: 'info',
      title_ar: 'لم تُطابق إضافات مدرجة',
      message_ar:
        'لم يتعرف المحرك على أي من الإضافات المدرجة في قاعدة المعرفة. هذا لا يعني خلو المنتج من الإضافات أو سلامته؛ قد تكون القائمة ناقصة أو تستخدم اسمًا غير مدرج.',
      reference_ids: [],
    });
  }

  for (const additive of match.additives) {
    for (const ref of additive.entry?.regulatory_status.flatMap((status) => status.reference_ids) ?? []) {
      referenceIds.add(ref);
    }
    for (const ref of additive.entry?.limits.flatMap((limit) => limit.reference_ids) ?? []) {
      referenceIds.add(ref);
    }
    for (const ref of additive.entry?.scientific_assessment.flatMap((item) => item.reference_ids) ?? []) {
      referenceIds.add(ref);
    }
  }

  const limitations = [
    ...npm.limitations_ar,
    'لا تحكم المنصة على سلامة المنتج ككل، ولا تحسب التعرض الفعلي للمضافات أو الملوثات.',
    'قاعدة المعرفة تغطي 21 إضافًا غذائيًا فقط، وغياب الإضافة من القاعدة لا يعني أنها آمنة أو غير مسموحة.',
    'لا تُستنتج الكميات من ترتيب المكونات؛ ترتيب المكونات لا يعطي تركيزًا رقميًا دقيقًا.',
    'المنصة لا تعوّض عن استشارة مختص التغذية أو الطبيب، ولا عن قراءة الملصق والتحذيرات الرسمية.',
  ];

  return {
    kind: 'food',
    id: uid(),
    generated_at: new Date().toISOString(),
    kb_version: kbVersion,
    product,
    ingredients: match.tokens.map((token, index) => ({
      raw: token.raw,
      normalized: normalizeText(token.raw),
      matched: match.additives.some((a) => a.position === index),
      suggestions: [],
      position: index,
      concentration_percent: token.concentration,
    })),
    additives: match.additives,
    unknownIngredients: match.unknownIngredients,
    completeness,
    npm,
    nutrients,
    alerts,
    reference_ids: [...referenceIds],
    limitations_ar: limitations,
  };
}
