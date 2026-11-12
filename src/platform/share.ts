export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/** Phones and tablets get the share sheet; desktops (where it is often missing or fails) download. */
function prefersShare(file: File): boolean {
  return (
    typeof navigator.canShare === 'function' &&
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches &&
    navigator.canShare({ files: [file] })
  );
}

export async function shareOrDownload(file: File): Promise<ShareResult> {
  if (prefersShare(file)) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'downloaded';
}

export function pickFile(accept = 'application/json,.json'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
