import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function listFiles(directory: string): string[] {
  try {
    return readdirSync(directory).flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
  } catch {
    return [];
  }
}

/**
 * Emits the service worker as part of the bundle so the precache list matches
 * the hashed build output. OCR/WASM assets are excluded from the first install
 * and cached at runtime on first use instead.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'miyar-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const bundled = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map'))
        .map((file) => `./${file}`);
      const fonts = listFiles(join(process.cwd(), 'public', 'fonts')).map(
        (file) => `./fonts/${basename(file)}`,
      );
      const precache = [...new Set([...bundled, ...fonts])];
      const template = readFileSync(join(process.cwd(), 'scripts', 'sw-template.js'), 'utf8');
      const version = Date.now().toString(36);
      const source = template
        .replace('self.__MIYAR_PRECACHE__', JSON.stringify(precache))
        .replace('self.__MIYAR_VERSION__', JSON.stringify(version));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorkerPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
