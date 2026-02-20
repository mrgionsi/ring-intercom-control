export type GuestLinkCreateInput = {
  intercomId?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
};

export type GuestLinkValidationResult =
  | {
      ok: true;
      intercomId: string;
      startsAtIso: string;
      expiresAtIso: string;
      maxUses: number | null;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

export function validateGuestLinkCreateInput(
  input: GuestLinkCreateInput
): GuestLinkValidationResult {
  const intercomId = typeof input.intercomId === 'string' ? input.intercomId.trim() : '';
  const startsAt = typeof input.startsAt === 'string' ? input.startsAt : '';
  const expiresAt = typeof input.expiresAt === 'string' ? input.expiresAt : '';

  if (!intercomId || !startsAt || !expiresAt) {
    return {
      ok: false,
      status: 400,
      error: 'intercomId, startsAt and expiresAt are required'
    };
  }

  const startTs = Date.parse(startsAt);
  const endTs = Date.parse(expiresAt);
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    return { ok: false, status: 400, error: 'Invalid date format' };
  }
  if (endTs <= startTs) {
    return {
      ok: false,
      status: 400,
      error: 'expiresAt must be later than startsAt'
    };
  }

  const maxUses = input.maxUses;
  const parsedMaxUses =
    maxUses === null || maxUses === undefined
      ? null
      : typeof maxUses === 'number' &&
          Number.isInteger(maxUses) &&
          maxUses > 0
        ? maxUses
        : NaN;
  if (Number.isNaN(parsedMaxUses)) {
    return {
      ok: false,
      status: 400,
      error: 'maxUses must be a positive integer'
    };
  }

  return {
    ok: true,
    intercomId,
    startsAtIso: new Date(startTs).toISOString(),
    expiresAtIso: new Date(endTs).toISOString(),
    maxUses: parsedMaxUses
  };
}
