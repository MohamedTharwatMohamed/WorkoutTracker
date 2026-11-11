import { describe, expect, it } from 'vitest';
import { journalEntry, makeSet, T0 } from '../test/factories';
import { checkConsistency, isClean } from './consistency';

describe('checkConsistency', () => {
  it('finds a missing set', () => {
    const report = checkConsistency([journalEntry(1, 'set.created', 'a')], []);
    expect(report.missing).toEqual(['a']);
    expect(isClean(report)).toBe(false);
  });

  it('accepts a deleted set whose last event is set.deleted', () => {
    const report = checkConsistency(
      [journalEntry(1, 'set.created', 'a'), journalEntry(2, 'set.deleted', 'a')],
      [makeSet({ id: 'a', deletedAt: T0 })],
    );
    expect(isClean(report)).toBe(true);
  });

  it('expects a restored set to be live', () => {
    const journal = [
      journalEntry(1, 'set.created', 'a'),
      journalEntry(2, 'set.deleted', 'a'),
      journalEntry(3, 'set.restored', 'a'),
    ];
    expect(checkConsistency(journal, [makeSet({ id: 'a', deletedAt: T0 })]).wronglyDeleted).toEqual(['a']);
    expect(isClean(checkConsistency(journal, [makeSet({ id: 'a' })]))).toBe(true);
  });

  it('uses the last event by seq, whatever the array order', () => {
    const journal = [journalEntry(5, 'set.deleted', 'a'), journalEntry(1, 'set.created', 'a')];
    expect(checkConsistency(journal, [makeSet({ id: 'a' })]).wronglyLive).toEqual(['a']);
  });
});
