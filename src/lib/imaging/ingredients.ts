import { canonicalENumber, normalizeText, splitIngredientList } from '../normalize';
import type { IngredientsParseResult, OcrLine, ParsedIngredientItem } from './types';

const PREFIX_PATTERN =
  /^\s*(?:ingredients?|composition|inci|full ingredients?|المكونات|المكوّنات|قائمة المكونات|قائمة المكوّنات|التركيب)\s*[:\-–—]?\s*/i;

const BULLET_PATTERN = /^\s*(?:[-•*▪◦]|\d{1,2}\s*[.)])\s*/;

const ALLERGEN_TERMS = [
  'milk',
  'lactose',
  'gluten',
  'wheat',
  'soy',
  'soya',
  'egg',
  'peanut',
  'nuts',
  'almond',
  'hazelnut',
  'walnut',
  'cashew',
  'pistachio',
  'sesame',
  'fish',
  'shellfish',
  'crustacean',
  'sulphite',
  'sulfite',
  'celery',
  'mustard',
  'lupin',
  'mollusc',
  'حليب',
  'لبن',
  'لاكتوز',
  'غلوتين',
  'قمح',
  'صويا',
  'بيض',
  'فول سوداني',
  'مكسرات',
  'لوز',
  'بندق',
  'جوز',
  'كاجو',
  'فستق',
  'سمسم',
  'سمك',
  'قشريات',
  'كبريتيت',
  'كرفس',
  'خردل',
];

function cleanToken(raw: string): string {
  return raw
    .replace(BULLET_PATTERN, '')
    .replace(/^[\s:;،,.-]+|[\s:;،,.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoise(token: string): boolean {
  const normalized = normalizeText(token);
  if (!normalized) return true;
  if (['and', 'or', 'و', 'او', 'أو', 'contains', 'may contain', 'يحتوي', 'قد يحتوي'].includes(normalized)) {
    return true;
  }
  if (/^(ingredients?|composition|inci|المكونات|المكوّنات)$/.test(normalized)) return true;
  return false;
}

function extractENumbers(raw: string): string[] {
  const matches = [...raw.matchAll(/\bE\s*[-–—]?\s*(\d{3}[a-zA-Z]?)\b/g)];
  return [...new Set(matches.map((match) => canonicalENumber(`E${match[1]}`)))];
}

function extractParenthetical(raw: string): string[] {
  return [...raw.matchAll(/[\(\[]([^\)\]]+)[\)\]]/g)]
    .map((match) => match[1].replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function findIngredientLine(raw: string, lines: OcrLine[]): OcrLine | null {
  const normalizedRaw = normalizeText(raw);
  if (!normalizedRaw) return null;
  let best: OcrLine | null = null;
  for (const line of lines) {
    const normalizedLine = normalizeText(line.text);
    if (!normalizedLine) continue;
    if (normalizedLine.includes(normalizedRaw) || normalizedRaw.includes(normalizedLine)) {
      if (!best || line.confidence > best.confidence) best = line;
    }
  }
  return best;
}

/**
 * Splits an OCR ingredient list while preserving order and parenthetical
 * compounds. It flags likely OCR errors but never treats an unknown ingredient
 * as safe or as a known additive.
 */
export function parseIngredients(
  text: string,
  lines: OcrLine[] = [],
  kind: 'food' | 'cosmetics' = 'food',
  overallConfidence = 70,
): IngredientsParseResult {
  const rawText = text ?? '';
  const warnings: string[] = [];
  const cleaned = rawText.replace(PREFIX_PATTERN, '').trim();
  const tokens = splitIngredientList(cleaned);

  const items: ParsedIngredientItem[] = tokens
    .map((token, index): ParsedIngredientItem | null => {
      const raw = cleanToken(token.raw);
      if (!raw || isNoise(raw)) return null;
      const line = findIngredientLine(raw, lines);
      const confidence = line?.confidence ?? overallConfidence;
      const suspicious =
        confidence < 70 ||
        raw.length < 2 ||
        /[|_]{1,}|[.]{3,}|[A-Za-z]{25,}/.test(raw) ||
        (!/[a-zA-Z\u0600-\u06FF]/.test(raw) && !/\d/.test(raw));
      const note = suspicious
        ? 'احتمال خطأ OCR: راجع تهجئة هذا المكوّن قبل الاعتماد عليه.'
        : undefined;
      return {
        raw,
        position: index,
        confidence,
        needsReview: suspicious,
        eNumbers: extractENumbers(raw),
        parenthetical: extractParenthetical(raw),
        note_ar: note,
      };
    })
    .filter((item): item is ParsedIngredientItem => item !== null);

  if (items.length === 0) {
    warnings.push('لم نعثر على مكونات قابلة للقراءة. أعد التصوير أو الصق القائمة يدويًا.');
  }
  if (items.some((item) => item.needsReview)) {
    warnings.push('بعض المكونات منخفضة الثقة أو تبدو مشوّهة. راجعها قبل التقييم.');
  }
  if (kind === 'food') {
    const allergens = items.flatMap((item) =>
      ALLERGEN_TERMS.filter((term) => normalizeText(item.raw).includes(normalizeText(term))),
    );
    if (allergens.length > 0) {
      warnings.push(
        `ذُكرت مسببات حساسية محتملة: ${[...new Set(allergens)].slice(0, 8).join('، ')}. راجع العبارة الرسمية على الملصق.`,
      );
    }
  }
  if (kind === 'cosmetics' && items.some((item) => item.parenthetical.length > 0)) {
    warnings.push('الأقواس محفوظة كما هي؛ لا تُستنتج التراكيز من ترتيب INCI.');
  }

  return { items, warnings_ar: [...new Set(warnings)], rawText, kind };
}

/** Joins reviewed ingredient items back into a stable comma-separated list. */
export function ingredientsToText(items: Array<{ raw: string }>): string {
  return items
    .map((item) => item.raw.trim())
    .filter(Boolean)
    .join(', ');
}
