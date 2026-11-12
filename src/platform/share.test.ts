import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownload } from './share';

const file = () => new File(['x'], 'plan.xlsx');

function setup({ coarse, share }: { coarse: boolean; share: () => Promise<void> }) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query === '(pointer: coarse)' }));
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  const shareSpy = vi.fn(share);
  Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { shareSpy, click };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shareOrDownload', () => {
  it('downloads on desktop even when the browser can share files', async () => {
    const { shareSpy, click } = setup({ coarse: false, share: () => Promise.resolve() });
    expect(await shareOrDownload(file())).toBe('downloaded');
    expect(shareSpy).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it('shares on touch devices and reports a cancel', async () => {
    const { click } = setup({ coarse: true, share: () => Promise.reject(new DOMException('no', 'AbortError')) });
    expect(await shareOrDownload(file())).toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });

  it('falls back to a download when sharing fails', async () => {
    const { shareSpy, click } = setup({ coarse: true, share: () => Promise.reject(new DOMException('no', 'NotAllowedError')) });
    expect(await shareOrDownload(file())).toBe('downloaded');
    expect(shareSpy).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
