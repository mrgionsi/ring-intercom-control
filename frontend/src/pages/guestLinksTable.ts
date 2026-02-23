import type { GuestLinkStatus } from './guestLinkStatus';
import { getLinkStatus, type GuestLinkLike } from './guestLinkStatus';

export type GuestLinkTableItem = GuestLinkLike & {
  id: number;
  label: string | null;
};

export function filterGuestLinks(
  links: GuestLinkTableItem[],
  searchLabel: string,
  statusFilters: Record<GuestLinkStatus, boolean>
): GuestLinkTableItem[] {
  const needle = searchLabel.trim().toLowerCase();
  return links.filter((link) => {
    const matchesLabel = (link.label ?? '').toLowerCase().includes(needle);
    return matchesLabel && statusFilters[getLinkStatus(link)];
  });
}

export function paginateGuestLinks<T>(
  links: T[],
  currentPage: number,
  pageSize: number
): T[] {
  const start = Math.max(0, (currentPage - 1) * pageSize);
  return links.slice(start, start + pageSize);
}
