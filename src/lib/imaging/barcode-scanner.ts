import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { OCR_ASSETS, ocrAssetUrl } from './assets';
import type { BarcodeDecodeResult } from './types';

const RETAIL_FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'ITF14'] as const;

let prepared = false;

function prepareScanner(): void {
  if (prepared) return;
  prepareZXingModule({
    overrides: {
      locateFile: (path: string) =>
        path.endsWith('.wasm') ? ocrAssetUrl(OCR_ASSETS.zxingReader) : path,
    },
  });
  prepared = true;
}

/** Decodes a retail barcode from a file, blob or camera frame. */
export async function decodeBarcodeFromImage(
  source: Blob | ImageData,
): Promise<BarcodeDecodeResult | null> {
  try {
    prepareScanner();
    const results = await readBarcodes(source, {
      formats: [...RETAIL_FORMATS],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      maxNumberOfSymbols: 3,
      returnErrors: false,
      textMode: 'Plain',
    });
    const valid = results.find((result) => result.isValid && result.text.trim());
    if (!valid) return null;
    return {
      text: valid.text.trim(),
      format: valid.format,
      timestamp: Date.now(),
    };
  } catch (error) {
    throw new Error(
      `تعذّر تشغيل قارئ الباركود المحلي. تأكد من تحميل ملفات القارئ في أول استخدام. (${String(
        error,
      ).slice(0, 120)})`,
    );
  }
}

/** Grabs a downscaled frame from a video element for repeated scanning. */
export function videoFrameToImageData(
  video: HTMLVideoElement,
  maxWidth = 1280,
): ImageData | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}
