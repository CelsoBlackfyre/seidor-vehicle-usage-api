import { describe, expect, it } from 'vitest';
import { requireIsoDate } from '../src/utils/validation';
import { expectHttpError } from './test-helpers';

describe('ISO timestamp validation', () => {
  it.each([
    '1',
    'January 10, 2026',
    '2026/01/10',
    '2026-01-10',
    '2026-01-10T08:00:00',
    '2026-02-30T08:00:00Z',
    '2025-02-29T08:00:00Z',
    '1900-02-29T08:00:00Z',
    '2026-04-31T08:00:00Z',
    '2026-00-10T08:00:00Z',
    '2026-13-10T08:00:00Z',
    '2026-01-00T08:00:00Z',
    '2026-01-10T24:00:00Z',
    '2026-01-10T08:60:00Z',
    '2026-01-10T08:00:60Z',
    '2026-01-10T08:00:00+24:00',
    '2026-01-10T08:00:00-03:60',
    '2026-01-10T08:00:00.1234Z',
  ])('rejects invalid timestamp %s', (startDate) => {
    expectHttpError(() => requireIsoDate({ startDate }, 'startDate'), 400);
  });

  it.each([undefined, null, 123, {}, []])('rejects non-string timestamps: %j', (startDate) => {
    expectHttpError(() => requireIsoDate({ startDate }, 'startDate'), 400);
  });

  it.each([
    ['2026-01-10T08:00:00Z', '2026-01-10T08:00:00.000Z'],
    ['2026-01-10T08:00:00.1Z', '2026-01-10T08:00:00.100Z'],
    ['2026-01-10T08:00:00.12Z', '2026-01-10T08:00:00.120Z'],
    ['2026-01-10T08:00:00.123Z', '2026-01-10T08:00:00.123Z'],
    ['2024-02-29T08:00:00Z', '2024-02-29T08:00:00.000Z'],
    ['2000-02-29T08:00:00Z', '2000-02-29T08:00:00.000Z'],
    ['2026-01-10T08:00:00-03:00', '2026-01-10T11:00:00.000Z'],
    ['2026-01-01T00:30:00+02:00', '2025-12-31T22:30:00.000Z'],
    ['2024-02-29T23:30:00-02:00', '2024-03-01T01:30:00.000Z'],
  ])('normalizes %s to UTC', (startDate, expected) => {
    expect(requireIsoDate({ startDate }, 'startDate')).toBe(expected);
  });
});
