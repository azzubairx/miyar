export interface PreprocessOptions {
  maxDimension?: number;
  rotation?: number;
  autoCrop?: boolean;
  deskew?: boolean;
  grayscale?: boolean;
  contrast?: boolean;
  sharpen?: boolean;
  denoise?: boolean;
  quality?: number;
}

export interface PreprocessResult {
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
  rotation: number;
  deskewAngle: number;
  cropped: boolean;
  grayscale: boolean;
}

export interface TextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      reject(new Error('تعذّر فتح الصورة. جرّب صيغة أخرى مثل JPEG أو PNG.'));
    };
    image.src = url;
  });
}

function drawToCanvas(
  image: HTMLImageElement,
  maxDimension: number,
  rotation: number,
): HTMLCanvasElement {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const swap = normalizedRotation === 90 || normalizedRotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? height : width;
  canvas.height = swap ? width : height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('المتصفح لا يدعم Canvas المطلوب لمعالجة الصور.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalizedRotation * Math.PI) / 180);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, -width / 2, -height / 2, width, height);
  return canvas;
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.9): string {
  return canvas.toDataURL('image/jpeg', quality);
}

function otsuThreshold(histogram: number[], total: number): number {
  let sum = 0;
  for (let index = 0; index < 256; index += 1) sum += index * histogram[index];
  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = -1;
  let threshold = 127;
  for (let index = 0; index < 256; index += 1) {
    weightBackground += histogram[index];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += index * histogram[index];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = index;
    }
  }
  return threshold;
}

/** Finds the ink bounding box on a light background. Pure and testable. */
export function computeTextBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): TextBounds | null {
  if (width < 20 || height < 20) return null;
  const histogram = new Array<number>(256).fill(0);
  const luminance = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const value = Math.round(
      0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2],
    );
    luminance[index] = value;
    histogram[value] += 1;
  }
  const threshold = Math.max(70, Math.min(210, otsuThreshold(histogram, width * height)));
  const rowCounts = new Uint32Array(height);
  const colCounts = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (luminance[y * width + x] < threshold) {
        rowCounts[y] += 1;
        colCounts[x] += 1;
      }
    }
  }

  const minRowInk = Math.max(2, Math.floor(width * 0.012));
  const minColInk = Math.max(2, Math.floor(height * 0.006));
  let top = 0;
  while (top < height && rowCounts[top] < minRowInk) top += 1;
  let bottom = height - 1;
  while (bottom > top && rowCounts[bottom] < minRowInk) bottom -= 1;
  let left = 0;
  while (left < width && colCounts[left] < minColInk) left += 1;
  let right = width - 1;
  while (right > left && colCounts[right] < minColInk) right -= 1;

  if (right <= left || bottom <= top) return null;
  const paddingX = Math.round(width * 0.02);
  const paddingY = Math.round(height * 0.02);
  left = Math.max(0, left - paddingX);
  right = Math.min(width - 1, right + paddingX);
  top = Math.max(0, top - paddingY);
  bottom = Math.min(height - 1, bottom + paddingY);

  const boxWidth = right - left + 1;
  const boxHeight = bottom - top + 1;
  const areaRatio = (boxWidth * boxHeight) / (width * height);
  if (areaRatio < 0.12 || areaRatio > 0.995) return null;
  return { x: left, y: top, width: boxWidth, height: boxHeight };
}

function cropCanvas(canvas: HTMLCanvasElement, bounds: TextBounds): HTMLCanvasElement {
  const cropped = document.createElement('canvas');
  cropped.width = bounds.width;
  cropped.height = bounds.height;
  const context = cropped.getContext('2d');
  if (!context) return canvas;
  context.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );
  return cropped;
}

function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (Math.abs(degrees) < 0.15) return canvas;
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = Math.ceil(canvas.width * cos + canvas.height * sin);
  const height = Math.ceil(canvas.width * sin + canvas.height * cos);
  const rotated = document.createElement('canvas');
  rotated.width = width;
  rotated.height = height;
  const context = rotated.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.translate(width / 2, height / 2);
  context.rotate(radians);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
}

/** Estimates the correction angle by maximizing row-projection variance. */
export function estimateSkew(data: Uint8ClampedArray, width: number, height: number): number {
  if (width < 40 || height < 40) return 0;
  const histogram = new Array<number>(256).fill(0);
  const dark: Array<{ x: number; y: number }> = [];
  const step = Math.max(1, Math.floor(Math.max(width, height) / 700));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const value = Math.round(
        0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2],
      );
      histogram[value] += 1;
    }
  }
  const threshold = Math.max(60, Math.min(200, otsuThreshold(histogram, Math.ceil(width / step) * Math.ceil(height / step))));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const value = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      if (value < threshold) dark.push({ x, y });
    }
  }
  if (dark.length < 30) return 0;

  let bestAngle = 0;
  let bestVariance = -1;
  for (let angle = -6; angle <= 6; angle += 0.75) {
    const radians = (angle * Math.PI) / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const rows = new Uint32Array(Math.ceil(height + width));
    const offset = Math.floor(rows.length / 2);
    for (const point of dark) {
      const rotatedY = Math.round(point.y * cos - point.x * sin) + offset;
      if (rotatedY >= 0 && rotatedY < rows.length) rows[rotatedY] += 1;
    }
    let mean = 0;
    for (const count of rows) mean += count;
    mean /= rows.length;
    let variance = 0;
    for (const count of rows) variance += (count - mean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestAngle = angle;
    }
  }
  return Math.abs(bestAngle) < 0.75 ? 0 : bestAngle;
}

function enhanceCanvas(
  canvas: HTMLCanvasElement,
  options: { grayscale: boolean; contrast: boolean; sharpen: boolean; denoise: boolean },
): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    gray[index] = Math.round(
      0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2],
    );
  }

  let working = gray;
  if (options.denoise) {
    const denoised = new Uint8ClampedArray(gray.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const values: number[] = [];
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            values.push(gray[ny * width + nx]);
          }
        }
        values.sort((a, b) => a - b);
        denoised[y * width + x] = values[4];
      }
    }
    working = denoised;
  }

  if (options.contrast) {
    const histogram = new Array<number>(256).fill(0);
    for (const value of working) histogram[value] += 1;
    const total = working.length;
    let low = 0;
    let high = 255;
    let accumulated = 0;
    for (let index = 0; index < 256; index += 1) {
      accumulated += histogram[index];
      if (accumulated >= total * 0.02) {
        low = index;
        break;
      }
    }
    accumulated = 0;
    for (let index = 255; index >= 0; index -= 1) {
      accumulated += histogram[index];
      if (accumulated >= total * 0.02) {
        high = index;
        break;
      }
    }
    if (high - low > 20) {
      const scale = 255 / (high - low);
      for (let index = 0; index < working.length; index += 1) {
        working[index] = Math.max(0, Math.min(255, (working[index] - low) * scale));
      }
    }
  }

  if (options.sharpen) {
    const sharpened = new Uint8ClampedArray(working.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const center = working[y * width + x];
        const top = y > 0 ? working[(y - 1) * width + x] : center;
        const bottom = y < height - 1 ? working[(y + 1) * width + x] : center;
        const left = x > 0 ? working[y * width + x - 1] : center;
        const right = x < width - 1 ? working[y * width + x + 1] : center;
        sharpened[y * width + x] = Math.max(
          0,
          Math.min(255, center * 5 - top - bottom - left - right),
        );
      }
    }
    working = sharpened;
  }

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (options.grayscale) {
      data[offset] = working[index];
      data[offset + 1] = working[index];
      data[offset + 2] = working[index];
    } else {
      const original = data[offset];
      const ratio = working[index] / Math.max(1, gray[index]);
      data[offset] = Math.max(0, Math.min(255, original * ratio));
      data[offset + 1] = Math.max(0, Math.min(255, data[offset + 1] * ratio));
      data[offset + 2] = Math.max(0, Math.min(255, data[offset + 2] * ratio));
    }
    data[offset + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  maxDimension = 1600,
): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) {
    return Promise.reject(new Error('الكاميرا لم تجهز الصورة بعد. انتظر لحظة ثم أعد المحاولة.'));
  }
  const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('تعذّر التقاط الصورة.'));
  context.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('تعذّر ضغط الصورة.'))),
      'image/jpeg',
      0.92,
    );
  });
}

/**
 * Client-side preprocessing: EXIF orientation, downscale, ink crop, deskew,
 * grayscale, denoise, contrast stretch and sharpening. The original image is
 * retained separately for the review screen; nothing is uploaded.
 */
export async function preprocessImage(
  source: Blob | string,
  options: PreprocessOptions = {},
): Promise<PreprocessResult> {
  const {
    maxDimension = 1600,
    rotation = 0,
    autoCrop = true,
    deskew = true,
    grayscale = true,
    contrast = true,
    sharpen = true,
    denoise = true,
    quality = 0.9,
  } = options;

  const image = await loadImage(source);
  const originalCanvas = drawToCanvas(image, 1800, rotation);
  const originalDataUrl =
    typeof source === 'string' ? source : canvasToDataUrl(originalCanvas, quality);

  let canvas = drawToCanvas(image, maxDimension, rotation);
  let cropped = false;

  if (autoCrop) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      const bounds = computeTextBounds(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      if (bounds) {
        canvas = cropCanvas(canvas, bounds);
        cropped = true;
      }
    }
  }

  let deskewAngle = 0;
  if (deskew) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      deskewAngle = estimateSkew(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      if (deskewAngle !== 0) canvas = rotateCanvas(canvas, deskewAngle);
    }
  }

  canvas = enhanceCanvas(canvas, { grayscale, contrast, sharpen, denoise });

  return {
    originalDataUrl,
    processedDataUrl: canvasToDataUrl(canvas, quality),
    width: canvas.width,
    height: canvas.height,
    rotation,
    deskewAngle,
    cropped,
    grayscale,
  };
}
