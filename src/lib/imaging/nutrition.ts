import { normalizeText } from '../normalize';
import type {
  NutritionBasisDetection,
  NutritionFieldKey,
  NutritionParseResult,
  OcrLine,
  OcrWord,
  ParsedNutritionField,
  ParsedServingSize,
} from './types';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic/Persian digits and decimal separators while keeping text readable. */
export function normalizeNumbers(input: string): string {
  return (input ?? '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EXTENDED_ARABIC_DIGITS.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .replace(/(\d)\s*[،,]\s*(\d)/g, '$1.$2');
}

interface NumberToken {
  value: number;
  unit: string | null;
  x: number | null;
  raw: string;
  confidence: number;
}

interface NutrientRule {
  key: NutritionFieldKey;
  aliases: string[];
  defaultUnit: string;
  energy?: boolean;
  exclude?: RegExp;
}

const RULES: NutrientRule[] = [
  {
    key: 'fat_saturated_g',
    aliases: [
      'saturated fat',
      'saturates',
      'sat fat',
      'sat. fat',
      'of which saturates',
      'دهون مشبعة',
      'الدهون المشبعة',
      'منها دهون مشبعة',
      'مشبعة',
    ],
    defaultUnit: 'g',
  },
  {
    key: 'fat_trans_g',
    aliases: ['trans fat', 'trans-fat', 'transfat', 'دهون متحولة', 'الدهون المتحولة', 'دهون ترانس'],
    defaultUnit: 'g',
  },
  {
    key: 'sugars_added_g',
    aliases: ['added sugars', 'added sugar', 'سكريات مضافة', 'السكريات المضافة'],
    defaultUnit: 'g',
  },
  {
    key: 'sugars_total_g',
    aliases: [
      'total sugars',
      'total sugar',
      'of which sugars',
      'sugars',
      'sugar',
      'السكريات الكلية',
      'إجمالي السكريات',
      'السكريات',
      'سكريات',
      'منها سكريات',
    ],
    defaultUnit: 'g',
  },
  {
    key: 'carbohydrates_g',
    aliases: ['total carbohydrate', 'carbohydrates', 'carbohydrate', 'carbs', 'الكربوهيدرات', 'كربوهيدرات'],
    defaultUnit: 'g',
  },
  {
    key: 'fat_total_g',
    aliases: ['total fat', 'fat', 'الدهون الكلية', 'إجمالي الدهون', 'الدهون', 'دهون'],
    defaultUnit: 'g',
    exclude: /energy\s+from\s+fat|الطاقة\s+من\s+الدهون/,
  },
  {
    key: 'fibre_g',
    aliases: [
      'dietary fibre',
      'dietary fiber',
      'total fibre',
      'total fiber',
      'fibre',
      'fiber',
      'الألياف الغذائية',
      'ألياف غذائية',
      'الألياف',
      'ألياف',
    ],
    defaultUnit: 'g',
  },
  {
    key: 'protein_g',
    aliases: ['protein', 'البروتين', 'بروتين'],
    defaultUnit: 'g',
  },
  {
    key: 'sodium_mg',
    aliases: ['sodium', 'الصوديوم', 'صوديوم'],
    defaultUnit: 'mg',
  },
  {
    key: 'salt_g',
    aliases: ['salt', 'الملح', 'ملح'],
    defaultUnit: 'g',
  },
  {
    key: 'fruit_veg_nuts_percent',
    aliases: [
      'fruits vegetables nuts',
      'fruit vegetables nuts',
      'fruits vegetables and nuts',
      'fruit veg nuts',
      'الفواكه والخضروات والمكسرات',
      'فواكه وخضروات ومكسرات',
    ],
    defaultUnit: '%',
  },
  {
    key: 'energy_kj',
    aliases: ['energy', 'calories', 'calorie', 'الطاقة', 'طاقة', 'سعرات حرارية', 'سعرات', 'كالوري'],
    defaultUnit: 'kcal',
    energy: true,
    exclude: /energy\s+from\s+fat|الطاقة\s+من\s+الدهون/,
  },
];

const RULES_SORTED = [...RULES].sort((a, b) => {
  const longest = (rule: NutrientRule) =>
    rule.aliases.reduce((max, alias) => Math.max(max, normalizeText(alias).length), 0);
  return longest(b) - longest(a);
});

const SERVING_ALIASES = [
  'serving size',
  'serving',
  'portion',
  'حجم الحصة',
  'حجم الحصه',
  'الحصة',
  'الحصه',
  'حصة',
];

const HEADER_PATTERN = /nutrition facts|nutrition information|average values|per 100|لكل 100|القيم الغذائية|المعلومات الغذائية|حقائق غذائية/;
const SERVING_HEADER_PATTERN = /per serving|per portion|لكل حصة|لكل حصه|الحصة|الحصه|حجم الحصة|حجم الحصه/;
const BASIS_100_PATTERN = /(?:per|each|لكل|في)\s*100\s*(?:g|ml|غ|مل)|100\s*(?:g|ml|غ|مل)/;

const UNIT_PATTERN = /(kcal|ككال|كالوري|kj|كج|كيلوجول|mg|ملغ|مغ|مجم|ml|مل|g|غ|جم|غرام|%)/i;

function unitFromText(input: string): string | null {
  const text = normalizeNumbers(input).toLowerCase().trim();
  if (/kcal|ككال|كالوري/.test(text)) return 'kcal';
  if (/kj|كج|كيلوجول/.test(text)) return 'kj';
  if (/(^|\d)\s*(mg|ملغ|مغ|مجم)$/.test(text)) return 'mg';
  if (/(^|\d)\s*(g|غ|جم|غرام)$/.test(text) || text === 'g') return 'g';
  if (/(^|\d)\s*(ml|مل)$/.test(text)) return 'ml';
  if (/%/.test(text)) return '%';
  return null;
}

function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase();
  if (['kcal', 'ككال', 'كالوري'].includes(normalized)) return 'kcal';
  if (['kj', 'كج', 'كيلوجول'].includes(normalized)) return 'kj';
  if (['mg', 'ملغ', 'مغ', 'مجم'].includes(normalized)) return 'mg';
  if (['g', 'غ', 'جم', 'غرام'].includes(normalized)) return 'g';
  if (['ml', 'مل'].includes(normalized)) return 'ml';
  if (normalized === '%') return '%';
  return normalized;
}

function wordCenter(word: OcrWord): number {
  return (word.x0 + word.x1) / 2;
}

function extractNumberTokens(line: string, words: OcrWord[] | undefined, confidence: number): NumberToken[] {
  const normalized = normalizeNumbers(line);
  const tokens: NumberToken[] = [];

  if (words && words.length > 0) {
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const wordText = normalizeNumbers(word.text);
      const match = wordText.match(/(\d+(?:\.\d+)?)/);
      if (!match) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      const unit =
        normalizeUnit(unitFromText(wordText)) ??
        normalizeUnit(unitFromText(words[index + 1]?.text ?? ''));
      tokens.push({
        value,
        unit,
        x: wordCenter(word),
        raw: word.text,
        confidence: word.confidence || confidence,
      });
    }
    if (tokens.length > 0) return tokens;
  }

  const regex = /(\d+(?:\.\d+)?)\s*(kcal|ككال|كالوري|kj|كج|كيلوجول|mg|ملغ|مغ|مجم|ml|مل|g|غ|جم|غرام|%)?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    tokens.push({
      value,
      unit: normalizeUnit(match[2] ?? null),
      x: null,
      raw: match[0],
      confidence,
    });
  }
  return tokens;
}

function matchableText(input: string): string {
  // OCR often merges the label and its value ("Salt0.8g", "Per100g").
  return normalizeText(input.replace(/([A-Za-z\u0600-\u06FF])(\d)/g, '$1 $2'));
}

function lineMatchesRule(line: string, rule: NutrientRule): boolean {
  const haystack = ` ${matchableText(line)} `;
  if (rule.exclude && rule.exclude.test(haystack)) return false;
  return rule.aliases.some((alias) => {
    const normalized = normalizeText(alias);
    return normalized.length > 0 && haystack.includes(` ${normalized} `);
  });
}

function findRule(line: string): NutrientRule | null {
  for (const rule of RULES_SORTED) {
    if (lineMatchesRule(line, rule)) return rule;
  }
  return null;
}

function lineMatchesServing(line: string): boolean {
  const haystack = ` ${matchableText(line)} `;
  return SERVING_ALIASES.some((alias) => haystack.includes(` ${normalizeText(alias)} `));
}

/**
 * True when a line looks like a nutrition table row (a known label plus a
 * numeric value). Used to keep table rows out of ingredient parsing when a
 * single photo contains both sections.
 */
export function isNutritionRowText(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  const normalized = matchableText(text);
  if (HEADER_PATTERN.test(normalized)) return true;
  if (BASIS_100_PATTERN.test(normalized)) return true;
  if (lineMatchesServing(text) && /\d/.test(text)) return true;
  return findRule(text) !== null && /\d/.test(text);
}

function chooseToken(
  tokens: NumberToken[],
  anchors: { per100X: number | null },
): { token: NumberToken; ambiguous: boolean } | null {
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return { token: tokens[0], ambiguous: false };

  if (anchors.per100X !== null) {
    const withX = tokens.filter((token) => token.x !== null);
    if (withX.length > 0) {
      const closest = withX.reduce((best, token) =>
        Math.abs((token.x as number) - anchors.per100X!) <
        Math.abs((best.x as number) - anchors.per100X!)
          ? token
          : best,
      );
      if (Math.abs((closest.x as number) - anchors.per100X) <= 260) {
        return { token: closest, ambiguous: false };
      }
    }
  }

  return { token: tokens[0], ambiguous: true };
}

function canonicalValue(
  key: NutritionFieldKey,
  value: number,
  unit: string | null,
): { value: number; unit: string; note_ar?: string } {
  if (key === 'sodium_mg') {
    if (unit === 'g') {
      return { value: value * 1000, unit: 'mg', note_ar: 'حُوّل الصوديوم من غرام إلى مليغرام.' };
    }
    return { value, unit: 'mg' };
  }
  if (key === 'salt_g') {
    if (unit === 'mg') {
      return { value: value / 1000, unit: 'g', note_ar: 'حُوّل الملح من مليغرام إلى غرام.' };
    }
    return { value, unit: 'g' };
  }
  if (key === 'fruit_veg_nuts_percent') {
    return { value, unit: '%' };
  }
  if (key === 'energy_kj') return { value, unit: 'kj' };
  if (key === 'energy_kcal') return { value, unit: 'kcal' };
  if (unit === 'mg') {
    return { value: value / 1000, unit: 'g', note_ar: 'حُوّلت القيمة من مليغرام إلى غرام.' };
  }
  return { value, unit: 'g' };
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function basisLabel(basis: NutritionBasisDetection): string {
  if (basis === '100g') return 'لكل 100 غرام';
  if (basis === '100ml') return 'لكل 100 ملليلتر';
  if (basis === 'serving') return 'لكل حصة';
  return 'أساس غير محدد';
}

function detectBasis(lines: OcrLine[]): {
  basis: NutritionBasisDetection;
  per100X: number | null;
  servingX: number | null;
} {
  let basis: NutritionBasisDetection = 'unknown';
  let per100X: number | null = null;
  let servingX: number | null = null;

  for (const line of lines) {
    const normalized = matchableText(line.text);
    const has100 = BASIS_100_PATTERN.test(normalized);
    const hasServing = SERVING_HEADER_PATTERN.test(normalized);

    if (has100) {
      basis = /ml|مل/.test(normalized) ? '100ml' : '100g';
      const word = line.words.find((item) => /100/.test(normalizeNumbers(item.text)));
      if (word) per100X = wordCenter(word);
    }

    if (hasServing) {
      const word = line.words.find((item) =>
        /serving|portion|حصة|حصه|الحصة|الحصه/.test(normalizeText(item.text)),
      );
      if (word) servingX = wordCenter(word);
      if (!has100 && basis === 'unknown') basis = 'serving';
    }
  }

  return { basis, per100X, servingX };
}

function parseServingSize(line: string, tokens: NumberToken[]): ParsedServingSize | null {
  for (const token of tokens) {
    const unit = normalizeUnit(token.unit);
    if (unit === 'g' || unit === 'ml') {
      return { value: token.value, unit, raw: line.trim() };
    }
  }
  return null;
}

/**
 * Parses a nutrition label from OCR text. The parser never invents values:
 * ambiguous columns are kept and marked for review, and per-serving values are
 * only converted when a numeric serving size is present.
 */
export function parseNutritionLabel(
  text: string,
  lines: OcrLine[] = [],
  overallConfidence = 70,
): NutritionParseResult {
  const rawText = text ?? '';
  const sourceLines: OcrLine[] =
    lines.length > 0
      ? lines
      : rawText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ text: line, confidence: overallConfidence, words: [] }));

  const warnings: string[] = [];
  const fields: Partial<Record<NutritionFieldKey, ParsedNutritionField>> = {};
  const anchors = detectBasis(sourceLines);
  let basis = anchors.basis;
  let servingSize: ParsedServingSize | null = null;
  let convertedFromServing = false;

  for (const line of sourceLines) {
    const lineText = line.text.trim();
    if (!lineText) continue;
    const normalized = matchableText(lineText);
    if (!normalized) continue;
    if (HEADER_PATTERN.test(normalized)) {
      if (lineMatchesServing(lineText) && basis === 'unknown') basis = 'serving';
      continue;
    }
    if (SERVING_HEADER_PATTERN.test(normalized) && !findRule(lineText)) {
      continue;
    }

    if (lineMatchesServing(lineText) && !findRule(lineText)) {
      const tokens = extractNumberTokens(lineText, line.words, line.confidence);
      const parsed = parseServingSize(lineText, tokens);
      if (parsed) servingSize = parsed;
      continue;
    }

    const rule = findRule(lineText);
    if (!rule) continue;

    const tokens = extractNumberTokens(lineText, line.words, line.confidence);
    if (tokens.length === 0) continue;

    if (rule.energy) {
      let energyTokens = tokens.filter((token) => token.unit === 'kj' || token.unit === 'kcal');
      if (anchors.per100X !== null && energyTokens.some((token) => token.x !== null)) {
        const near = energyTokens.filter(
          (token) => token.x !== null && Math.abs(token.x - anchors.per100X!) <= 260,
        );
        if (near.length > 0) energyTokens = near;
      }
      const hasKj = energyTokens.some((token) => token.unit === 'kj');
      const hasKcal = energyTokens.some((token) => token.unit === 'kcal');

      if (hasKj || hasKcal) {
        for (const token of energyTokens) {
          const key: NutritionFieldKey = token.unit === 'kj' ? 'energy_kj' : 'energy_kcal';
          const canonical = canonicalValue(key, token.value, token.unit);
          fields[key] = {
            key,
            value: round(canonical.value),
            unit: canonical.unit,
            confidence: token.confidence || line.confidence || overallConfidence,
            needsReview: (token.confidence || line.confidence) < 75,
            sourceText: lineText,
            note_ar: canonical.note_ar,
          };
        }
      } else {
        const token = tokens[0];
        const key: NutritionFieldKey = /kj|كج|كيلوجول/.test(normalized) ? 'energy_kj' : 'energy_kcal';
        const canonical = canonicalValue(key, token.value, token.unit);
        fields[key] = {
          key,
          value: round(canonical.value),
          unit: canonical.unit,
          confidence: token.confidence || line.confidence || overallConfidence,
          needsReview: true,
          sourceText: lineText,
          note_ar: 'وحدة الطاقة غير واضحة في الصورة؛ راجع إن كانت كيلوجول أم كيلوكالوري.',
        };
      }
      continue;
    }

    const chosen = chooseToken(tokens, anchors);
    if (!chosen) continue;
    const { token, ambiguous } = chosen;
    const canonical = canonicalValue(rule.key, token.value, token.unit);
    const confidence = token.confidence || line.confidence || overallConfidence;
    const needsReview =
      confidence < 75 ||
      ambiguous ||
      (token.unit === null && rule.key !== 'fruit_veg_nuts_percent') ||
      (rule.key !== 'fruit_veg_nuts_percent' && canonical.value > 1000) ||
      basis === 'unknown';

    fields[rule.key] = {
      key: rule.key,
      value: round(canonical.value),
      unit: canonical.unit,
      confidence,
      needsReview,
      sourceText: lineText,
      note_ar: canonical.note_ar,
    };
  }

  if (basis === 'unknown' && servingSize) {
    basis = 'serving';
    warnings.push('لم نجد عنوان «لكل 100 غ/مل»؛ عُرضت القيم كما هي واعتُبرت لكل حصة. راجع الأساس قبل التقييم.');
  } else if (basis === 'unknown') {
    warnings.push('لم نتعرف على أساس القيم (لكل 100 غ/مل أو لكل حصة). راجع الأرقام والأساس يدويًا.');
  }

  if (basis === 'serving' && servingSize && servingSize.value > 0) {
    const factor = 100 / servingSize.value;
    for (const [key, field] of Object.entries(fields) as Array<[NutritionFieldKey, ParsedNutritionField]>) {
      fields[key] = {
        ...field,
        value: round(field.value * factor),
        needsReview: true,
        note_ar: [
          field.note_ar,
          `حُوّلت القيمة من حصة ${servingSize.value}${servingSize.unit} إلى 100${servingSize.unit}.`,
        ]
          .filter(Boolean)
          .join(' '),
      };
    }
    basis = servingSize.unit === 'ml' ? '100ml' : '100g';
    convertedFromServing = true;
    warnings.push(
      `حُوّلت القيم من حصة ${servingSize.value}${servingSize.unit} إلى أساس 100${servingSize.unit}. راجع التحويل قبل الاعتماد عليه.`,
    );
  } else if (basis === 'serving') {
    warnings.push('القيم لكل حصة، وحجم الحصة غير مقروء. أدخل حجم الحصة أو حوّل القيم إلى 100 غ/مل يدويًا.');
  }

  if (!fields.energy_kj && !fields.energy_kcal) {
    warnings.push('لم نعثر على قيمة الطاقة. أدخلها يدويًا إن كانت ظاهرة على الملصق.');
  }
  if (!fields.fat_saturated_g) warnings.push('لم نعثر على الدهون المشبعة.');
  if (!fields.sugars_total_g) warnings.push('لم نعثر على السكريات الكلية.');
  if (!fields.sodium_mg && !fields.salt_g) warnings.push('لم نعثر على الصوديوم أو الملح.');
  if (!fields.fibre_g) warnings.push('لم نعثر على الألياف.');
  if (!fields.protein_g) warnings.push('لم نعثر على البروتين.');
  if (!fields.fruit_veg_nuts_percent) {
    warnings.push('نسبة الفواكه والخضروات والمكسرات لا تظهر عادة على الملصق؛ أدخلها يدويًا من قائمة المكونات أو المصدر.');
  }

  return {
    basis,
    basisLabel_ar: basisLabel(basis),
    servingSize,
    fields,
    warnings_ar: [...new Set(warnings)],
    rawText,
    convertedFromServing,
  };
}
