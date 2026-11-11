// Checks public/catalog/catalog.json (design item 18). Runs in CI; exits 1 on any problem.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
export const MAX_ACTIVE = 30;
export const MAX_IMAGE_BYTES = 50_000;

/** Same rule as src/domain/ids.ts `slug`. */
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {{ machines: Array<Record<string, unknown>> }} current
 * @param {{ machines: Array<{ id: string }> } | null} base  null when there is no base catalog
 * @param {(path: string) => number | null} fileSize  bytes, or null when the file is missing
 * @returns {string[]} problems; empty when the catalog is valid
 */
export function checkCatalog(current, base, fileSize) {
  const problems = [];
  const machines = Array.isArray(current?.machines) ? current.machines : [];
  if (!Array.isArray(current?.machines)) problems.push('catalog has no "machines" list');

  const seen = new Set();
  for (const m of machines) {
    const id = String(m.id);
    if (seen.has(id)) problems.push(`${id}: duplicate ID`);
    seen.add(id);

    const expected = [m.brand, m.line, m.model].map((t) => slug(String(t ?? ''))).join('-');
    if (id !== expected) problems.push(`${id}: ID does not match the slug rule (expected ${expected})`);

    if (!MUSCLE_GROUPS.includes(m.muscleGroup)) {
      problems.push(`${id}: unknown muscle group "${m.muscleGroup}"`);
    }

    if (m.image !== null) {
      const size = typeof m.image === 'string' ? fileSize(m.image) : null;
      if (size === null) problems.push(`${id}: image file ${m.image} is missing`);
      else if (size > MAX_IMAGE_BYTES) problems.push(`${id}: image is ${size} bytes (max ${MAX_IMAGE_BYTES})`);
      if (!m.imageSourceUrl) problems.push(`${id}: image has no imageSourceUrl`);
    }
  }

  const active = machines.filter((m) => m.retired !== true).length;
  if (active > MAX_ACTIVE) problems.push(`${active} machines are not retired (max ${MAX_ACTIVE})`);

  if (base) {
    for (const { id } of base.machines) {
      if (!seen.has(id)) problems.push(`${id}: removed; mark it "retired": true instead`);
    }
  }
  return problems;
}

function baseRef(env) {
  if (env.GITHUB_BASE_REF) return `origin/${env.GITHUB_BASE_REF}`;
  if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF_NAME === 'master') return 'HEAD~1';
  return `origin/${env.BASE_REF || 'master'}`;
}

function readBase(ref) {
  try {
    const text = execFileSync('git', ['show', `${ref}:public/catalog/catalog.json`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const publicDir = join(root, 'public');
  const current = JSON.parse(readFileSync(join(publicDir, 'catalog', 'catalog.json'), 'utf8'));
  const ref = baseRef(process.env);
  const base = readBase(ref);
  if (!base) console.log(`No base catalog at ${ref}; skipping the removed-ID check.`);

  const fileSize = (path) => {
    try {
      return statSync(join(publicDir, path)).size;
    } catch {
      return null;
    }
  };
  const problems = checkCatalog(current, base, fileSize);
  if (problems.length > 0) {
    console.error(`Catalog check failed:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Catalog OK: ${current.machines.length} machines.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
