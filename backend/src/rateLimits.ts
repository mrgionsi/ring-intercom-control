import { getSetting, setSetting } from './db.js';

type Limits = {
  guestPerMinute: number;
  authPerMinute: number;
};

const defaults: Limits = {
  guestPerMinute: 20,
  authPerMinute: 120
};

let current: Limits = { ...defaults };

export async function loadRateLimits(): Promise<void> {
  const guestRaw = await getSetting('rate_limit_guest_per_min');
  const authRaw = await getSetting('rate_limit_auth_per_min');
  const guest = guestRaw ? Number(guestRaw) : defaults.guestPerMinute;
  const auth = authRaw ? Number(authRaw) : defaults.authPerMinute;

  current = {
    guestPerMinute: Number.isFinite(guest) && guest > 0 ? guest : defaults.guestPerMinute,
    authPerMinute: Number.isFinite(auth) && auth > 0 ? auth : defaults.authPerMinute
  };
}

export function getRateLimits(): Limits {
  return current;
}

export async function updateRateLimits(input: Partial<Limits>): Promise<Limits> {
  const next: Limits = {
    guestPerMinute:
      input.guestPerMinute && input.guestPerMinute > 0
        ? input.guestPerMinute
        : current.guestPerMinute,
    authPerMinute:
      input.authPerMinute && input.authPerMinute > 0
        ? input.authPerMinute
        : current.authPerMinute
  };

  current = next;
  await setSetting('rate_limit_guest_per_min', String(next.guestPerMinute));
  await setSetting('rate_limit_auth_per_min', String(next.authPerMinute));
  return next;
}
