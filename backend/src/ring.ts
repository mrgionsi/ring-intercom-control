import { RingApi } from 'ring-client-api';
import { decrypt, encrypt } from './crypto.js';
import {
  getLastDeviceHealthSample,
  getUserToken,
  recordDeviceHealthSample,
  setUserToken
} from './db.js';

type RingSummary = {
  locationId: string;
  locationName: string;
  intercoms: Array<{
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

const ringApiByUser = new Map<number, RingApi>();
const ringInitByUser = new Map<number, Promise<RingApi>>();

export async function setUserRefreshToken(
  userId: number,
  refreshToken: string
): Promise<void> {
  const encrypted = encrypt(refreshToken);
  await setUserToken(userId, encrypted);
  ringApiByUser.delete(userId);
  ringInitByUser.delete(userId);
}

export async function hasUserRefreshToken(userId: number): Promise<boolean> {
  return (await getUserToken(userId)) !== null;
}

async function getUserRefreshToken(userId: number): Promise<string> {
  const encrypted = await getUserToken(userId);
  if (!encrypted) {
    throw new Error('RING_NOT_CONFIGURED');
  }
  return decrypt(encrypted);
}

export async function getRingApiForUser(userId: number): Promise<RingApi> {
  const cached = ringApiByUser.get(userId);
  if (cached) {
    return cached;
  }
  const inflight = ringInitByUser.get(userId);
  if (inflight) {
    return inflight;
  }

  const init = (async () => {
    const refreshToken = await getUserRefreshToken(userId);
    const api = new RingApi({ refreshToken });

    api.onRefreshTokenUpdated.subscribe(async ({ newRefreshToken }) => {
      if (newRefreshToken) {
        await setUserRefreshToken(userId, newRefreshToken);
      }
    });

    ringApiByUser.set(userId, api);
    ringInitByUser.delete(userId);
    return api;
  })();

  ringInitByUser.set(userId, init);
  return init;
}

export async function getRingSummaryForUser(
  userId: number
): Promise<RingSummary[]> {
  const api = await getRingApiForUser(userId);
  const locations = await api.getLocations();

  return locations.map((location: any) => {
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

    return {
      locationId: String(location.id),
      locationName: location.name ?? `Location ${location.id}`,
      intercoms,
      cameras
    };
  });
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
  intercomId: string
): Promise<void> {
  const api = await getRingApiForUser(userId);
  const locations = await api.getLocations();
  const allIntercoms: any[] = [];

  for (const location of locations as any[]) {
    const intercoms = location.intercoms ?? [];
    allIntercoms.push(...intercoms);
  }

  const intercom = allIntercoms.find(
    (item) => String(item.id) === String(intercomId)
  );

  if (!intercom) {
    throw new Error('INTERCOM_NOT_FOUND');
  }

  await tryUnlock(intercom);
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
