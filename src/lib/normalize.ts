const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Normalizes Arabic/English text for matching without changing the original. */
export function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ـ\u200C\u200D]/g, '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Converts "E 102", "e-102", "E102" to the canonical token "e102". */
export function canonicalENumber(value: string): string {
  const compact = value.toLowerCase().replace(/[\s\-–—]/g, '');
  const match = compact.match(/e(\d{3}[a-z]?)/);
  return match ? `e${match[1]}` : compact;
}

/** Expands an E-number field such as "E 220–E 228" into individual aliases. */
export function eNumberAliases(value: string): string[] {
  const matches = [...value.toUpperCase().matchAll(/E\s*(\d{3}[A-Z]?)/g)].map((m) =>
    canonicalENumber(`E${m[1]}`),
  );
  if (matches.length === 2) {
    const first = Number(matches[0].slice(1, 4));
    const second = Number(matches[1].slice(1, 4));
    if (Number.isFinite(first) && Number.isFinite(second) && second > first && second - first <= 12) {
      const expanded: string[] = [];
      for (let n = first; n <= second; n += 1) expanded.push(`e${n}`);
      return expanded;
    }
  }
  return matches;
}

/** Replaces E-numbers inside free text with compact tokens, then normalizes. */
export function normalizeWithENumbers(input: string): string {
  const compacted = input.replace(/\bE\s*[-–—]?\s*(\d{3}[a-zA-Z]?)\b/g, (_m, n: string) =>
    ` e${n.toLowerCase()} `,
  );
  return normalizeText(compacted);
}

/**
 * Splits an ingredient list on commas, semicolons and newlines while respecting
 * parentheses. Extracts a trailing percentage when present.
 */
export function splitIngredientList(input: string): Array<{ raw: string; concentration: number | null }> {
  if (!input?.trim()) return [];
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  const text = input.replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    const isDecimalComma =
      char === ',' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '');

    const isSeparator =
      depth === 0 &&
      !isDecimalComma &&
      (char === ',' || char === ';' || char === '،' || char === '؛' || char === '\n');
    if (isSeparator) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const percentMatch = part.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*%\s*$/);
      if (!percentMatch) return { raw: part, concentration: null };
      const concentration = Number(percentMatch[1].replace(',', '.'));
      const raw = part.slice(0, percentMatch.index).trim();
      return { raw, concentration: Number.isFinite(concentration) ? concentration : null };
    })
    .filter((item) => item.raw.length > 0);
}

/** A conservative alias table for common INCI synonyms and salt forms. */
const COSMETIC_ALIASES: Record<string, string> = {
  'sodium methylparaben': 'methylparaben',
  'potassium methylparaben': 'methylparaben',
  'sodium propylparaben': 'propylparaben',
  'potassium propylparaben': 'propylparaben',
  'sodium butylparaben': 'butylparaben',
  'potassium butylparaben': 'butylparaben',
  'vitamin a': 'retinol',
  'retinyl acetate': 'retinol',
  'retinyl palmitate': 'retinol',
  bha: 'salicylic acid',
  'beta hydroxy acid': 'salicylic acid',
  'ci 77891': 'titanium dioxide',
  'ci 77947': 'zinc oxide',
  oxybenzone: 'benzophenone-3',
  avobenzone: 'butyl methoxydibenzoylmethane',
  lilial: 'butylphenyl methylpropional',
  'lily aldehyde': 'butylphenyl methylpropional',
  zpt: 'zinc pyrithione',
  'kathon cg': 'methylchloroisothiazolinone and methylisothiazolinone',
  formalin: 'formaldehyde',
  methanal: 'formaldehyde',
  ppd: 'p phenylenediamine',
  '1 4 diaminobenzene': 'p phenylenediamine',
};

export function cosmeticAliasKey(normalized: string): string {
  return COSMETIC_ALIASES[normalized] ?? normalized;
}

/** Strips a parenthetical CI number so "Titanium Dioxide (CI 77891)" still matches. */
export function stripCiParenthetical(raw: string): string {
  return raw.replace(/\(\s*ci\s*\d{5}\s*\)/gi, '').trim();
}
