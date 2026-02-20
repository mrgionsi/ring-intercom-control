import { describe, expect, it } from 'vitest';
import { validateGuestLinkExpiresAtUpdate } from '../src/guestLinkEditValidation.js';

describe('validateGuestLinkExpiresAtUpdate', () => {
  const startsAtIso = '2099-02-19T10:00:00.000Z';

  it('accepts valid future expiresAt', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: '2099-02-20T10:00:00.000Z',
      startsAtIso,
      disabled: false
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expiresAtIso).toBe('2099-02-20T10:00:00.000Z');
    }
  });

  it('rejects update for disabled links', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: '2099-02-20T10:00:00.000Z',
      startsAtIso,
      disabled: true
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Disabled');
    }
  });

  it('rejects invalid date', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: 'invalid',
      startsAtIso,
      disabled: false
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid date format');
    }
  });

  it('rejects expiresAt in the past', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: '2000-01-01T00:00:00.000Z',
      startsAtIso,
      disabled: false
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('in the future');
    }
  });

  it('rejects expiresAt not later than startsAt', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: '2099-02-19T10:00:00.000Z',
      startsAtIso,
      disabled: false
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('later than startsAt');
    }
  });

  it('accepts valid expiresAt when startsAtIso is invalid', () => {
    const result = validateGuestLinkExpiresAtUpdate({
      expiresAt: '2099-02-20T10:00:00.000Z',
      startsAtIso: 'invalid-date',
      disabled: false
    });
    expect(result.ok).toBe(true);
  });
});
