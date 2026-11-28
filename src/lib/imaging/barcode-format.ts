export type RetailBarcodeFormat = 'EAN-13' | 'EAN-8' | 'UPC-A' | 'UPC-E' | 'GTIN-14';

export interface BarcodeValidation {
  raw: string;
  digits: string;
  format: RetailBarcodeFormat | null;
  valid: boolean;
  checkDigit: number | null;
  expectedCheckDigit: number | null;
  message_ar: string;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Keeps only digits, converting Arabic-Indic and Persian digits first. */
export function barcodeDigits(input: string): string {
  return (input ?? '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EXTENDED_ARABIC_DIGITS.indexOf(digit)))
    .replace(/\D+/g, '');
}

/** GS1 modulo-10 check digit for a body without its final check digit. */
export function gs1CheckDigit(body: string): number {
  const digits = barcodeDigits(body);
  let sum = 0;
  let weight = 3;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** Expands an 8-digit UPC-E value to its 12-digit UPC-A equivalent. */
export function expandUpcE(value: string): string | null {
  const digits = barcodeDigits(value);
  if (digits.length !== 8) return null;
  const numberSystem = digits[0];
  if (numberSystem !== '0' && numberSystem !== '1') return null;
  const payload = digits.slice(1, 7);
  const last = payload[5];
  let manufacturer = '';
  let product = '';
  if (last === '0' || last === '1' || last === '2') {
    manufacturer = `${payload.slice(0, 2)}${last}00`;
    product = `00${payload.slice(2, 5)}`;
  } else if (last === '3') {
    manufacturer = `${payload.slice(0, 3)}00`;
    product = `000${payload.slice(3, 5)}`;
  } else if (last === '4') {
    manufacturer = `${payload.slice(0, 4)}0`;
    product = `0000${payload[4]}`;
  } else {
    manufacturer = payload.slice(0, 5);
    product = `0000${last}`;
  }
  const body = `${numberSystem}${manufacturer}${product}`;
  if (body.length !== 11) return null;
  return `${body}${gs1CheckDigit(body)}`;
}

function validateStandard(
  digits: string,
  format: RetailBarcodeFormat,
): { valid: boolean; expected: number | null; actual: number | null } {
  if (digits.length < 2) return { valid: false, expected: null, actual: null };
  const body = digits.slice(0, -1);
  const expected = gs1CheckDigit(body);
  const actual = Number(digits[digits.length - 1]);
  return { valid: expected === actual, expected, actual };
}

/**
 * Validates a retail barcode without discarding leading zeros.
 * `hint` comes from the decoder and disambiguates 8-digit EAN-8 vs UPC-E.
 */
export function validateBarcode(input: string, hint?: string | null): BarcodeValidation {
  const raw = (input ?? '').trim();
  const digits = barcodeDigits(raw);
  const normalizedHint = (hint ?? '').toUpperCase().replace(/[\s_-]/g, '');

  if (!digits) {
    return {
      raw,
      digits,
      format: null,
      valid: false,
      checkDigit: null,
      expectedCheckDigit: null,
      message_ar: 'لم يُقرأ أي رقم. أدخل الباركود يدويًا أو أعد التصوير.',
    };
  }

  const finish = (
    format: RetailBarcodeFormat,
    result: { valid: boolean; expected: number | null; actual: number | null },
  ): BarcodeValidation => ({
    raw,
    digits,
    format,
    valid: result.valid,
    checkDigit: result.actual,
    expectedCheckDigit: result.expected,
    message_ar: result.valid
      ? `باركود ${format} صالح، ورقم التحقق صحيح.`
      : `رقم التحقق غير مطابق لباركود ${format}. قد يكون الرقم مقروءًا خطأً أو تالفًا.`,
  });

  if (normalizedHint.includes('UPC') && normalizedHint.includes('E')) {
    const expanded = expandUpcE(digits);
    if (!expanded) {
      return {
        raw,
        digits,
        format: 'UPC-E',
        valid: false,
        checkDigit: null,
        expectedCheckDigit: null,
        message_ar: 'باركود UPC-E يجب أن يكون 8 أرقام ويبدأ بـ 0 أو 1.',
      };
    }
    const result = validateStandard(expanded, 'UPC-A');
    return {
      raw,
      digits,
      format: 'UPC-E',
      valid: result.valid,
      checkDigit: Number(expanded[expanded.length - 1]),
      expectedCheckDigit: result.expected,
      message_ar: result.valid
        ? 'باركود UPC-E صالح بعد توسيعه إلى UPC-A، ورقم التحقق صحيح.'
        : 'رقم التحقق في UPC-E غير مطابق بعد التوسيع إلى UPC-A.',
    };
  }

  if (normalizedHint.includes('GTIN14') || normalizedHint.includes('ITF14')) {
    return digits.length === 14
      ? finish('GTIN-14', validateStandard(digits, 'GTIN-14'))
      : {
          raw,
          digits,
          format: 'GTIN-14',
          valid: false,
          checkDigit: null,
          expectedCheckDigit: null,
          message_ar: 'باركود GTIN-14 يجب أن يكون 14 رقمًا.',
        };
  }

  if (normalizedHint.includes('EAN13')) {
    return digits.length === 13
      ? finish('EAN-13', validateStandard(digits, 'EAN-13'))
      : {
          raw,
          digits,
          format: 'EAN-13',
          valid: false,
          checkDigit: null,
          expectedCheckDigit: null,
          message_ar: 'باركود EAN-13 يجب أن يكون 13 رقمًا.',
        };
  }

  if (normalizedHint.includes('EAN8')) {
    return digits.length === 8
      ? finish('EAN-8', validateStandard(digits, 'EAN-8'))
      : {
          raw,
          digits,
          format: 'EAN-8',
          valid: false,
          checkDigit: null,
          expectedCheckDigit: null,
          message_ar: 'باركود EAN-8 يجب أن يكون 8 أرقام.',
        };
  }

  if (normalizedHint.includes('UPCA')) {
    return digits.length === 12
      ? finish('UPC-A', validateStandard(digits, 'UPC-A'))
      : {
          raw,
          digits,
          format: 'UPC-A',
          valid: false,
          checkDigit: null,
          expectedCheckDigit: null,
          message_ar: 'باركود UPC-A يجب أن يكون 12 رقمًا.',
        };
  }

  if (digits.length === 14) return finish('GTIN-14', validateStandard(digits, 'GTIN-14'));
  if (digits.length === 13) {
    const result = validateStandard(digits, 'EAN-13');
    const note =
      digits.startsWith('0') && result.valid
        ? ' الباركود يبدأ بصفر؛ قد يكون UPC-A موسّعًا إلى EAN-13.'
        : '';
    const base = finish('EAN-13', result);
    return { ...base, message_ar: `${base.message_ar}${note}` };
  }
  if (digits.length === 12) return finish('UPC-A', validateStandard(digits, 'UPC-A'));
  if (digits.length === 8) {
    const ean8 = validateStandard(digits, 'EAN-8');
    if (ean8.valid) return finish('EAN-8', ean8);
    const upcA = expandUpcE(digits);
    if (upcA) {
      const upcE = validateStandard(upcA, 'UPC-A');
      if (upcE.valid) {
        return {
          raw,
          digits,
          format: 'UPC-E',
          valid: true,
          checkDigit: Number(upcA[upcA.length - 1]),
          expectedCheckDigit: upcE.expected,
          message_ar: 'باركود UPC-E صالح بعد توسيعه إلى UPC-A، ورقم التحقق صحيح.',
        };
      }
    }
    return finish('EAN-8', ean8);
  }

  return {
    raw,
    digits,
    format: null,
    valid: false,
    checkDigit: null,
    expectedCheckDigit: null,
    message_ar: 'طول الباركود غير مدعوم. المدعوم: EAN-13 وEAN-8 وUPC-A وUPC-E وGTIN-14.',
  };
}

/** Maps ZXing canonical names such as "EAN13" to the display format. */
export function formatFromDecoder(value: string | null | undefined): RetailBarcodeFormat | null {
  const normalized = (value ?? '').toUpperCase().replace(/[\s_-]/g, '');
  if (normalized.includes('EAN13')) return 'EAN-13';
  if (normalized.includes('EAN8')) return 'EAN-8';
  if (normalized.includes('UPCA')) return 'UPC-A';
  if (normalized.includes('UPCE')) return 'UPC-E';
  if (normalized.includes('ITF14') || normalized.includes('GTIN14')) return 'GTIN-14';
  return null;
}
