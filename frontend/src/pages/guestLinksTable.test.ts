import { describe, expect, it, vi, afterEach } from 'vitest';
import { filterGuestLinks, paginateGuestLinks } from './guestLinksTable';
import type { GuestLinkStatus } from './guestLinkStatus';

const now = new Date('2026-02-19T12:00:00.000Z').getTime();

function allEnabled(): Record<GuestLinkStatus, boolean> {
  return {
    valid: true,
    scheduled: true,
    expired: true,
    used_up: true,
    disabled: true,
    invalid_date: true
  };
}

describe('guestLinksTable helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters by label text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const links = [
      {
        id: 1,
        label: 'Mario',
        startsAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 1000).toISOString(),
        disabled: 0,
        maxUses: null,
        uses: 0
      },
      {
        id: 2,
        label: 'Giulia',
        startsAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 1000).toISOString(),
        disabled: 0,
        maxUses: null,
        uses: 0
      }
    ];
    const result = filterGuestLinks(links, 'mar', allEnabled());
    expect(result.map((x) => x.id)).toEqual([1]);
  });

  it('filters by status toggles', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const links = [
      {
        id: 1,
        label: 'Valid',
        startsAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 1000).toISOString(),
        disabled: 0,
        maxUses: null,
        uses: 0
      },
      {
        id: 2,
        label: 'Disabled',
        startsAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 1000).toISOString(),
        disabled: 1,
        maxUses: null,
        uses: 0
      }
    ];
    const result = filterGuestLinks(links, '', {
      ...allEnabled(),
      valid: false
    });
    expect(result.map((x) => x.id)).toEqual([2]);
  });

  it('paginates with page size 20', () => {
    const links = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(paginateGuestLinks(links, 1, 20)).toHaveLength(20);
    expect(paginateGuestLinks(links, 2, 20)).toHaveLength(20);
    expect(paginateGuestLinks(links, 3, 20)).toHaveLength(5);
  });
});
