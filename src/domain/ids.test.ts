import { describe, expect, it } from 'vitest';
import { catalogId, customMachineId, newRecord, slug } from './ids';

describe('ids', () => {
  it('builds catalog IDs with the slug rule', () => {
    expect(catalogId('Technogym', 'Selection 900', 'Chest Press')).toBe(
      'technogym-selection-900-chest-press',
    );
    expect(catalogId('Life Fitness', 'Insignia', 'Pectoral Fly / Rear Deltoid')).toBe(
      'life-fitness-insignia-pectoral-fly-rear-deltoid',
    );
    expect(catalogId('Matrix', 'Versa', 'Converging Chest Press (VS-S13)')).toBe(
      'matrix-versa-converging-chest-press',
    );
  });

  it('trims and collapses separators', () => {
    expect(slug('  --Leg  Press--  ')).toBe('leg-press');
    expect(catalogId('Brand', '', 'Row')).toBe('brand-row');
  });

  it('creates records and custom IDs', () => {
    const r = newRecord('dev', '2025-01-01T00:00:00.000Z');
    expect(r).toMatchObject({ deviceId: 'dev', deletedAt: null, createdAt: r.updatedAt });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(customMachineId()).toMatch(/^custom-[0-9a-f-]{36}$/);
  });
});
