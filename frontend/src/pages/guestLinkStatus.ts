export type GuestLinkStatus = 'disabled' | 'used_up' | 'scheduled' | 'expired' | 'valid';

export type GuestLinkLike = {
  startsAt: string;
  expiresAt: string;
  disabled: number;
  maxUses: number | null;
  uses: number;
};

export function isLinkValidForNow(startsAt: string, expiresAt: string): boolean {
  const start = Date.parse(startsAt);
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }
  const now = Date.now();
  return now >= start && now < end;
}

export function getLinkStatus(link: GuestLinkLike): GuestLinkStatus {
  if (link.disabled === 1) {
    return 'disabled';
  }
  if (link.maxUses !== null && link.uses >= link.maxUses) {
    return 'used_up';
  }
  const start = Date.parse(link.startsAt);
  const end = Date.parse(link.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 'expired';
  }
  const now = Date.now();
  if (now < start) {
    return 'scheduled';
  }
  if (now >= end) {
    return 'expired';
  }
  return 'valid';
}

export function statusClassFor(status: GuestLinkStatus): string {
  if (status === 'valid') return 'ok';
  if (status === 'expired') return 'danger';
  if (status === 'scheduled' || status === 'used_up') return 'warn';
  return 'disabled';
}
