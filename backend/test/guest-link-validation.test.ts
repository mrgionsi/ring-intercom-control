import { describe, expect, it } from 'vitest';
import { validateGuestLinkCreateInput } from '../src/guestLinkValidation.js';

describe('validateGuestLinkCreateInput', () => {
  it('accepts valid date range and maxUses', () => {
    const result = validateGuestLinkCreateInput({
      intercomId: '705848315',
      startsAt: '2026-02-19T10:00:00.000Z',
      expiresAt: '2026-02-20T10:00:00.000Z',
      maxUses: 3
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intercomId).toBe('705848315');
      expect(result.maxUses).toBe(3);
      expect(result.expiresAtIso > result.startsAtIso).toBe(true);
    }
  });

  it('rejects when required fields are missing', () => {
    const result = validateGuestLinkCreateInput({
      intercomId: '',
      startsAt: '',
      expiresAt: ''
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain('required');
    }
  });

  it('rejects invalid date format', () => {
    const result = validateGuestLinkCreateInput({
      intercomId: '1',
      startsAt: 'invalid-date',
      expiresAt: '2026-02-20T10:00:00.000Z'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid date format');
    }
  });

  it('rejects when expiresAt is not later than startsAt', () => {
    const result = validateGuestLinkCreateInput({
      intercomId: '1',
      startsAt: '2026-02-20T10:00:00.000Z',
      expiresAt: '2026-02-20T10:00:00.000Z'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('later than startsAt');
    }
  });

  it('rejects non-positive maxUses', () => {
    const result = validateGuestLinkCreateInput({
      intercomId: '1',
      startsAt: '2026-02-20T10:00:00.000Z',
      expiresAt: '2026-02-20T11:00:00.000Z',
      maxUses: 0
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('positive integer');
    }
  });
});
