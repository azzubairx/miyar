import type {
  AlertSeverity,
  AppliedLimit,
  CosmeticIngredient,
  CosmeticIngredientInput,
  CosmeticsEvaluationResult,
  CosmeticsIngredientResult,
  CosmeticsProductInput,
  DataCompleteness,
  EvaluationAlert,
  Limit,
} from '../../types';
import {
  cosmeticAliasKey,
  normalizeText,
  splitIngredientList,
  stripCiParenthetical,
} from '../normalize';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `eval-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PRODUCT_TOKENS: Record<string, string[]> = {
  'face-cream': ['face cream', 'face products', 'leave-on'],
  'body-lotion': ['body lotion', 'body products', 'leave-on'],
  sunscreen: ['sunscreen', 'sun protection', 'uv filter', 'face products', 'body products', 'leave-on'],
  shampoo: ['shampoo', 'rinse-off hair products', 'rinse-off hair', 'hair products'],
  conditioner: ['conditioner', 'rinse-off hair products', 'rinse-off hair', 'hair products'],
  'body-wash': ['body soap', 'shower gel', 'body products', 'rinse-off'],
  'hand-soap': ['hand soap', 'rinse-off'],
  deodorant: ['deodorant', 'non-aerosol deodorant', 'non-aerosol antiperspirant', 'underarms'],
  'deodorant-spray': ['deodorant', 'aerosol deodorant', 'aerosol antiperspirant', 'propellant spray products', 'underarms'],
  toothpaste: ['toothpaste', 'oral'],
  'hair-dye': ['hair dye', 'oxidative hair dye', 'hair products'],
  'nail-polish': ['nail products', 'nails', 'artificial nail systems'],
  perfume: ['perfume', 'fragrance', 'leave-on'],
  baby: ['baby', 'children', 'leave-on'],
  other: ['other products'],
};

const AREA_TOKENS: Record<string, string[]> = {
  face: ['face products', 'face'],
  body: ['body products', 'body'],
  hair: ['hair products', 'hair'],
  lips: ['lip products', 'lips'],
  nails: ['nail products', 'nails'],
  underarms: ['underarms', 'deodorant'],
  oral: ['oral', 'toothpaste'],
  other: [],
};

interface ProductContext {
  haystack: string;
  application: string;
}

function buildContext(product: CosmeticsProductInput): ProductContext {
  const tokens = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeText(value);
    if (normalized) tokens.add(normalized);
  };
  for (const token of PRODUCT_TOKENS[product.productType] ?? PRODUCT_TOKENS.other) add(token);
  for (const token of AREA_TOKENS[product.area] ?? []) add(token);
  add(product.category);
  add(product.application);
  return {
    haystack: ` ${[...tokens].join(' ')} `,
    application: product.application,
  };
}

interface LimitApplicability {
  applicable: boolean;
  specificity: number;
}

function checkLimitApplicability(limit: Limit, context: ProductContext): LimitApplicability {
  if (limit.leave_on !== null && limit.leave_on !== undefined) {
    const required = limit.leave_on ? 'leave-on' : 'rinse-off';
    if (context.application !== required) return { applicable: false, specificity: 0 };
  }

  if (!limit.product_types || limit.product_types.length === 0) {
    return { applicable: true, specificity: 0 };
  }

  let matches = 0;
  for (const productType of limit.product_types) {
    const normalized = normalizeText(productType);
    if (normalized && context.haystack.includes(` ${normalized} `)) matches += 1;
    else if (normalized && context.haystack.includes(normalized)) matches += 1;
  }

  return { applicable: matches > 0, specificity: matches };
}

function severityRank(severity: AlertSeverity): number {
  return { regulatory: 0, attention: 1, insufficient: 2, info: 3 }[severity];
}

const BASE_INGREDIENTS = new Set(['aqua', 'water', 'eau', 'aqua purificata']);

function buildIngredientResult(
  raw: string,
  concentration: number | null,
  entry: CosmeticIngredient | undefined,
  product: CosmeticsProductInput,
  context: ProductContext,
  index: number,
): CosmeticsIngredientResult {
  const base = {
    raw,
    normalized: normalizeText(stripCiParenthetical(raw)),
    matched: Boolean(entry),
    entry,
    suggestions: [] as string[],
    position: index,
    concentration_percent: concentration,
  };

  if (!entry) {
    const isBase = base.normalized.split(' ').some((token) => BASE_INGREDIENTS.has(token));
    if (isBase) {
      return {
        ...base,
        matched: true,
        regulatory_label_ar: 'مكوّن أساسي',
        severity: 'info',
        applied_limits: [],
        notes_ar: [
          'الماء مكوّن أساسي في معظم المستحضرات، ولا يخضع لقيد في الملاحق التي تغطيها قاعدة المعرفة. لا يعني ذلك تقييمًا لسلامة التركيبة كاملة.',
        ],
      };
    }
    return {
      ...base,
      regulatory_label_ar: 'غير مدرج في قاعدة المعرفة',
      severity: 'insufficient',
      applied_limits: [],
      notes_ar: [
        'هذا المكوّن غير موجود في قاعدة المعرفة المحدودة. عدم العثور عليه لا يعني أنه آمن؛ يعني فقط أن المنصة لا تملك تقييمًا موثقًا له.',
      ],
    };
  }

  const statuses = entry.regulatory_status;
  const prohibited = statuses.find((status) => status.status === 'prohibited');
  const conditional = statuses.find((status) => status.status === 'conditional');
  const restrictedStatuses = statuses.filter((status) =>
    ['restricted', 'permitted_preservative', 'permitted_uv_filter', 'labelling_required'].includes(status.status),
  );

  const applied: AppliedLimit[] = [];
  let primarySeverity: AlertSeverity = 'info';
  let primaryLabel = 'لا قيد محدد في قاعدة المعرفة';
  const notes: string[] = [];

  if (prohibited) {
    primarySeverity = 'regulatory';
    primaryLabel = 'محظور';
    notes.push(prohibited.conditions_ar);
  } else if (conditional) {
    primarySeverity = 'attention';
    primaryLabel = 'استخدام مشروط';
    notes.push(conditional.conditions_ar);
  } else if (restrictedStatuses.length > 0) {
    if (restrictedStatuses.some((status) => status.status === 'labelling_required')) {
      primaryLabel = 'وسم إلزامي';
    } else if (restrictedStatuses.some((status) => status.status === 'permitted_preservative')) {
      primaryLabel = 'مادة حافظة مسموحة';
    } else if (restrictedStatuses.some((status) => status.status === 'permitted_uv_filter')) {
      primaryLabel = 'مرشح UV مسموح';
    } else {
      primaryLabel = 'مقيد';
    }
  }

  const evaluatedLimits = entry.limits
    .map((limit) => ({ limit, ...checkLimitApplicability(limit, context) }))
    .filter((item) => item.applicable)
    .sort((a, b) => b.specificity - a.specificity);

  for (const { limit } of evaluatedLimits) {
    if (limit.value === null) continue;
    const isLabelling = limit.kind === 'labelling_threshold';
    let result: AppliedLimit['result'];
    let message: string;

    if (concentration === null || concentration === undefined) {
      result = 'concentration_unknown';
      message = isLabelling
        ? `لا يمكن التحقق من حد الوسم (${limit.value}${limit.unit}) دون معرفة التركيز.`
        : `لا يمكن التحقق من الحد الأقصى (${limit.value}${limit.unit}) دون معرفة التركيز.`;
    } else if (concentration > limit.value) {
      result = 'exceeds_limit';
      message = isLabelling
        ? `التركيز المدخل (${concentration}%) يتجاوز حد الوسم (${limit.value}${limit.unit})؛ يجب ذكر المادة في قائمة المكونات.`
        : `التركيز المدخل (${concentration}%) يتجاوز الحد الأقصى المسموح (${limit.value}${limit.unit}).`;
    } else {
      result = 'within_limit';
      message = isLabelling
        ? `التركيز المدخل (${concentration}%) لا يتجاوز حد الوسم (${limit.value}${limit.unit}).`
        : `التركيز المدخل (${concentration}%) ضمن الحد الأقصى (${limit.value}${limit.unit}).`;
    }

    applied.push({ limit, applicable: true, result, message_ar: message });

    if (result === 'exceeds_limit' && !isLabelling) {
      primarySeverity = 'regulatory';
      primaryLabel = 'يتجاوز حدًا تنظيميًا';
    } else if (result === 'exceeds_limit' && isLabelling) {
      if (primarySeverity !== 'regulatory') primarySeverity = 'attention';
      primaryLabel = 'وسم إلزامي';
    } else if (result === 'concentration_unknown' && primarySeverity !== 'regulatory') {
      primarySeverity = 'attention';
      if (isLabelling) {
        primaryLabel = 'وسم إلزامي — تركيز غير معروف';
      } else if (primaryLabel === 'مقيد' || primaryLabel === 'لا قيد محدد في قاعدة المعرفة') {
        primaryLabel = 'قيد يحتاج تركيزًا';
      }
    }
  }

  if (restrictedStatuses.length > 0 && applied.length === 0 && !prohibited) {
    const categorySpecificPermission = restrictedStatuses.some(
      (status) =>
        status.status === 'permitted_preservative' || status.status === 'permitted_uv_filter',
    );
    primarySeverity = categorySpecificPermission ? 'regulatory' : 'attention';
    primaryLabel = categorySpecificPermission
      ? 'غير مسموح في هذه الفئة'
      : 'قيد غير منطبق على هذه الفئة';
    notes.push(
      categorySpecificPermission
        ? 'هذه المادة مسموحة فقط في فئات منتجات محددة، ولا ينطبق أي حد مسموح على الفئة المحددة. قد يكون الاستخدام في هذه الفئة غير مسموح.'
        : 'توجد قيود تنظيمية لهذه المادة، لكنها لا تنطبق على فئة المنتج المحددة. قد يعني ذلك أن الاستخدام في هذه الفئة غير مسموح، أو أن بيانات الفئة غير كافية للحكم.',
    );
  }

  if (restrictedStatuses.length === 0 && !prohibited && !conditional) {
    primarySeverity = 'info';
    primaryLabel = 'لا قيد محدد في قاعدة المعرفة';
    notes.push('لا يتضمن الإدخال قيدًا تنظيميًا محددًا في الملاحق التي تغطيها قاعدة المعرفة. هذا لا يعني سلامة مطلقة.');
  }

  for (const status of statuses) {
    if (status.conditions_ar && !notes.includes(status.conditions_ar)) notes.push(status.conditions_ar);
  }

  if (entry.notes_ar && !notes.includes(entry.notes_ar)) notes.push(entry.notes_ar);

  return {
    ...base,
    regulatory_label_ar: primaryLabel,
    severity: primarySeverity,
    applied_limits: applied,
    notes_ar: notes,
  };
}

function completenessOf(results: CosmeticsIngredientResult[]): DataCompleteness {
  const total = results.length;
  const matched = results.filter((result) => result.matched).length;
  const percent = total === 0 ? 0 : Math.round((matched / total) * 100);
  return {
    percent,
    level: percent === 100 ? 'complete' : percent >= 50 ? 'partial' : 'insufficient',
    missing_ar: results.filter((result) => !result.matched).map((result) => result.raw),
    notes_ar: [
      'نسبة الاكتمال تقيس مدى تغطية قاعدة المعرفة للمكونات، وليست نسبة سلامة المنتج.',
      'ترتيب المكونات في قائمة INCI لا يعطي تركيزًا رقميًا، ولا يجوز استنتاج النسبة من الترتيب.',
    ],
  };
}

export function evaluateCosmetics(
  product: CosmeticsProductInput,
  cosmeticIngredients: CosmeticIngredient[],
  kbVersion: string,
): CosmeticsEvaluationResult {
  const parsed = splitIngredientList(product.ingredientsText);
  const lookup = new Map<string, CosmeticIngredient>();

  for (const ingredient of cosmeticIngredients) {
    const keys = [
      ingredient.name_en,
      ingredient.inci_name,
      ingredient.name_ar,
      ...ingredient.synonyms_en,
      ...ingredient.synonyms_ar,
    ];
    for (const key of keys) {
      const normalized = cosmeticAliasKey(normalizeText(key));
      if (normalized.length >= 3 && !lookup.has(normalized)) lookup.set(normalized, ingredient);
    }
  }

  const context = buildContext(product);
  const results: CosmeticsIngredientResult[] = parsed.map((token, index) => {
    const normalized = cosmeticAliasKey(normalizeText(stripCiParenthetical(token.raw)));
    let entry = lookup.get(normalized);

    if (!entry) {
      const candidates = [...lookup.entries()]
        .filter(([key]) => key.length >= 5 && (normalized.includes(key) || key.includes(normalized)))
        .sort((a, b) => b[0].length - a[0].length);
      if (candidates.length > 0) entry = candidates[0][1];
    }

    const provided = product.concentrations[token.raw];
    const concentration =
      typeof provided === 'number' && Number.isFinite(provided) && provided >= 0
        ? provided
        : token.concentration;

    return buildIngredientResult(token.raw, concentration, entry, product, context, index);
  });

  const unknownIngredients = results.filter((result) => !result.matched).map((result) => result.raw);

  const counts = {
    prohibited: results.filter((result) => result.regulatory_label_ar === 'محظور').length,
    restricted: results.filter((result) =>
      [
        'مقيد',
        'مادة حافظة مسموحة',
        'مرشح UV مسموح',
        'قيد يحتاج تركيزًا',
        'يتجاوز حدًا تنظيميًا',
        'استخدام مشروط',
        'قيد غير منطبق على هذه الفئة',
        'غير مسموح في هذه الفئة',
      ].includes(result.regulatory_label_ar),
    ).length,
    labelling: results.filter((result) => result.regulatory_label_ar.startsWith('وسم إلزامي')).length,
    unknown: unknownIngredients.length,
    no_specific_restriction: results.filter(
      (result) => result.matched && result.regulatory_label_ar === 'لا قيد محدد في قاعدة المعرفة',
    ).length,
  };

  const alerts: EvaluationAlert[] = [];
  const referenceIds = new Set<string>(['REF-EU-1223-2009', 'REF-EU-1223-ANNEX-II', 'REF-EU-1223-ANNEX-III', 'REF-EU-1223-ANNEX-V', 'REF-EU-1223-ANNEX-VI']);

  for (const result of results) {
    const entry = result.entry;
    if (!entry) {
      // Base ingredients (water) are matched but have no knowledge-base entry;
      // they must not be reported as unknown or as a coverage gap.
      if (result.matched) continue;
      alerts.push({
        id: `unknown-${result.position}`,
        severity: 'insufficient',
        title_ar: `مكوّن غير مدرج: ${result.raw}`,
        message_ar:
          'لا تتوفر في قاعدة المعرفة معلومات كافية لإصدار حكم موثوق على هذا المكوّن. لا تُفسَّر هذه النتيجة على أنها سلامة.',
        reference_ids: [],
      });
      continue;
    }

    for (const ref of entry.regulatory_status.flatMap((status) => status.reference_ids)) referenceIds.add(ref);
    for (const ref of entry.limits.flatMap((limit) => limit.reference_ids)) referenceIds.add(ref);
    for (const ref of entry.scientific_assessment.flatMap((item) => item.reference_ids)) referenceIds.add(ref);

    if (result.severity === 'regulatory') {
      alerts.push({
        id: `regulatory-${entry.id}`,
        severity: 'regulatory',
        title_ar: `${entry.name_ar}: ${result.regulatory_label_ar}`,
        message_ar:
          result.applied_limits.find((limit) => limit.result === 'exceeds_limit')?.message_ar ??
          entry.regulatory_status[0]?.conditions_ar ??
          'توجد مخالفة أو حظر تنظيمي.',
        ingredient_id: entry.id,
        reference_ids: entry.regulatory_status.flatMap((status) => status.reference_ids),
      });
    } else if (result.severity === 'attention') {
      alerts.push({
        id: `attention-${entry.id}`,
        severity: 'attention',
        title_ar: `${entry.name_ar}: ${result.regulatory_label_ar}`,
        message_ar:
          result.applied_limits.find((limit) => limit.result === 'concentration_unknown')?.message_ar ??
          entry.regulatory_status[0]?.conditions_ar ??
          'يحتاج هذا المكوّن إلى مراجعة إضافية.',
        ingredient_id: entry.id,
        reference_ids: entry.regulatory_status.flatMap((status) => status.reference_ids),
      });
    }
  }

  if (counts.prohibited > 0) {
    alerts.unshift({
      id: 'prohibited-summary',
      severity: 'regulatory',
      title_ar: 'يحتوي المنتج على مكوّن محظور',
      message_ar:
        'رصد المحرك مكوّنًا أو أكثر مدرجًا في الملحق II من اللائحة (EC) 1223/2009. وجود مكوّن محظور يعني أن المنتج لا يستوفي متطلبات الاتحاد الأوروبي بغض النظر عن تركيزه.',
      reference_ids: ['REF-EU-1223-ANNEX-II'],
    });
  }

  if (unknownIngredients.length > 0) {
    alerts.push({
      id: 'unknown-summary',
      severity: 'insufficient',
      title_ar: 'مكونات خارج تغطية قاعدة المعرفة',
      message_ar: `${unknownIngredients.length} مكوّنًا لم يُطابق. غياب المكوّن من قاعدة المعرفة لا يعني أنه آمن، ولا يمكن للمنصة إصدار حكم عليه.`,
      reference_ids: [],
    });
  }

  alerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return {
    kind: 'cosmetics',
    id: uid(),
    generated_at: new Date().toISOString(),
    kb_version: kbVersion,
    product,
    ingredients: results,
    unknownIngredients,
    completeness: completenessOf(results),
    counts,
    alerts,
    reference_ids: [...referenceIds],
    limitations_ar: [
      'لا تُصدر المنصة درجة مركبة أو مجموعًا واحدًا للمنتج التجميلي؛ تُعرض المحاور التنظيمية منفصلة.',
      'الحدود التنظيمية لا تعني أن المادة آمنة لكل شخص أو لكل استخدام؛ قد تسبب الحساسية حتى ضمن الحد.',
      'لا تُستنتج التراكيز من ترتيب INCI. عند غياب التركيز، لا يمكن التحقق من الحدود ويُعرض ذلك صراحة.',
      'قاعدة المعرفة تغطي 50 مكوّنًا ذا أولوية فقط، وليست قائمة كاملة بملاحق اللائحة.',
      'الامتثال التنظيمي ليس شهادة سلامة، والمنصة لا تستبدل تقييم المختص أو الجهة الرقابية.',
    ],
  };
}
