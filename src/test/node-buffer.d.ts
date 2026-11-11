// Only the parts of node:buffer that src/test/setup.ts uses; the app config has no Node types.
declare module 'node:buffer' {
  export const Blob: typeof globalThis.Blob;
  export const File: typeof globalThis.File;
}
