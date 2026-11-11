import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toWebp } from './image';

const drawImage = vi.fn();
let encodeAs: (type: string, quality: number) => Blob;

beforeEach(() => {
  drawImage.mockClear();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1280, height: 960, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type, quality) {
    callback(encodeAs(type ?? 'image/png', quality as number));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const photo = () => new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });

describe('toWebp', () => {
  it('falls back to JPEG when the browser returns PNG for WebP', async () => {
    encodeAs = (type) => new Blob(['x'], { type: type === 'image/jpeg' ? 'image/jpeg' : 'image/png' });

    const result = await toWebp(photo());

    expect(result.mime).toBe('image/jpeg');
    expect(result.blob.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 640, 480);
  });

  it('lowers WebP quality until the blob fits', async () => {
    const qualities: number[] = [];
    encodeAs = (type, quality) => {
      qualities.push(quality);
      return new Blob([new Uint8Array(quality > 0.6 ? 60_000 : 40_000)], { type });
    };

    const result = await toWebp(photo());

    expect(result.mime).toBe('image/webp');
    expect(result.blob.size).toBe(40_000);
    expect(qualities).toEqual([0.85, 0.75, 0.65, 0.55]);
  });
});
