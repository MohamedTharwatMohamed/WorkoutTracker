import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSet } from '../test/factories';
import { strings } from '../strings';
import { SetRow } from './SetRow';

vi.mock('../platform/errorLog', () => ({ logError: vi.fn(() => Promise.resolve()) }));

afterEach(cleanup);

const base = { setNumber: 1, weightUnit: 'kg' as const, stepKg: 2.5, canSave: true };

describe('SetRow', () => {
  it('stays an editable draft after saving until the stored set is passed in', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const { rerender } = render(<SetRow key="draft" {...base} initial={{ reps: 10, weightKg: 40 }} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: strings.common.save }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(10, 40));
    screen.getByRole('button', { name: strings.common.save });

    // SessionScreen renders stored sets under their own key, so the saved row is a fresh mount.
    rerender(<SetRow key="stored" {...base} saved={makeSet({ reps: 10, weightKg: 40 })} initial={null} onSave={onSave} />);
    screen.getByRole('button', { name: strings.common.edit });
  });

  it('shows "Not saved" when the save fails', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('quota')));
    render(<SetRow {...base} initial={{ reps: 8, weightKg: 20 }} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: strings.common.save }));
    expect((await screen.findByRole('alert')).textContent).toBe(strings.common.notSaved);
  });

  it('cannot save without a weight', () => {
    render(<SetRow {...base} initial={null} onSave={vi.fn()} />);
    expect((screen.getByRole('button', { name: strings.common.save }) as HTMLButtonElement).disabled).toBe(true);
  });
});
