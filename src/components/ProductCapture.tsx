import { useEffect, useRef, useState } from 'react';
import CameraCapture from './CameraCapture';
import OcrReview, { type ReviewPayload } from './OcrReview';
import { CameraIcon, ImageIcon, RotateIcon, TrashIcon } from './Icons';
import { Callout } from './ui';
import { preprocessImage } from '../lib/imaging/image';
import { parseIngredients } from '../lib/imaging/ingredients';
import { isNutritionRowText, parseNutritionLabel } from '../lib/imaging/nutrition';
import type {
  CaptureRole,
  CapturedImage,
  IngredientsParseResult,
  NutritionParseResult,
  OcrImageResult,
  OcrProgress,
} from '../lib/imaging/types';

const FOOD_ROLES: CaptureRole[] = ['nutrition', 'ingredients', 'front', 'serving', 'other'];
const COSMETICS_ROLES: CaptureRole[] = ['ingredients', 'front', 'other'];

const ROLE_LABELS: Record<CaptureRole, string> = {
  nutrition: 'جدول القيم الغذائية',
  ingredients: 'قائمة المكونات',
  front: 'واجهة المنتج',
  serving: 'معلومات الحصة',
  other: 'صورة أخرى',
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function suggestRole(existing: CapturedImage[], kind: 'food' | 'cosmetics'): CaptureRole {
  if (kind === 'cosmetics') {
    const ingredientCount = existing.filter((image) => image.role === 'ingredients').length;
    if (ingredientCount < 2) return 'ingredients';
    if (!existing.some((image) => image.role === 'front')) return 'front';
    return 'other';
  }
  if (!existing.some((image) => image.role === 'nutrition')) return 'nutrition';
  if (!existing.some((image) => image.role === 'ingredients')) return 'ingredients';
  if (!existing.some((image) => image.role === 'front')) return 'front';
  if (!existing.some((image) => image.role === 'serving')) return 'serving';
  return 'other';
}

function combine(results: OcrImageResult[]): {
  text: string;
  lines: OcrImageResult['lines'];
  confidence: number;
} {
  const confidence =
    results.length === 0
      ? 0
      : results.reduce((sum, item) => sum + (item.confidence || 0), 0) / results.length;
  return {
    text: results.map((item) => item.text).join('\n'),
    lines: results.flatMap((item) => item.lines),
    confidence,
  };
}

export default function ProductCapture({
  kind,
  onConfirm,
}: {
  kind: 'food' | 'cosmetics';
  onConfirm: (payload: ReviewPayload) => void;
}) {
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'capture' | 'ocr' | 'review'>('capture');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [ocrResults, setOcrResults] = useState<OcrImageResult[]>([]);
  const [nutrition, setNutrition] = useState<NutritionParseResult | null>(null);
  const [ingredients, setIngredients] = useState<IngredientsParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const roles = kind === 'food' ? FOOD_ROLES : COSMETICS_ROLES;

  const addBlob = async (blob: Blob, fileName?: string) => {
    setAdding(true);
    setError('');
    try {
      const result = await preprocessImage(blob, {
        maxDimension: 1600,
        autoCrop: true,
        deskew: true,
        grayscale: true,
        contrast: true,
        sharpen: true,
        denoise: true,
        quality: 0.9,
      });
      if (!aliveRef.current) return;
      setImages((current) => [
        ...current,
        {
          id: makeId(),
          role: suggestRole(current, kind),
          originalDataUrl: result.originalDataUrl,
          processedDataUrl: result.processedDataUrl,
          width: result.width,
          height: result.height,
          fileName,
          preprocessing: {
            rotation: result.rotation,
            deskewAngle: result.deskewAngle,
            cropped: result.cropped,
            grayscale: result.grayscale,
          },
        },
      ]);
    } catch (caught) {
      setError((caught as Error).message || 'تعذّرت معالجة الصورة. جرّب صورة أخرى.');
    } finally {
      if (aliveRef.current) setAdding(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      await addBlob(file, file.name);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateRole = (id: string, role: CaptureRole) => {
    setImages((current) => current.map((image) => (image.id === id ? { ...image, role } : image)));
  };

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const startOcr = async () => {
    if (images.length === 0) return;
    setStage('ocr');
    setError('');
    setProgress({ status: 'starting', progress: 0, label_ar: 'تحضير محرك OCR المحلي…' });
    try {
      const { recognizeImages } = await import('../lib/imaging/ocr');
      const results = await recognizeImages(
        images.map((image) => ({
          id: image.id,
          role: image.role,
          dataUrl: image.processedDataUrl,
        })),
        (next) => {
          if (aliveRef.current) setProgress(next);
        },
      );
      if (!aliveRef.current) return;

      const nutritionResults = results.filter((item) => item.role === 'nutrition');
      const ingredientResults = results.filter((item) => item.role !== 'nutrition');
      const nutritionSource = nutritionResults.length > 0 ? nutritionResults : results;
      // When the same photo holds the table and the ingredients, drop table rows
      // instead of turning them into fake ingredients.
      const ingredientSource =
        ingredientResults.length > 0
          ? ingredientResults
          : results.map((item) => {
              const kept = item.lines.filter((line) => !isNutritionRowText(line.text));
              return {
                ...item,
                lines: kept,
                text: kept.map((line) => line.text).join('\n'),
              };
            });
      const nutritionCombined = combine(nutritionSource);
      const ingredientCombined = combine(ingredientSource);

      setOcrResults(results);
      if (kind === 'food') {
        setNutrition(
          parseNutritionLabel(
            nutritionCombined.text,
            nutritionCombined.lines,
            nutritionCombined.confidence,
          ),
        );
      } else {
        setNutrition(null);
      }
      setIngredients(
        parseIngredients(
          ingredientCombined.text,
          ingredientCombined.lines,
          kind,
          ingredientCombined.confidence,
        ),
      );
      setStage('review');
    } catch (caught) {
      if (!aliveRef.current) return;
      setError((caught as Error).message || 'تعذّرت قراءة الصور. جرّب صورة أوضح.');
      setStage('capture');
    }
  };

  const resetAll = () => {
    setImages([]);
    setOcrResults([]);
    setNutrition(null);
    setIngredients(null);
    setProgress(null);
    setError('');
    setStage('capture');
  };

  const handleConfirm = (payload: ReviewPayload) => {
    onConfirm(payload);
    resetAll();
  };

  if (stage === 'review' && ingredients) {
    return (
      <OcrReview
        kind={kind}
        images={images}
        ocrResults={ocrResults}
        nutrition={nutrition}
        ingredients={ingredients}
        onConfirm={handleConfirm}
        onCancel={resetAll}
      />
    );
  }

  if (stage === 'ocr') {
    return (
      <div className="capture-card capture-progress" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <h3>جارٍ قراءة الصور على جهازك</h3>
        <p>{progress?.label_ar ?? 'تحضير محرك OCR…'}</p>
        <div className="progress-track" role="progressbar" aria-valuenow={Math.round((progress?.progress ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }} />
        </div>
        <p className="capture-privacy">
          لا تُرفع الصور إلى أي خادم. قد يستغرق أول تشغيل وقتًا لتنزيل بيانات اللغتين.
        </p>
        <button type="button" className="button button-ghost button-small" onClick={resetAll}>
          إلغاء وحذف الصور
        </button>
      </div>
    );
  }

  return (
    <div className="capture-card">
      <div className="capture-head">
        <div>
          <span className="mono-label">ON-DEVICE OCR</span>
          <h3>{kind === 'food' ? 'تصوير بيانات المنتج' : 'تصوير قائمة المكونات'}</h3>
          <p>
            {kind === 'food'
              ? 'صوّر جدول القيم الغذائية وقائمة المكونات. يمكنك إضافة عدة صور، ثم مراجعة القراءة قبل التقييم.'
              : 'صوّر قائمة INCI كاملة، ويمكن تقسيمها على عدة صور للعبوات الطويلة. تبقى الأسماء والترتيب كما هما.'}
          </p>
        </div>
        <CameraIcon size={26} />
      </div>

      <div className="capture-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => setCameraOpen(true)}
          disabled={adding}
        >
          <CameraIcon size={18} />
          فتح الكاميرا
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={adding}
        >
          <ImageIcon size={18} />
          اختيار من المعرض
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {adding && (
        <p className="capture-status">
          <span className="spinner spinner-small" aria-hidden="true" />
          جارٍ معالجة الصورة وتصحيح الميل والإضاءة…
        </p>
      )}

      {error && (
        <Callout tone="attention" title="تعذّر إكمال العملية">
          {error}
        </Callout>
      )}

      {images.length > 0 && (
        <>
          <div className="capture-grid">
            {images.map((image, index) => (
              <figure className="capture-thumb" key={image.id}>
                <div className="capture-thumb-frame">
                  <img
                    src={image.processedDataUrl}
                    alt={`${ROLE_LABELS[image.role]} ${index + 1}`}
                    loading="lazy"
                  />
                  <span className="capture-thumb-index">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="capture-thumb-controls">
                  <label className="sr-only" htmlFor={`role-${image.id}`}>
                    نوع الصورة {index + 1}
                  </label>
                  <select
                    id={`role-${image.id}`}
                    value={image.role}
                    onChange={(event) => updateRole(image.id, event.target.value as CaptureRole)}
                  >
                    {roles.map((role) => (
                      <option value={role} key={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeImage(image.id)}
                    aria-label={`حذف الصورة ${index + 1}`}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </figure>
            ))}
          </div>

          <div className="capture-footer">
            <span className="capture-count">{images.length} صورة جاهزة</span>
            <button type="button" className="button button-primary" onClick={() => void startOcr()}>
              <RotateIcon size={18} />
              بدء القراءة والمراجعة
            </button>
          </div>
        </>
      )}

      <p className="capture-privacy">
        الصور تُعالج داخل المتصفح فقط، ولا تُرفع أو تُحفظ بعد إغلاق الصفحة. نطلب الكاميرا عند ضغط
        الزر فقط.
      </p>

      {cameraOpen && (
        <CameraCapture
          title={kind === 'food' ? 'تصوير بيانات المنتج' : 'تصوير قائمة المكونات'}
          hint="يمكنك التقاط عدة صور ثم إغلاق الكاميرا."
          guide="ضع الملصق داخل الإطار، وتجنّب الانعكاس والظل"
          busy={adding}
          onCapture={(blob) => addBlob(blob)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
