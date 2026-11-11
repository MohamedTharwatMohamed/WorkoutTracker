// Converts originals in scripts/source-images/ (not committed) into catalog photos (design item 17).
// Name each original after its catalog ID, for example technogym-selection-900-chest-press.jpg.
// Crop out any brand logo before running. Output: public/images/machines/<id>.webp, at most
// 640 px on the longest side and 50 KB, with metadata removed.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAX_SIDE = 640;
const MAX_BYTES = 50_000;
const QUALITIES = [82, 75, 68, 60, 52, 45, 38, 30];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'scripts', 'source-images');
const outDir = join(root, 'public', 'images', 'machines');
const catalog = JSON.parse(readFileSync(join(root, 'public', 'catalog', 'catalog.json'), 'utf8'));
const ids = new Set(catalog.machines.map((m) => m.id));

mkdirSync(outDir, { recursive: true });
let files;
try {
  files = readdirSync(sourceDir).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));
} catch {
  console.error(`Put the original photos in ${sourceDir} first.`);
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const id = basename(file, extname(file));
  if (!ids.has(id)) {
    console.warn(`skip ${file}: no catalog machine with ID ${id}`);
    continue;
  }
  const resized = sharp(join(sourceDir, file))
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true });
  let output = null;
  for (const quality of QUALITIES) {
    // sharp drops EXIF and other metadata unless withMetadata() is called.
    const buffer = await resized.clone().webp({ quality }).toBuffer();
    if (buffer.length <= MAX_BYTES) {
      output = { buffer, quality };
      break;
    }
  }
  if (!output) {
    console.error(`FAIL ${file}: still over ${MAX_BYTES} bytes at the lowest quality`);
    failed = true;
    continue;
  }
  await sharp(output.buffer).toFile(join(outDir, `${id}.webp`));
  console.log(`ok   ${id}.webp  ${output.buffer.length} bytes  q${output.quality}`);
}
console.log('Then set "image" and "imageSourceUrl" for each machine in public/catalog/catalog.json.');
if (failed) process.exit(1);
