export function ocrAssetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}ocr/${path}`, window.location.href).href;
}

export const OCR_ASSETS = {
  worker: 'worker.min.js',
  coreDirectory: 'core/',
  languageDirectory: 'lang/',
  zxingReader: 'zxing_reader.wasm',
} as const;

/**
 * Warms the browser/service-worker cache for the worker and language files.
 * The core WASM variant is selected by Tesseract at runtime, so it is cached on
 * the first recognition instead of downloading every variant up front.
 */
export async function preloadOcrAssets(): Promise<void> {
  if (typeof window === 'undefined' || !('fetch' in window)) return;
  const urls = [
    ocrAssetUrl(OCR_ASSETS.worker),
    ocrAssetUrl(`${OCR_ASSETS.languageDirectory}ara.traineddata.gz`),
    ocrAssetUrl(`${OCR_ASSETS.languageDirectory}eng.traineddata.gz`),
  ];
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        await fetch(url, { cache: 'default' });
      } catch {
        /* Offline first visit: OCR will explain what is missing. */
      }
    }),
  );
}
