import type { PhotoMime } from '../db/types';

export interface EncodedImage {
  blob: Blob;
  mime: PhotoMime;
}

const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function load(file: File): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The image could not be read'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded'))),
      type,
      quality,
    );
  });
}

/** Lowers quality until the blob fits. Returns early if the browser used another type. */
async function encode(canvas: HTMLCanvasElement, type: PhotoMime, maxBytes: number): Promise<Blob> {
  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await toBlob(canvas, type, quality);
    if (blob.type !== type || blob.size <= maxBytes) return blob;
  }
  return blob as Blob;
}

/** Scales a photo to `maxSide` and encodes WebP, or JPEG where the browser cannot encode WebP. */
export async function toWebp(file: File, maxSide = 640, maxBytes = 50_000): Promise<EncodedImage> {
  const source = await load(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Canvas 2D is not available');
  }
  context.drawImage(source.image, 0, 0, canvas.width, canvas.height);
  source.close();

  const webp = await encode(canvas, 'image/webp', maxBytes);
  if (webp.type === 'image/webp') return { blob: webp, mime: 'image/webp' };
  return { blob: await encode(canvas, 'image/jpeg', maxBytes), mime: 'image/jpeg' };
}
