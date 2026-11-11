import { describe, expect, it } from 'vitest';
import { checkCatalog } from './check-catalog.mjs';

const machine = (over = {}) => ({
  id: 'technogym-selection-900-chest-press',
  brand: 'Technogym',
  line: 'Selection 900',
  model: 'Chest Press',
  muscleGroup: 'chest',
  image: null,
  imageSourceUrl: null,
  retired: false,
  ...over,
});
const sizes = (map) => (path) => (path in map ? map[path] : null);
const check = (machines, base = null, files = {}) => checkCatalog({ machines }, base, sizes(files));

describe('checkCatalog', () => {
  it('accepts a valid catalog, including image: null without a source URL', () => {
    const withImage = machine({
      id: 'matrix-versa-converging-chest-press',
      brand: 'Matrix',
      line: 'Versa',
      model: 'Converging Chest Press (VS-S13)',
      image: 'images/machines/a.webp',
      imageSourceUrl: 'https://example.com',
    });
    expect(check([machine(), withImage], null, { 'images/machines/a.webp': 50_000 })).toEqual([]);
  });

  it('rejects a duplicate ID and an ID that breaks the slug rule', () => {
    expect(check([machine(), machine()])).toEqual(['technogym-selection-900-chest-press: duplicate ID']);
    expect(check([machine({ id: 'chest-press' })])[0]).toMatch(/does not match the slug rule/);
  });

  it('rejects an unknown muscle group', () => {
    expect(check([machine({ muscleGroup: 'glutes' })])[0]).toMatch(/unknown muscle group "glutes"/);
  });

  it('rejects a missing or oversized image and an image without a source URL', () => {
    const img = { image: 'images/machines/a.webp', imageSourceUrl: 'https://example.com' };
    expect(check([machine(img)])[0]).toMatch(/is missing/);
    expect(check([machine(img)], null, { 'images/machines/a.webp': 50_001 })[0]).toMatch(/50001 bytes/);
    expect(check([machine({ ...img, imageSourceUrl: null })], null, { 'images/machines/a.webp': 1 })).toEqual([
      'technogym-selection-900-chest-press: image has no imageSourceUrl',
    ]);
  });

  it('allows at most 30 machines that are not retired', () => {
    const many = Array.from({ length: 31 }, (_, i) =>
      machine({ id: `technogym-selection-900-m${i}`, model: `M${i}` }),
    );
    expect(check(many)).toEqual(['31 machines are not retired (max 30)']);
    many[0].retired = true;
    expect(check(many)).toEqual([]);
  });

  it('rejects an ID removed from the base catalog, and skips the check without a base', () => {
    const base = { machines: [{ id: 'technogym-selection-900-chest-press' }, { id: 'gone' }] };
    expect(check([machine()], base)).toEqual(['gone: removed; mark it "retired": true instead']);
    expect(check([machine()], null)).toEqual([]);
  });
});
