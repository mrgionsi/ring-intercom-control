import { RingApi } from 'ring-client-api';
import { decrypt, encrypt } from './crypto.js';
import {
  getDefaultRingAccountForUser,
  getLastDeviceHealthSample,
  getRingAccountByIdForUser,
  getRingAccountToken,
  listRingAccountsForUser,
  recordDeviceHealthSample,
  setRingAccountToken
} from './db.js';

type RingSummary = {
  ringAccountId: number;
  ringAccountLabel: string;
  locationId: string;
  locationName: string;
  intercoms: Array<{
    ringAccountId: number;
    ringAccountLabel: string;
    id: string;
    name: string;
    kind: string;
    data: unknown;
  }>;
  cameras: Array<{
    id: string;
    name: string;
    kind: string;
    data: unknown;
  }>;
};

const ringApiByUser = new Map<string, RingApi>();
const ringInitByUser = new Map<string, Promise<RingApi>>();

function accountCacheKey(userId: number, ringAccountId: number): string {
  return `${userId}:${ringAccountId}`;
}

export async function setRingAccountRefreshToken(
  userId: number,
  ringAccountId: number,
  refreshToken: string
): Promise<void> {
  const encrypted = encrypt(refreshToken);
  await setRingAccountToken(userId, ringAccountId, encrypted);
  const key = accountCacheKey(userId, ringAccountId);
  ringApiByUser.delete(key);
  ringInitByUser.delete(key);
}

async function getRingAccountRefreshToken(
  userId: number,
  ringAccountId: number
): Promise<string> {
  const encrypted = await getRingAccountToken(userId, ringAccountId);
  if (!encrypted) {
    throw new Error('RING_NOT_CONFIGURED');
  }
  return decrypt(encrypted);
}

export async function getRingApiForAccount(
  userId: number,
  ringAccountId: number
): Promise<RingApi> {
  const key = accountCacheKey(userId, ringAccountId);
  const cached = ringApiByUser.get(key);
  if (cached) {
    return cached;
  }
  const inflight = ringInitByUser.get(key);
  if (inflight) {
    return inflight;
  }

  const init = (async () => {
    const refreshToken = await getRingAccountRefreshToken(userId, ringAccountId);
    const api = new RingApi({ refreshToken });

    api.onRefreshTokenUpdated.subscribe(async ({ newRefreshToken }) => {
      if (newRefreshToken) {
        await setRingAccountRefreshToken(userId, ringAccountId, newRefreshToken);
      }
    });

    ringApiByUser.set(key, api);
    ringInitByUser.delete(key);
    return api;
  })();

  ringInitByUser.set(key, init);
  return init;
}

export async function getRingSummaryForUser(
  userId: number
): Promise<RingSummary[]> {
  const accounts = await listRingAccountsForUser(userId);
  const summaries: RingSummary[] = [];
  for (const account of accounts) {
    if (!account.refresh_token) {
      continue;
    }
    const api = await getRingApiForAccount(userId, account.id);
    const locations = await api.getLocations();
    for (const location of locations as any[]) {
      const intercoms = (location.intercoms ?? []).map((intercom: any) => {
      const raw = intercom.data ?? intercom;
      const batteryLifeRaw =
        typeof raw?.battery_life === 'string'
          ? Number(raw.battery_life)
          : raw?.battery_life;
      const batteryFromHealth =
        raw?.health?.battery_percentage ??
        raw?.health?.batteryPercentage ??
        raw?.health?.battery;
      const batteryFromOther =
        raw?.battery_life ??
        raw?.batteryLife ??
        raw?.battery ??
        raw?.battery_percentage;

      const parsedBattery =
        batteryFromHealth ??
        (Number.isFinite(batteryLifeRaw) ? batteryLifeRaw : null) ??
        (typeof batteryFromOther === 'string'
          ? Number(batteryFromOther)
          : batteryFromOther);

      const otaStatus =
        raw?.health?.ota_status ??
        raw?.alerts?.ota_status ??
        raw?.alerts?.otaStatus ??
        null;

      void maybeRecordHealthSample(userId, String(raw.id ?? intercom.id), {
        batteryPercent:
          typeof parsedBattery === 'number' && Number.isFinite(parsedBattery)
            ? parsedBattery
            : null,
        rssi: raw?.health?.rssi ?? null,
        otaStatus: typeof otaStatus === 'string' ? otaStatus : null
      });

      return {
        ringAccountId: account.id,
        ringAccountLabel: account.label,
        id: String(raw.id ?? intercom.id),
        name:
          raw.name ??
          raw.description ??
          `Intercom ${raw.id ?? intercom.id}`,
        kind: raw.kind ?? intercom.kind ?? 'intercom',
        data: raw,
        batteryPercent:
          typeof parsedBattery === 'number' && Number.isFinite(parsedBattery)
            ? parsedBattery
            : null,
        batteryCategory: raw?.health?.battery_percentage_category ?? null,
        connection: raw?.alerts?.connection ?? null,
        rssi: raw?.health?.rssi ?? null,
        firmware:
          raw?.health?.firmware_version_status ??
          raw?.firmware_version ??
          null,
        otaStatus: otaStatus ?? null,
        wifiName: raw?.health?.wifi_name ?? null,
        powerSource: raw?.health?.ac_power ? 'ac' : 'battery'
      };
    });

    const cameras = (location.cameras ?? []).map((camera: any) => ({
      id: String(camera.id),
      name: camera.name ?? camera.description ?? `Camera ${camera.id}`,
      kind: camera.kind ?? 'camera',
      data: camera.data ?? camera
    }));

      summaries.push({
        ringAccountId: account.id,
        ringAccountLabel: account.label,
        locationId: String(location.id),
        locationName: location.name ?? `Location ${location.id}`,
        intercoms,
        cameras
      });
    }
  }
  return summaries;
}

async function maybeRecordHealthSample(
  userId: number,
  intercomId: string,
  sample: { batteryPercent: number | null; rssi: number | null; otaStatus: string | null }
): Promise<void> {
  try {
    const last = await getLastDeviceHealthSample(userId, intercomId);
    if (last?.created_at) {
      const lastTime = Date.parse(last.created_at);
      if (Number.isFinite(lastTime) && Date.now() - lastTime < 10 * 60 * 1000) {
        return;
      }
    }
    if (sample.batteryPercent === null && sample.rssi === null && !sample.otaStatus) {
      return;
    }
    await recordDeviceHealthSample({
      userId,
      intercomId,
      batteryPercent: sample.batteryPercent,
      rssi: sample.rssi,
      otaStatus: sample.otaStatus
    });
  } catch {
    // best-effort only
  }
}

export async function unlockIntercomForUser(
  userId: number,
  intercomId: string,
  ringAccountId?: number
): Promise<void> {
  if (typeof ringAccountId === 'number') {
    const account = await getRingAccountByIdForUser(userId, ringAccountId);
    if (!account || !account.refresh_token) {
      throw new Error('RING_NOT_CONFIGURED');
    }
    const api = await getRingApiForAccount(userId, ringAccountId);
    const locations = await api.getLocations();
    const allIntercoms: any[] = [];
    for (const location of locations as any[]) {
      allIntercoms.push(...(location.intercoms ?? []));
    }
    const intercom = allIntercoms.find(
      (item) => String(item.id) === String(intercomId)
    );
    if (!intercom) {
      throw new Error('INTERCOM_NOT_FOUND');
    }
    await tryUnlock(intercom);
    return;
  }

  const fallback = await getDefaultRingAccountForUser(userId);
  if (fallback && fallback.refresh_token) {
    await unlockIntercomForUser(userId, intercomId, fallback.id);
    return;
  }
  const accounts = await listRingAccountsForUser(userId);
  for (const account of accounts) {
    if (!account.refresh_token) continue;
    try {
      await unlockIntercomForUser(userId, intercomId, account.id);
      return;
    } catch {
      // continue
    }
  }
  throw new Error('INTERCOM_NOT_FOUND');
}

async function tryUnlock(device: any): Promise<void> {
  if (typeof device.unlock === 'function') {
    await device.unlock();
    return;
  }
  if (typeof device.openDoor === 'function') {
    await device.openDoor();
    return;
  }
  if (typeof device.unlockDoor === 'function') {
    await device.unlockDoor();
    return;
  }
  if (typeof device.open === 'function') {
    await device.open();
    return;
  }
  throw new Error('UNLOCK_NOT_SUPPORTED');
}
