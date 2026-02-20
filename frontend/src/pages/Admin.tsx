import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';
import { Icon } from '../components/Icon';

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

  const handleUnlock = async (intercomId: string, ringAccountId: number) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/ring/unlock', {
        method: 'POST',
        body: JSON.stringify({ intercomId, ringAccountId })
      });
      setMessage(t('messages.unlock_sent'));
      setToast(t('messages.unlock_sent'));
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
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
          <Icon name="intercom" />
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
              <div className="muted">
                {t('intercoms.account')}: {location.ringAccountLabel}
              </div>
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
                            <Icon name="battery" />
                            {t('intercoms.battery')}: {formatBattery(intercom.batteryPercent, intercom.data)}
                          </span>
                          {intercom.rssi !== null &&
                          intercom.rssi !== undefined ? (
                            <span className="stat-pill">
                              <Icon name="signal" />
                              {t('intercoms.rssi')}: {intercom.rssi}
                            </span>
                          ) : null}
                          {intercom.connection ? (
                            <span className="stat-pill">
                              <Icon name="status" />
                              {intercom.connection}
                            </span>
                          ) : null}
                        </div>
                        <div className="intercom-secondary">
                          {intercom.firmware ? (
                            <div className="muted">
                              <Icon name="firmware" /> {t('intercoms.firmware')}: {intercom.firmware}
                            </div>
                          ) : null}
                          {intercom.wifiName ? (
                            <div className="muted">
                              <Icon name="wifi" /> {t('intercoms.wifi')}: {intercom.wifiName}
                            </div>
                          ) : null}
                          {intercom.otaStatus ? (
                            <div className="muted">
                              <Icon name="ota" /> {t('intercoms.ota')}: {intercom.otaStatus}
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
                        onClick={() => handleUnlock(intercom.id, intercom.ringAccountId)}
                        disabled={loading || initializing}
                      >
                        <Icon name="unlock" />
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
