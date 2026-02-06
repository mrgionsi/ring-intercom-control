import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

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
  const [configured, setConfigured] = useState(false);
  const [refreshToken, setRefreshToken] = useState('');
  const [editingToken, setEditingToken] = useState(false);
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

  const loadStatus = async () => {
    const status = await apiFetch<{ configured: boolean }>('/api/ring/status');
    setConfigured(status.configured);
  };

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
    loadStatus()
      .then(() => Promise.all([loadSummary(), loadAudit()]).catch(() => null))
      .catch(() => null)
      .finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      Promise.all([loadSummary(), loadAudit()]).catch(() => null);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveToken = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/ring/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
      setMessage('Refresh token saved.');
      setConfigured(true);
      setEditingToken(false);
      setRefreshToken('');
      await loadSummary();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save token');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (intercomId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/ring/unlock', {
        method: 'POST',
        body: JSON.stringify({ intercomId })
      });
      setMessage('Unlock signal sent.');
      setToast('Unlock request sent.');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Unlock failed');
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
      setToast('Devices refreshed.');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to refresh devices');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>Loading Ring configuration…</div>
        </div>
      ) : null}
      <section className="card">
        <h2>Ring Connection</h2>
        <p>
          Store a Ring refresh token securely. You can generate one with the
          Ring CLI from ring-client-api. Paste it below and save.
        </p>
        <div className="stack">
          {configured && !editingToken ? (
            <div className="token-status">
              <div>
                <strong>Refresh token is already stored.</strong>
                <div className="muted">
                  You do not need to paste it again unless you want to replace
                  it.
                </div>
              </div>
              <button
                className="btn ghost"
                onClick={() => setEditingToken(true)}
                disabled={loading || initializing}
              >
                Edit token
              </button>
            </div>
          ) : (
            <>
              <label className="field">
                <span>Refresh Token</span>
                <textarea
                  rows={4}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Paste refresh token here"
                />
              </label>
              <div className="actions">
                <button
                  className="btn"
                  onClick={handleSaveToken}
                  disabled={loading || !refreshToken.trim()}
                >
                  {loading ? 'Saving…' : 'Save Token'}
                </button>
                {configured ? (
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setEditingToken(false);
                      setRefreshToken('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </>
          )}
          {configured ? (
            <p className="success">Ring is configured.</p>
          ) : (
            <p className="muted">No token stored yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Intercoms</h2>
        <div className="actions">
          <p>Unlock your intercoms directly from the dashboard.</p>
          <button
            className="btn ghost"
            onClick={handleReload}
            disabled={refreshing || initializing}
          >
            {refreshing ? 'Refreshing…' : 'Reload devices'}
          </button>
        </div>
        {summary.length === 0 ? (
          <p className="muted">No devices loaded yet.</p>
        ) : (
          summary.map((location) => (
            <div key={location.locationId} className="stack">
              <h3>{location.locationName}</h3>
              {location.intercoms.length === 0 ? (
                <p className="muted">No intercoms detected.</p>
              ) : (
                <div className="grid">
                  {location.intercoms.map((intercom) => (
                    <div key={intercom.id} className="tile">
                      <div>
                        <strong>{intercom.name}</strong>
                        <div className="muted">ID: {intercom.id}</div>
                        <div className="meta">
                          <span>
                            Battery:{' '}
                            {formatBattery(intercom.batteryPercent, intercom.data)}
                          </span>
                          {intercom.batteryCategory ? (
                            <span className="badge">
                              {intercom.batteryCategory}
                            </span>
                          ) : null}
                          {intercom.connection ? (
                            <span className="badge">
                              {intercom.connection}
                            </span>
                          ) : null}
                          {intercom.rssi !== null &&
                          intercom.rssi !== undefined ? (
                            <span className="badge">
                              RSSI {intercom.rssi}
                            </span>
                          ) : null}
                        </div>
                        {intercom.firmware ? (
                          <div className="muted">
                            Firmware: {intercom.firmware}
                          </div>
                        ) : null}
                        {intercom.wifiName ? (
                          <div className="muted">
                            Wi‑Fi: {intercom.wifiName}
                          </div>
                        ) : null}
                        {intercom.otaStatus ? (
                          <div className="muted">
                            OTA: {intercom.otaStatus}
                          </div>
                        ) : null}
                        <details className="details">
                          <summary>Raw Data</summary>
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
                          <summary>Health History</summary>
                          {healthLoading[intercom.id] ? (
                            <p className="muted">Loading history…</p>
                          ) : healthHistory[intercom.id]?.length ? (
                            <div className="stack">
                              {healthHistory[intercom.id].map((sample) => (
                                <div key={sample.id} className="tile">
                                  <div>
                                    <strong>
                                      {new Date(sample.created_at).toLocaleString()}
                                    </strong>
                                    <div className="muted">
                                      Battery:{' '}
                                      {typeof sample.battery_percent === 'number'
                                        ? `${sample.battery_percent}%`
                                        : 'n/a'}
                                    </div>
                                    <div className="muted">
                                      RSSI: {sample.rssi ?? 'n/a'}
                                    </div>
                                    <div className="muted">
                                      OTA: {sample.ota_status ?? 'n/a'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">No history yet.</p>
                          )}
                        </details>
                      </div>
                      <button
                        className="btn"
                        onClick={() => handleUnlock(intercom.id)}
                        disabled={loading || initializing}
                      >
                        Unlock
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
        <h2>Cameras & Devices</h2>
        {summary.length === 0 ? (
          <p className="muted">No device data available.</p>
        ) : (
          summary.map((location) => (
            <div key={location.locationId} className="stack">
              <h3>{location.locationName}</h3>
              {location.cameras.length === 0 ? (
                <p className="muted">No cameras detected.</p>
              ) : (
                <div className="grid">
                  {location.cameras.map((camera) => (
                    <div key={camera.id} className="tile">
                      <div>
                        <strong>{camera.name}</strong>
                        <div className="muted">ID: {camera.id}</div>
                      </div>
                      <details className="details">
                        <summary>Raw Data</summary>
                        <pre>
                          {JSON.stringify(camera.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Recent Unlocks</h2>
        {auditEvents.length === 0 ? (
          <p className="muted">No unlock activity yet.</p>
        ) : (
          <div className="stack">
            {auditEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>Intercom {event.intercom_id}</strong>
                  <div className="muted">
                    {event.source === 'guest' ? 'Guest link' : 'User'} ·{' '}
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                  {event.error_message ? (
                    <div className="muted">Error: {event.error_message}</div>
                  ) : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? 'success' : 'failed'}
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
