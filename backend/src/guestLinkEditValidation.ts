export type GuestLinkEditInput = {
  expiresAt?: unknown;
  startsAtIso: string;
  disabled: boolean;
};

export type GuestLinkEditValidationResult =
  | {
      ok: true;
      expiresAtIso: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function validateGuestLinkExpiresAtUpdate(
  input: GuestLinkEditInput
): GuestLinkEditValidationResult {
  if (input.disabled) {
    return {
      ok: false,
      status: 400,
      error: 'Disabled links cannot be edited'
    };
  }

  if (typeof input.expiresAt !== 'string' || !input.expiresAt.trim()) {
    return { ok: false, status: 400, error: 'expiresAt is required' };
  }

  const nextTs = Date.parse(input.expiresAt);
  if (!Number.isFinite(nextTs)) {
    return { ok: false, status: 400, error: 'Invalid date format' };
  }
  if (nextTs <= Date.now()) {
    return { ok: false, status: 400, error: 'expiresAt must be in the future' };
  }

  const startTs = Date.parse(input.startsAtIso);
  if (Number.isFinite(startTs) && nextTs <= startTs) {
    return {
      ok: false,
      status: 400,
      error: 'expiresAt must be later than startsAt'
    };
  }

  return {
    ok: true,
    expiresAtIso: new Date(nextTs).toISOString()
  };
}
