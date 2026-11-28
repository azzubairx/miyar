import { useMemo, useState } from 'react';
import { Badge, Callout } from './ui';
import { AlertIcon, CheckIcon, ImageIcon, TrashIcon } from './Icons';
import { cosmeticIngredients, foodAdditives } from '../database';
import { findCosmeticIngredient, findFoodAdditive, isBaseIngredient } from '../lib/imaging/match';
import type {
  CapturedImage,
  IngredientsParseResult,
  NutritionFieldKey,
  NutritionParseResult,
  OcrImageResult,
} from '../lib/imaging/types';
import type { FoodNutritionInput } from '../types';

export interface ReviewPayload {
  productName: string;
  ingredientsText: string;
  nutrition: Partial<FoodNutritionInput>;
  nutritionBasis: '100g' | '100ml';
  servingSize: string;
  ocrConfidence: number;
}

const NUTRITION_ROWS: Array<{ key: NutritionFieldKey; label: string; unit: string }> = [
  { key: 'energy_kj', label: 'الطاقة', unit: 'كج' },
  { key: 'energy_kcal', label: 'الطاقة (بديل)', unit: 'ككال' },
  { key: 'fat_total_g', label: 'الدهون الكلية', unit: 'غ' },
  { key: 'fat_saturated_g', label: 'الدهون المشبعة', unit: 'غ' },
  { key: 'fat_trans_g', label: 'الدهون المتحولة', unit: 'غ' },
  { key: 'carbohydrates_g', label: 'الكربوهيدرات', unit: 'غ' },
  { key: 'sugars_total_g', label: 'السكريات الكلية', unit: 'غ' },
  { key: 'sugars_added_g', label: 'السكريات المضافة', unit: 'غ' },
  { key: 'fibre_g', label: 'الألياف', unit: 'غ' },
  { key: 'protein_g', label: 'البروتين', unit: 'غ' },
  { key: 'sodium_mg', label: 'الصوديوم', unit: 'مغ' },
  { key: 'salt_g', label: 'الملح', unit: 'غ' },
  { key: 'fruit_veg_nuts_percent', label: 'فواكه وخضروات ومكسرات', unit: '%' },
];

const ROLE_LABELS: Record<CapturedImage['role'], string> = {
  nutrition: 'جدول القيم الغذائية',
  ingredients: 'قائمة المكونات',
  front: 'واجهة المنتج',
  serving: 'معلومات الحصة',
  other: 'صورة أخرى',
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function confidenceTone(confidence: number): 'green' | 'amber' | 'clay' {
  if (confidence >= 85) return 'green';
  if (confidence >= 70) return 'amber';
  return 'clay';
}

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

interface IngredientRow {
  id: string;
  raw: string;
  confidence: number;
  needsReview: boolean;
  eNumbers: string[];
}

export default function OcrReview({
  kind,
  images,
  ocrResults,
  nutrition,
  ingredients,
  onConfirm,
  onCancel,
}: {
  kind: 'food' | 'cosmetics';
  images: CapturedImage[];
  ocrResults: OcrImageResult[];
  nutrition: NutritionParseResult | null;
  ingredients: IngredientsParseResult;
  onConfirm: (payload: ReviewPayload) => void;
  onCancel: () => void;
}) {
  const [productName, setProductName] = useState('');
  const [basis, setBasis] = useState<'100g' | '100ml'>(() => {
    if (nutrition?.basis === '100ml') return '100ml';
    return '100g';
  });
  const [servingSize, setServingSize] = useState(() => {
    const parsed = nutrition?.servingSize;
    return parsed ? `${parsed.value} ${parsed.unit}` : '';
  });
  const [values, setValues] = useState<Record<NutritionFieldKey, string>>(() => {
    const initial = {} as Record<NutritionFieldKey, string>;
    for (const row of NUTRITION_ROWS) {
      const field = nutrition?.fields[row.key];
      initial[row.key] = field ? String(field.value) : '';
    }
    return initial;
  });
  const [rows, setRows] = useState<IngredientRow[]>(() =>
    ingredients.items.map((item) => ({
      id: makeId(),
      raw: item.raw,
      confidence: item.confidence,
      needsReview: item.needsReview,
      eNumbers: item.eNumbers,
    })),
  );
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const overallConfidence = useMemo(() => {
    if (ocrResults.length === 0) return 0;
    const total = ocrResults.reduce((sum, item) => sum + (item.confidence || 0), 0);
    return Math.round(total / ocrResults.length);
  }, [ocrResults]);

  const reviewItems = useMemo(() => {
    const items: string[] = [];
    if (nutrition) {
      for (const row of NUTRITION_ROWS) {
        const field = nutrition.fields[row.key];
        if (field?.needsReview) items.push(`${row.label}: ${field.value} ${field.unit}`);
      }
    }
    for (const row of rows) {
      if (row.needsReview && row.raw.trim()) items.push(`مكوّن: ${row.raw}`);
    }
    return items;
  }, [nutrition, rows]);

  const unknownCount = useMemo(
    () =>
      rows.filter((row) => {
        if (!row.raw.trim()) return false;
        if (isBaseIngredient(row.raw)) return false;
        return kind === 'food'
          ? findFoodAdditive(row.raw, foodAdditives) === null
          : findCosmeticIngredient(row.raw, cosmeticIngredients) === null;
      }).length,
    [rows, kind],
  );

  const toggleOriginal = (id: string) => {
    setShowOriginal((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateRow = (id: string, raw: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, raw, needsReview: false } : row)),
    );
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { id: makeId(), raw: '', confidence: 0, needsReview: false, eNumbers: [] },
    ]);
  };

  const handleConfirm = () => {
    if (!confirmed) return;
    const nutritionPayload: Partial<FoodNutritionInput> = {};
    if (kind === 'food') {
      for (const row of NUTRITION_ROWS) {
        const parsed = toNumber(values[row.key]);
        if (parsed !== null) nutritionPayload[row.key] = parsed;
      }
    }
    const ingredientsText = rows
      .map((row) => row.raw.trim())
      .filter(Boolean)
      .join(', ');
    onConfirm({
      productName: productName.trim(),
      ingredientsText,
      nutrition: nutritionPayload,
      nutritionBasis: basis,
      servingSize: servingSize.trim(),
      ocrConfidence: overallConfidence,
    });
  };

  return (
    <div className="ocr-review" aria-live="polite">
      <div className="ocr-review-head">
        <div>
          <span className="mono-label">OCR REVIEW / مراجعة إلزامية</span>
          <h2>راجع البيانات قبل أي تقييم</h2>
          <p>
            هذه قراءة آلية من الصور، وليست حكمًا علميًا. صحّح الأرقام والمكونات حتى تطابق الملصق،
            ثم أكّد. لا يبدأ التقييم قبل تأكيدك.
          </p>
        </div>
        <div className="ocr-confidence">
          <span className="ocr-confidence-value">{overallConfidence}%</span>
          <span className="ocr-confidence-label">ثقة OCR الإجمالية</span>
        </div>
      </div>

      {reviewItems.length > 0 && (
        <Callout tone="attention" title={`${reviewItems.length} عنصرًا يحتاج مراجعة`}>
          <ul className="ocr-review-list">
            {reviewItems.slice(0, 12).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </Callout>
      )}

      <section className="ocr-review-section">
        <h3>الصور والنص المستخرج</h3>
        <div className="ocr-image-grid">
          {images.map((image) => {
            const result = ocrResults.find((item) => item.imageId === image.id);
            const original = showOriginal.has(image.id);
            return (
              <figure className="ocr-image-card" key={image.id}>
                <div className="ocr-image-frame">
                  <img
                    src={original ? image.originalDataUrl : image.processedDataUrl}
                    alt={`${ROLE_LABELS[image.role]} — ${original ? 'الصورة الأصلية' : 'الصورة المعالجة'}`}
                    loading="lazy"
                  />
                  <span className="ocr-image-role">{ROLE_LABELS[image.role]}</span>
                </div>
                <figcaption>
                  <div className="ocr-image-meta">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => toggleOriginal(image.id)}
                    >
                      <ImageIcon size={14} />
                      {original ? 'عرض المعالجة' : 'عرض الأصلية'}
                    </button>
                    {result && (
                      <Badge tone={confidenceTone(result.confidence)}>
                        ثقة {Math.round(result.confidence)}%
                      </Badge>
                    )}
                  </div>
                  {result && (
                    <details className="ocr-raw">
                      <summary>النص المستخرج</summary>
                      <pre dir="auto">{result.text || 'لم يُقرأ نص من هذه الصورة.'}</pre>
                    </details>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="ocr-review-section">
        <div className="ocr-field-row">
          <label htmlFor="ocr-product-name">اسم المنتج (اختياري الآن)</label>
          <input
            id="ocr-product-name"
            type="text"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="اكتب اسم المنتج كما يظهر على العبوة"
          />
        </div>
      </section>

      {kind === 'food' && nutrition && (
        <section className="ocr-review-section">
          <div className="ocr-section-head">
            <h3>القيم الغذائية</h3>
            <div className="segmented" role="group" aria-label="أساس القيم الغذائية">
              <button
                type="button"
                className={basis === '100g' ? 'is-selected' : ''}
                aria-pressed={basis === '100g'}
                onClick={() => setBasis('100g')}
              >
                لكل 100 غ
              </button>
              <button
                type="button"
                className={basis === '100ml' ? 'is-selected' : ''}
                aria-pressed={basis === '100ml'}
                onClick={() => setBasis('100ml')}
              >
                لكل 100 مل
              </button>
            </div>
          </div>

          {nutrition.warnings_ar.length > 0 && (
            <Callout tone="info" title="ملاحظات التحويل والقراءة">
              <ul className="ocr-review-list">
                {nutrition.warnings_ar.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </Callout>
          )}

          <div className="ocr-nutrition-grid">
            {NUTRITION_ROWS.map((row) => {
              const field = nutrition.fields[row.key];
              return (
                <div
                  className={`ocr-nutrition-row ${field?.needsReview ? 'needs-review' : ''}`}
                  key={row.key}
                >
                  <div className="ocr-nutrition-label">
                    <label htmlFor={`ocr-${row.key}`}>{row.label}</label>
                    {field ? (
                      <Badge tone={confidenceTone(field.confidence)}>
                        ثقة {Math.round(field.confidence)}%
                      </Badge>
                    ) : (
                      <Badge tone="outline">لم يُقرأ</Badge>
                    )}
                  </div>
                  <div className="ocr-nutrition-input">
                    <input
                      id={`ocr-${row.key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={values[row.key]}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [row.key]: event.target.value }))
                      }
                      placeholder="—"
                    />
                    <span>{row.unit}</span>
                  </div>
                  {field?.sourceText && <p className="ocr-source">«{field.sourceText}»</p>}
                </div>
              );
            })}
          </div>

          <div className="ocr-field-row">
            <label htmlFor="ocr-serving">حجم الحصة (اختياري)</label>
            <input
              id="ocr-serving"
              type="text"
              value={servingSize}
              onChange={(event) => setServingSize(event.target.value)}
              placeholder="مثال: 30 غ"
            />
          </div>
        </section>
      )}

      <section className="ocr-review-section">
        <div className="ocr-section-head">
          <h3>{kind === 'food' ? 'قائمة المكونات' : 'قائمة المكونات (INCI)'}</h3>
          <span className="count-pill">
            {rows.filter((row) => row.raw.trim()).length} مكوّنًا
            {unknownCount > 0 ? ` · ${unknownCount} خارج التغطية` : ''}
          </span>
        </div>
        <p className="ocr-section-note">
          {kind === 'food'
            ? 'الترتيب محفوظ كما قرأه OCR. أضف أو احذف أو صحّح أي مكوّن.'
            : 'الترتيب محفوظ كما قرأه OCR. لا تُستنتج التراكيز من الترتيب، والأسماء غير المعروفة لا تُعدّ آمنة.'}
        </p>

        <div className="ocr-ingredient-list">
          {rows.map((row, index) => {
            const known =
              row.raw.trim().length > 0 &&
              (isBaseIngredient(row.raw) ||
                (kind === 'food'
                  ? findFoodAdditive(row.raw, foodAdditives) !== null
                  : findCosmeticIngredient(row.raw, cosmeticIngredients) !== null));
            return (
              <div className={`ocr-ingredient-row ${row.needsReview ? 'needs-review' : ''}`} key={row.id}>
                <span className="ocr-ingredient-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="ocr-ingredient-main">
                  <input
                    type="text"
                    dir="auto"
                    value={row.raw}
                    onChange={(event) => updateRow(row.id, event.target.value)}
                    aria-label={`المكوّن ${index + 1}`}
                    placeholder="اسم المكوّن"
                  />
                  <div className="ocr-ingredient-tags">
                    {row.raw.trim() &&
                      (known ? (
                        <Badge tone="green">مطابق لقاعدة المعرفة</Badge>
                      ) : (
                        <Badge tone="amber">غير معروف — محفوظ كما هو</Badge>
                      ))}
                    {row.needsReview && (
                      <Badge tone="clay">
                        <AlertIcon size={12} /> راجع القراءة
                      </Badge>
                    )}
                    {row.eNumbers.map((eNumber) => (
                      <Badge tone="ink" key={eNumber}>
                        {eNumber.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`حذف المكوّن ${index + 1}`}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            );
          })}
        </div>

        <button type="button" className="button button-ghost button-small" onClick={addRow}>
          + إضافة مكوّن
        </button>
      </section>

      <div className="ocr-confirm">
        <label className="ocr-confirm-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            راجعت الصور والقيم والمكونات، وأؤكد أنها تطابق الملصق. أعرف أن التقييم يبدأ فقط بعد هذا
            التأكيد.
          </span>
        </label>
        <div className="ocr-confirm-actions">
          <button type="button" className="button button-ghost" onClick={onCancel}>
            إلغاء وحذف الصور
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleConfirm}
            disabled={!confirmed}
          >
            <CheckIcon size={18} />
            تأكيد البيانات وملء النموذج
          </button>
        </div>
      </div>
    </div>
  );
}
