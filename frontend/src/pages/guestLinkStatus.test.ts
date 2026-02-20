import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getLinkStatus,
  isLinkValidForNow,
  statusClassFor,
  type GuestLinkLike
} from './guestLinkStatus';

const baseNow = new Date('2026-02-19T12:00:00.000Z').getTime();

function makeLink(overrides: Partial<GuestLinkLike>): GuestLinkLike {
  return {
    startsAt: new Date(baseNow - 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(baseNow + 60 * 60 * 1000).toISOString(),
    disabled: 0,
    maxUses: null,
    uses: 0,
    ...overrides
  };
}

describe('guest link status combinations', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns valid for active link in date range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);
    const link = makeLink({});
    expect(isLinkValidForNow(link.startsAt, link.expiresAt)).toBe(true);
    expect(getLinkStatus(link)).toBe('valid');
    expect(statusClassFor('valid')).toBe('ok');
  });

  it('returns scheduled when start date is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);
    const link = makeLink({
      startsAt: new Date(baseNow + 30 * 60 * 1000).toISOString()
    });
    expect(getLinkStatus(link)).toBe('scheduled');
    expect(statusClassFor('scheduled')).toBe('warn');
  });

  it('returns expired when end date is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);
    const link = makeLink({
      expiresAt: new Date(baseNow - 1).toISOString()
    });
    expect(getLinkStatus(link)).toBe('expired');
    expect(statusClassFor('expired')).toBe('danger');
  });

  it('returns used_up when max uses is reached', () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);
    const link = makeLink({
      maxUses: 3,
      uses: 3
    });
    expect(getLinkStatus(link)).toBe('used_up');
    expect(statusClassFor('used_up')).toBe('warn');
  });

  it('returns disabled when disabled flag is set', () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseNow);
    const link = makeLink({
      disabled: 1
    });
    expect(getLinkStatus(link)).toBe('disabled');
    expect(statusClassFor('disabled')).toBe('disabled');
  });
});
