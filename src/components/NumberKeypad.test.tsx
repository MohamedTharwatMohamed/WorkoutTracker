import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../strings';
import { NumberKeypad } from './NumberKeypad';

afterEach(cleanup);

const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getByRole('button', { name: k })));

describe('NumberKeypad', () => {
  it('returns the typed decimal and ignores a second point', () => {
    const onClose = vi.fn();
    render(<NumberKeypad label="Weight" allowDecimal onClose={onClose} />);
    press('.', '5', '.', '5', 'Backspace', '2');
    press(strings.common.ok);
    expect(onClose).toHaveBeenCalledWith(0.52);
  });

  it('returns undefined for empty input and blocks the point for whole numbers', () => {
    const onClose = vi.fn();
    render(<NumberKeypad label="Reps" allowDecimal={false} onClose={onClose} />);
    expect((screen.getByRole('button', { name: '.' }) as HTMLButtonElement).disabled).toBe(true);
    press(strings.common.ok);
    expect(onClose).toHaveBeenCalledWith(undefined);
  });
});
