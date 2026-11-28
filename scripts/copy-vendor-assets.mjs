#!/usr/bin/env node
/**
 * Copies the browser OCR/barcode runtime assets from node_modules into public/ocr.
 * These files are generated, not committed: `npm run assets` runs automatically
 * before dev and build, so CI and local builds stay reproducible.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const publicOcr = join(root, 'public', 'ocr');

const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  [
    'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
    'core/tesseract-core-relaxedsimd-lstm.wasm.js',
  ],
  [
    'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
    'core/tesseract-core-simd-lstm.wasm.js',
  ],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  [
    'node_modules/@tesseract.js-data/ara/4.0.0_best_int/ara.traineddata.gz',
    'lang/ara.traineddata.gz',
  ],
  [
    'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
    'lang/eng.traineddata.gz',
  ],
  ['node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', 'zxing_reader.wasm'],
];

let copied = 0;
let totalBytes = 0;

for (const [source, destination] of files) {
  const sourcePath = join(root, source);
  const destinationPath = join(publicOcr, destination);
  if (!existsSync(sourcePath)) {
    console.error(`[assets] missing ${source}. Run npm install first.`);
    process.exitCode = 1;
    continue;
  }
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
  copied += 1;
  totalBytes += statSync(destinationPath).size;
}

console.log(
  `[assets] copied ${copied}/${files.length} OCR/barcode assets (${(totalBytes / 1024 / 1024).toFixed(1)} MB) to public/ocr`,
);
