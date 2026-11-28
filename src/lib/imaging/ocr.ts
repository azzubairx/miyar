import { createWorker, PSM } from 'tesseract.js';
import { OCR_ASSETS, ocrAssetUrl } from './assets';
import type { CaptureRole, OcrImageResult, OcrLine, OcrProgress } from './types';

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;
let progressHandler: ((progress: OcrProgress) => void) | null = null;

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'تحميل محرك OCR',
  'initializing tesseract': 'تهيئة محرك OCR',
  'loading language traineddata': 'تحميل بيانات اللغتين العربية والإنجليزية',
  'initializing api': 'تهيئة واجهة التعرف',
  'recognizing text': 'قراءة النص من الصورة',
};

function labelFor(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export async function getOcrWorker(
  onProgress?: (progress: OcrProgress) => void,
): Promise<TesseractWorker> {
  if (onProgress) progressHandler = onProgress;
  if (!workerPromise) {
    workerPromise = createWorker(['ara', 'eng'], 1, {
      workerPath: ocrAssetUrl(OCR_ASSETS.worker),
      corePath: ocrAssetUrl(OCR_ASSETS.coreDirectory),
      langPath: ocrAssetUrl(OCR_ASSETS.languageDirectory),
      gzip: true,
      cacheMethod: 'write',
      logger: (message) => {
        progressHandler?.({
          status: message.status,
          progress: Number.isFinite(message.progress) ? message.progress : 0,
          label_ar: labelFor(message.status),
        });
      },
      errorHandler: (error) => {
        console.error('[miyar/ocr]', error);
      },
    }).catch((error) => {
      workerPromise = null;
      throw new Error(
        `تعذّر تحميل محرك OCR المحلي. تأكد من الاتصال بالإنترنت في أول استخدام، ثم سيعمل دون اتصال. (${String(
          error,
        ).slice(0, 120)})`,
      );
    });
  }
  return workerPromise;
}

function extractLines(data: {
  text: string;
  confidence: number;
  blocks: Array<{
    paragraphs: Array<{
      lines: Array<{
        text: string;
        confidence: number;
        words: Array<{
          text: string;
          confidence: number;
          bbox: { x0: number; y0: number; x1: number; y1: number };
        }>;
      }>;
    }>;
  }> | null;
}): OcrLine[] {
  const lines: OcrLine[] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        lines.push({
          text,
          confidence: line.confidence,
          words: (line.words ?? []).map((word) => ({
            text: word.text,
            confidence: word.confidence,
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          })),
        });
      }
    }
  }
  if (lines.length > 0) return lines;
  return data.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, confidence: data.confidence, words: [] }));
}

export async function recognizeImages(
  images: Array<{ id: string; role: CaptureRole; dataUrl: string }>,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrImageResult[]> {
  const worker = await getOcrWorker(onProgress);
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });

  const results: OcrImageResult[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    // Nutrition tables need sparse text; ingredient paragraphs read better as blocks.
    await worker.setParameters({
      tessedit_pageseg_mode: image.role === 'nutrition' ? PSM.SPARSE_TEXT : PSM.AUTO,
    });
    onProgress?.({
      status: 'recognizing text',
      progress: index / images.length,
      label_ar: `قراءة الصورة ${index + 1} من ${images.length}`,
    });
    const started = performance.now();
    try {
      const { data } = await worker.recognize(
        image.dataUrl,
        {},
        { text: true, blocks: true, tsv: true },
      );
      results.push({
        imageId: image.id,
        role: image.role,
        text: data.text.trim(),
        confidence: data.confidence,
        lines: extractLines(data),
        durationMs: Math.round(performance.now() - started),
      });
    } catch (error) {
      await terminateOcrWorker();
      throw new Error(
        `تعذّرت قراءة الصورة ${index + 1}. جرّب صورة أوضح أو أعد تشغيل الكاميرا. (${String(
          error,
        ).slice(0, 120)})`,
      );
    }
    onProgress?.({
      status: 'recognizing text',
      progress: (index + 1) / images.length,
      label_ar: `تمت قراءة ${index + 1} من ${images.length}`,
    });
  }
  return results;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const current = workerPromise;
  workerPromise = null;
  progressHandler = null;
  try {
    const worker = await current;
    await worker.terminate();
  } catch {
    /* ignore */
  }
}
