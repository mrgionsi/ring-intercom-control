import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';

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
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
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

  const saveRefreshToken = async (token: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/ring/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: token })
      });
      setMessage(t('messages.token_saved'));
      setConfigured(true);
      setEditingToken(false);
      setRefreshToken('');
      await loadSummary();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async () => {
    if (!refreshToken.trim()) return;
    await saveRefreshToken(refreshToken);
  };

  const resetAuthFlow = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthCode('');
    setAuthPrompt(null);
    setAuthSessionId(null);
    setAuthError(null);
    setAuthOpen(false);
  };

  const handleAuthStart = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{
        refreshToken?: string;
        requires2fa?: boolean;
        authSessionId?: string;
        prompt?: string;
      }>('/api/ring/auth/start', {
        method: 'POST',
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      if (result.requires2fa && result.authSessionId) {
        setAuthSessionId(result.authSessionId);
        setAuthPrompt(result.prompt ?? t('ring.2fa_prompt_default'));
        setAuthCode('');
        setAuthPassword('');
      } else if (result.refreshToken) {
        await saveRefreshToken(result.refreshToken);
        resetAuthFlow();
      } else {
        setAuthError(t('common.error'));
      }
    } catch (err: any) {
      setAuthError(err.message ?? t('common.error'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthVerify = async () => {
    if (!authSessionId || !authCode.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ refreshToken?: string }>(
        '/api/ring/auth/verify',
        {
          method: 'POST',
          body: JSON.stringify({ authSessionId, code: authCode })
        }
      );
      if (result.refreshToken) {
        await saveRefreshToken(result.refreshToken);
        resetAuthFlow();
      } else {
        setAuthError(t('common.error'));
      }
    } catch (err: any) {
      setAuthError(err.message ?? t('common.error'));
    } finally {
      setAuthLoading(false);
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
        <h2>{t('ring.connection_title')}</h2>
        <p>{t('ring.connection_desc')}</p>
        <div className="stack">
          {configured && !editingToken ? (
            <div className="token-status">
              <div>
                <strong>{t('ring.token_stored')}</strong>
                <div className="muted">
                  {t('ring.token_stored_desc')}
                </div>
              </div>
              <button
                className="btn ghost"
                onClick={() => setEditingToken(true)}
                disabled={loading || initializing}
              >
                {t('ring.edit_token')}
              </button>
            </div>
          ) : (
            <>
              <label className="field">
                <span>{t('ring.refresh_token')}</span>
                <textarea
                  rows={4}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder={t('ring.refresh_token')}
                />
              </label>
              <div className="actions">
                <button
                  className="btn"
                  onClick={handleSaveToken}
                  disabled={loading || !refreshToken.trim()}
                >
                  {loading ? t('ring.saving') : t('ring.save_token')}
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
                    {t('ring.cancel')}
                  </button>
                ) : null}
              </div>
            </>
          )}
          {configured ? (
            <p className="success">{t('ring.configured')}</p>
          ) : (
            <p className="muted">{t('ring.not_configured')}</p>
          )}
          <div className="divider" />
          <div className="stack">
            <div className="actions">
              <div>
                <strong>{t('ring.generate_title')}</strong>
                <div className="muted">{t('ring.generate_desc')}</div>
              </div>
              <button
                className="btn ghost"
                onClick={() => setAuthOpen((prev) => !prev)}
                disabled={authLoading || initializing}
              >
                {authOpen ? t('ring.generate_hide') : t('ring.generate_show')}
              </button>
            </div>
            {authOpen ? (
              <>
                <p className="muted">{t('ring.generate_note')}</p>
                <label className="field">
                  <span>{t('ring.email')}</span>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="username"
                    disabled={authLoading}
                  />
                </label>
                <label className="field">
                  <span>{t('ring.password')}</span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={authLoading || Boolean(authSessionId)}
                  />
                </label>
                {authSessionId ? (
                  <>
                    <div className="info">
                      {authPrompt ?? t('ring.2fa_prompt_default')}
                    </div>
                    <label className="field">
                      <span>{t('ring.2fa_code')}</span>
                      <input
                        type="text"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        placeholder="123456"
                        inputMode="numeric"
                        disabled={authLoading}
                      />
                    </label>
                  </>
                ) : null}
                {authError ? <p className="error">{authError}</p> : null}
                <div className="actions">
                  {authSessionId ? (
                    <button
                      className="btn"
                      onClick={handleAuthVerify}
                      disabled={authLoading || !authCode.trim()}
                    >
                      {authLoading
                        ? t('ring.verifying')
                        : t('ring.verify_code')}
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={handleAuthStart}
                      disabled={
                        authLoading ||
                        !authEmail.trim() ||
                        !authPassword.trim()
                      }
                    >
                      {authLoading
                        ? t('ring.requesting_code')
                        : t('ring.start_auth')}
                    </button>
                  )}
                  <button
                    className="btn ghost"
                    onClick={resetAuthFlow}
                    disabled={authLoading}
                  >
                    {t('ring.auth_cancel')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{t('intercoms.title')}</h2>
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
                    <div key={intercom.id} className="tile">
                      <div>
                        <strong>{intercom.name}</strong>
                        <div className="muted">ID: {intercom.id}</div>
                        <div className="meta">
                          <span>
                            {t('intercoms.battery')}:{' '}
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
                              {t('intercoms.rssi')} {intercom.rssi}
                            </span>
                          ) : null}
                        </div>
                        {intercom.firmware ? (
                          <div className="muted">
                            {t('intercoms.firmware')}: {intercom.firmware}
                          </div>
                        ) : null}
                        {intercom.wifiName ? (
                          <div className="muted">
                            {t('intercoms.wifi')}: {intercom.wifiName}
                          </div>
                        ) : null}
                        {intercom.otaStatus ? (
                          <div className="muted">
                            {t('intercoms.ota')}: {intercom.otaStatus}
                          </div>
                        ) : null}
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
                                      {new Date(sample.created_at).toLocaleString()}
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
                        className="btn"
                        onClick={() => handleUnlock(intercom.id)}
                        disabled={loading || initializing}
                      >
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
        <h2>{t('devices.title')}</h2>
        {summary.length === 0 ? (
          <p className="muted">{t('devices.none')}</p>
        ) : (
          summary.map((location) => (
            <div key={location.locationId} className="stack">
              <h3>{location.locationName}</h3>
              {location.cameras.length === 0 ? (
                <p className="muted">{t('devices.no_cameras')}</p>
              ) : (
                <div className="grid">
                  {location.cameras.map((camera) => (
                    <div key={camera.id} className="tile">
                      <div>
                        <strong>{camera.name}</strong>
                        <div className="muted">ID: {camera.id}</div>
                      </div>
                      <details className="details">
                        <summary>{t('intercoms.raw_data')}</summary>
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
                    ·{' '}
                    {new Date(event.created_at).toLocaleString()}
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
