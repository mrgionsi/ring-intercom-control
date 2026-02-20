import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';

type RingSummary = {
  locationId: string;
  locationName: string;
  intercoms: Array<{
    id: string;
    name: string;
    kind: string;
    data: unknown;
    batteryPercent?: number | null;
    batteryCategory?: string | null;
    connection?: string | null;
    rssi?: number | null;
    firmware?: string | null;
    otaStatus?: string | null;
    wifiName?: string | null;
    powerSource?: string | null;
  }>;
  cameras: Array<{
    id: string;
    name: string;
    kind: string;
    data: unknown;
  }>;
};

type AuditEvent = {
  id: number;
  intercom_id: string;
  source: 'user' | 'guest';
  guest_link_id: number | null;
  success: number;
  error_message: string | null;
  created_at: string;
};

type HealthSample = {
  id: number;
  battery_percent: number | null;
  rssi: number | null;
  ota_status: string | null;
  created_at: string;
};

export default function Admin() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<RingSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [healthHistory, setHealthHistory] = useState<Record<string, HealthSample[]>>(
    {}
  );
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({});

  const loadSummary = async () => {
    const data = await apiFetch<{ summary: RingSummary[] }>('/api/ring/summary');
    setSummary(data.summary);
  };

  const loadAudit = async () => {
    const data = await apiFetch<{ events: AuditEvent[] }>('/api/audit');
    setAuditEvents(data.events);
  };

  useEffect(() => {
    setInitializing(true);
    Promise.all([loadSummary(), loadAudit()]).catch(() => null)
      .finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      Promise.all([loadSummary(), loadAudit()]).catch(() => null);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleUnlock = async (intercomId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/ring/unlock', {
        method: 'POST',
        body: JSON.stringify({ intercomId })
      });
      setMessage(t('messages.unlock_sent'));
      setToast(t('messages.unlock_sent'));
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? t('guest.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadHealthHistory = async (intercomId: string) => {
    setHealthLoading((prev) => ({ ...prev, [intercomId]: true }));
    try {
      const data = await apiFetch<{ history: HealthSample[] }>(
        `/api/ring/health/history?intercomId=${encodeURIComponent(intercomId)}`
      );
      setHealthHistory((prev) => ({ ...prev, [intercomId]: data.history }));
    } catch {
      setHealthHistory((prev) => ({ ...prev, [intercomId]: [] }));
    } finally {
      setHealthLoading((prev) => ({ ...prev, [intercomId]: false }));
    }
  };

  const handleReload = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([loadSummary(), loadAudit()]);
      setToast(t('messages.devices_refreshed'));
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>{t('app.loading')}</div>
        </div>
      ) : null}

      <section className="card">
        <h2 className="section-title">
          <UiIcon name="intercom" />
          {t('intercoms.title')}
        </h2>
        <div className="actions">
          <p>{t('intercoms.desc')}</p>
          <button
            className="btn ghost"
            onClick={handleReload}
            disabled={refreshing || initializing}
          >
            {refreshing ? t('intercoms.reloading') : t('intercoms.reload')}
          </button>
        </div>
        {summary.length === 0 ? (
          <p className="muted">{t('intercoms.none')}</p>
        ) : (
          summary.map((location) => (
            <div key={location.locationId} className="stack">
              <h3>{location.locationName}</h3>
              {location.intercoms.length === 0 ? (
                <p className="muted">{t('intercoms.no_intercoms')}</p>
              ) : (
                <div className="grid">
                  {location.intercoms.map((intercom) => (
                    <div key={intercom.id} className="tile intercom-card">
                      <div className="intercom-main">
                        <div className="intercom-head">
                          <strong className="intercom-name">{intercom.name}</strong>
                          <span className="intercom-id">ID: {intercom.id}</span>
                        </div>
                        <div className="intercom-stats">
                          <span className="stat-pill">
                            <UiIcon name="battery" />
                            {t('intercoms.battery')}: {formatBattery(intercom.batteryPercent, intercom.data)}
                          </span>
                          {intercom.rssi !== null &&
                          intercom.rssi !== undefined ? (
                            <span className="stat-pill">
                              <UiIcon name="signal" />
                              {t('intercoms.rssi')}: {intercom.rssi}
                            </span>
                          ) : null}
                          {intercom.connection ? (
                            <span className="stat-pill">
                              <UiIcon name="status" />
                              {intercom.connection}
                            </span>
                          ) : null}
                        </div>
                        <div className="intercom-secondary">
                          {intercom.firmware ? (
                            <div className="muted">
                              <UiIcon name="firmware" /> {t('intercoms.firmware')}: {intercom.firmware}
                            </div>
                          ) : null}
                          {intercom.wifiName ? (
                            <div className="muted">
                              <UiIcon name="wifi" /> {t('intercoms.wifi')}: {intercom.wifiName}
                            </div>
                          ) : null}
                          {intercom.otaStatus ? (
                            <div className="muted">
                              <UiIcon name="ota" /> {t('intercoms.ota')}: {intercom.otaStatus}
                            </div>
                          ) : null}
                        </div>
                        <details className="details">
                          <summary>{t('intercoms.raw_data')}</summary>
                          <pre>{JSON.stringify(intercom.data, null, 2)}</pre>
                        </details>
                        <details
                          className="details"
                          onToggle={(e) => {
                            const open = (e.currentTarget as HTMLDetailsElement).open;
                            if (open && !healthHistory[intercom.id]) {
                              loadHealthHistory(intercom.id);
                            }
                          }}
                        >
                          <summary>{t('intercoms.health_history')}</summary>
                          {healthLoading[intercom.id] ? (
                            <p className="muted">{t('intercoms.health_loading')}</p>
                          ) : healthHistory[intercom.id]?.length ? (
                            <div className="stack">
                              {healthHistory[intercom.id].map((sample) => (
                                <div key={sample.id} className="tile">
                                  <div>
                                    <strong>
                                      {formatDateTime(sample.created_at)}
                                    </strong>
                                    <div className="muted">
                                      {t('intercoms.battery')}:{' '}
                                      {typeof sample.battery_percent === 'number'
                                        ? `${sample.battery_percent}%`
                                        : 'n/a'}
                                    </div>
                                    <div className="muted">
                                      {t('intercoms.rssi')}: {sample.rssi ?? 'n/a'}
                                    </div>
                                    <div className="muted">
                                      {t('intercoms.ota')}: {sample.ota_status ?? 'n/a'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">{t('intercoms.health_none')}</p>
                          )}
                        </details>
                      </div>
                      <button
                        className="btn nav-link"
                        onClick={() => handleUnlock(intercom.id)}
                        disabled={loading || initializing}
                      >
                        <UiIcon name="unlock" />
                        {t('intercoms.unlock')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>{t('admin.unlock_history')}</h2>
        {auditEvents.length === 0 ? (
          <p className="muted">{t('common.no_data')}</p>
        ) : (
          <div className="stack">
            {auditEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>Intercom {event.intercom_id}</strong>
                  <div className="muted">
                    {event.source === 'guest'
                      ? t('profile.guest_link')
                      : t('profile.user')}{' '}
                    - {formatDateTime(event.created_at)}
                  </div>
                  {event.error_message ? (
                    <div className="muted">
                      {t('profile.error')}: {event.error_message}
                    </div>
                  ) : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? t('common.success') : t('common.failed')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function UiIcon({
  name
}: {
  name:
    | 'intercom'
    | 'unlock'
    | 'battery'
    | 'signal'
    | 'status'
    | 'firmware'
    | 'wifi'
    | 'ota';
}) {
  const common = {
    className: 'nav-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'intercom') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <circle cx="12" cy="14" r="1.5" />
      </svg>
    );
  }
  if (name === 'unlock') {
    return (
      <svg {...common}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0" />
      </svg>
    );
  }
  if (name === 'battery') {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="16" height="10" rx="2" />
        <line x1="21" y1="10" x2="21" y2="14" />
      </svg>
    );
  }
  if (name === 'signal') {
    return (
      <svg {...common}>
        <line x1="4" y1="20" x2="4" y2="16" />
        <line x1="9" y1="20" x2="9" y2="12" />
        <line x1="14" y1="20" x2="14" y2="8" />
        <line x1="19" y1="20" x2="19" y2="4" />
      </svg>
    );
  }
  if (name === 'status') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  if (name === 'firmware') {
    return (
      <svg {...common}>
        <path d="M12 3v8" />
        <path d="M8 9l4 4 4-4" />
        <rect x="4" y="15" width="16" height="6" rx="2" />
      </svg>
    );
  }
  if (name === 'wifi') {
    return (
      <svg {...common}>
        <path d="M5 9a10 10 0 0 1 14 0" />
        <path d="M8 12a6 6 0 0 1 8 0" />
        <path d="M11 15a2 2 0 0 1 2 0" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 2v6" />
      <path d="M12 22v-6" />
      <path d="M4.93 4.93l4.24 4.24" />
      <path d="M14.83 14.83l4.24 4.24" />
      <path d="M2 12h6" />
      <path d="M22 12h-6" />
      <path d="M4.93 19.07l4.24-4.24" />
      <path d="M14.83 9.17l4.24-4.24" />
    </svg>
  );
}

function formatBattery(
  batteryPercent?: number | null,
  data?: unknown
): string {
  if (typeof batteryPercent === 'number' && Number.isFinite(batteryPercent)) {
    return `${batteryPercent}%`;
  }

  const raw = data as any;
  const fallback =
    raw?.health?.battery_percentage ??
    raw?.battery_life ??
    raw?.batteryLife ??
    raw?.battery ??
    raw?.battery_percentage;

  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return `${fallback}%`;
  }
  if (typeof fallback === 'string' && fallback.trim() !== '') {
    const asNumber = Number(fallback);
    if (Number.isFinite(asNumber)) {
      return `${asNumber}%`;
    }
  }
  return 'n/a';
}
