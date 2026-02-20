import { describe, expect, it } from 'vitest';
import { formatDateTime, toDateTimeLocalValue } from './dateTime';

describe('dateTime utils', () => {
  it('formats as dd/mm/yyyy hh:mm', () => {
    const d = new Date('2026-02-19T10:07:00.000Z');
    const expected = `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(
      2,
      '0'
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(formatDateTime('2026-02-19T10:07:00.000Z')).toBe(expected);
  });

  it('returns local datetime input value', () => {
    const d = new Date('2026-02-19T10:07:00.000Z');
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}T${String(
      d.getHours()
    ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(toDateTimeLocalValue('2026-02-19T10:07:00.000Z')).toBe(expected);
  });

  it('returns fallback for null/undefined/invalid datetime display values', () => {
    expect(formatDateTime(null)).toBe('n/a');
    expect(formatDateTime(undefined)).toBe('n/a');
    expect(formatDateTime('invalid-date')).toBe('n/a');
  });

  it('returns empty value for null/undefined/invalid datetime-local values', () => {
    expect(toDateTimeLocalValue(null)).toBe('');
    expect(toDateTimeLocalValue(undefined)).toBe('');
    expect(toDateTimeLocalValue('invalid-date')).toBe('');
  });
});
