import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';
import { Icon } from '../components/Icon';

type RingAccount = {
  id: number;
  label: string;
  isDefault: boolean;
  configured: boolean;
  updatedAt: string;
};

type RingSummary = {
  ringAccountId: number;
  locationName: string;
  intercoms: Array<{
    ringAccountId: number;
    id: string;
    name: string;
    data: unknown;
    batteryPercent?: number | null;
    connection?: string | null;
    rssi?: number | null;
  }>;
};

type AccountIntercom = {
  id: string;
  name: string;
  locationName: string;
  batteryPercent?: number | null;
  connection?: string | null;
  rssi?: number | null;
  data: unknown;
};

type IntegrationMode = 'auth' | 'token';

export default function Settings() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<RingAccount[]>([]);
  const [summary, setSummary] = useState<RingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [unlockingKey, setUnlockingKey] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalAccount, setDeleteModalAccount] = useState<RingAccount | null>(null);
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>('auth');
  const [targetAccountId, setTargetAccountId] = useState<number | null>(null);
  const [accountLabel, setAccountLabel] = useState('');

  const [refreshToken, setRefreshToken] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadData = async () => {
    const [status, ringSummary] = await Promise.all([
      apiFetch<{ accounts: RingAccount[] }>('/api/ring/status'),
      apiFetch<{ summary: RingSummary[] }>('/api/ring/summary')
    ]);
    setAccounts(status.accounts);
    setSummary(ringSummary.summary);
  };

  useEffect(() => {
    setInitializing(true);
    loadData()
      .catch((err: any) => setError(err.message ?? t('common.error')))
      .finally(() => setInitializing(false));
  }, []);

  const anyModalOpen = modalOpen || Boolean(deleteModalAccount);

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (deleteModalAccount) {
          setDeleteModalAccount(null);
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyModalOpen, deleteModalAccount]);

  const intercomsByAccountId = useMemo(() => {
    const map = new Map<number, AccountIntercom[]>();
    for (const location of summary) {
      for (const intercom of location.intercoms) {
        const existing = map.get(intercom.ringAccountId) ?? [];
        existing.push({
          id: intercom.id,
          name: intercom.name,
          locationName: location.locationName,
          batteryPercent: intercom.batteryPercent,
          connection: intercom.connection,
          rssi: intercom.rssi,
          data: intercom.data
        });
        map.set(intercom.ringAccountId, existing);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [summary]);

  const totalIntercoms = useMemo(
    () => Array.from(intercomsByAccountId.values()).reduce((acc, list) => acc + list.length, 0),
    [intercomsByAccountId]
  );

  const targetAccount = accounts.find((a) => a.id === targetAccountId) ?? null;

  const openAddIntegration = () => {
    setTargetAccountId(null);
    setIntegrationMode('auth');
    setAccountLabel('');
    resetModalFields();
    setModalOpen(true);
  };

  const openRenewIntegration = (accountId: number) => {
    setTargetAccountId(accountId);
    setIntegrationMode('auth');
    setAccountLabel('');
    resetModalFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTargetAccountId(null);
    setAccountLabel('');
    resetModalFields();
  };

  const resetModalFields = () => {
    setRefreshToken('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthCode('');
    setAuthPrompt(null);
    setAuthSessionId(null);
    setAuthError(null);
  };

  const saveRefreshToken = async (token: string) => {
    if (!targetAccountId && !accountLabel.trim()) {
      setAuthError(t('settings.account_required'));
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      await apiFetch('/api/ring/refresh-token', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: token,
          ringAccountId: targetAccountId ?? undefined,
          accountLabel: targetAccountId ? undefined : accountLabel.trim()
        })
      });
      await loadData();
      closeModal();
      setToast(t('messages.token_saved'));
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setAuthError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestToken = async () => {
    if (!refreshToken.trim()) return;
    setTestLoading(true);
    setAuthError(null);
    try {
      const data = await apiFetch<{ ok: boolean; locations: number }>(
        '/api/ring/refresh-token/test',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        }
      );
      if (data.ok) {
        setToast(t('ring.test_success', { count: data.locations }));
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      setAuthError(err.message ?? t('ring.test_failed'));
    } finally {
      setTestLoading(false);
    }
  };

  const handleAuthStart = async () => {
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (!targetAccountId && !accountLabel.trim()) {
      setAuthError(t('settings.account_required'));
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await apiFetch<{
        refreshToken?: string;
        requires2fa?: boolean;
        authSessionId?: string;
        prompt?: string;
      }>('/api/ring/auth/start', {
        method: 'POST',
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          ringAccountId: targetAccountId ?? undefined,
          accountLabel: targetAccountId ? undefined : accountLabel.trim()
        })
      });
      if (result.requires2fa && result.authSessionId) {
        setAuthSessionId(result.authSessionId);
        setAuthPrompt(result.prompt ?? t('ring.2fa_prompt_default'));
        setAuthCode('');
        return;
      }
      if (result.refreshToken) {
        await saveRefreshToken(result.refreshToken);
        return;
      }
      setAuthError(t('common.error'));
    } catch (err: any) {
      setAuthError(mapRingAuthError(err?.message, t));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthVerify = async () => {
    if (!authSessionId || !authCode.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await apiFetch<{ refreshToken?: string }>('/api/ring/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ authSessionId, code: authCode })
      });
      if (result.refreshToken) {
        await saveRefreshToken(result.refreshToken);
        return;
      }
      setAuthError(t('common.error'));
    } catch (err: any) {
      setAuthError(mapRingAuthError(err?.message, t));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDeleteAccount = async (account: RingAccount) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/ring/accounts/${account.id}`, { method: 'DELETE' });
      await loadData();
      setToast(t('settings.account_deleted'));
      setTimeout(() => setToast(null), 3000);
      setDeleteModalAccount(null);
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (intercomId: string, ringAccountId: number) => {
    const key = `${ringAccountId}:${intercomId}`;
    setUnlockingKey(key);
    setError(null);
    try {
      await apiFetch('/api/ring/unlock', {
        method: 'POST',
        body: JSON.stringify({ intercomId, ringAccountId })
      });
      setToast(t('messages.unlock_sent'));
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setUnlockingKey(null);
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
      {toast ? <div className="toast">{toast}</div> : null}

      <section className="card">
        <div className="actions settings-head-actions">
          <div>
            <h2 className="section-title">
              <Icon name="settings" />
              {t('settings.title')}
            </h2>
            <p>{t('settings.desc')}</p>
          </div>
          <button
            type="button"
            className="btn nav-link"
            onClick={openAddIntegration}
            disabled={loading || initializing}
          >
            <Icon name="intercom" />
            {t('settings.add_integration')}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">
          <Icon name="intercom" />
          {t('settings.accounts_overview')}
        </h2>
        <p>{t('settings.accounts_overview_desc', { accounts: accounts.length, intercoms: totalIntercoms })}</p>
        {accounts.length === 0 ? (
          <p className="muted">{t('settings.no_accounts')}</p>
        ) : (
          <div className="stack">
            {accounts.map((account) => {
              const intercoms = intercomsByAccountId.get(account.id) ?? [];
              return (
                <div key={account.id} className="tile settings-account-tile">
                  <div className="settings-account-header">
                    <div>
                      <strong className="intercom-name-line">
                        <Icon name="account" />
                        {account.label}
                      </strong>
                      <div className="meta">
                        {account.isDefault ? (
                          <span className="badge">{t('settings.default_account')}</span>
                        ) : null}
                        <span className={`badge ${account.configured ? 'ok' : 'warn'}`}>
                          {account.configured
                            ? t('settings.account_configured')
                            : t('settings.account_not_configured')}
                        </span>
                      </div>
                    </div>
                    <div className="settings-account-actions">
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={() => openRenewIntegration(account.id)}
                        disabled={loading || initializing}
                      >
                        <Icon name="settings" />
                        {t('settings.renew_credentials')}
                      </button>
                      <button
                        type="button"
                        className="btn danger btn-sm"
                        onClick={() => setDeleteModalAccount(account)}
                        disabled={loading || initializing}
                      >
                        <Icon name="trash" />
                        {t('settings.delete_account')}
                      </button>
                    </div>
                  </div>

                  <div className="settings-account-meta">
                    <div className="muted">
                      {t('settings.token_state')}:{' '}
                      {account.configured ? t('ring.token_stored') : t('ring.not_configured')}
                    </div>
                    <div className="muted">
                      {t('settings.last_updated')}: {formatDateTime(account.updatedAt)}
                    </div>
                  </div>

                  <div className="settings-device-list">
                    <strong>{t('settings.connected_intercoms')}</strong>
                    {intercoms.length === 0 ? (
                      <p className="muted">{t('intercoms.no_intercoms')}</p>
                    ) : (
                      <div className="stack">
                        {intercoms.map((intercom) => (
                          <div key={`${account.id}:${intercom.id}`} className="tile settings-intercom-row">
                            <div>
                              <strong className="intercom-name-line">
                                <Icon name="phone" />
                                {intercom.name}
                              </strong>
                              <div className="muted">
                                ID: {intercom.id} - {intercom.locationName}
                              </div>
                            </div>
                            <div className="intercom-stats">
                              <span className="stat-pill">
                                <Icon name="battery" />
                                {formatBattery(intercom.batteryPercent, intercom.data)}
                              </span>
                              {intercom.rssi !== null && intercom.rssi !== undefined ? (
                                <span className="stat-pill">
                                  <Icon name="signal" />
                                  {intercom.rssi}
                                </span>
                              ) : null}
                              {intercom.connection ? (
                                <span className="stat-pill">
                                  <Icon name="status" />
                                  {intercom.connection}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-sm nav-link"
                                onClick={() => handleUnlock(intercom.id, account.id)}
                                disabled={
                                  loading ||
                                  initializing ||
                                  !account.configured ||
                                  unlockingKey === `${account.id}:${intercom.id}`
                                }
                              >
                                <Icon name="unlock" />
                                {unlockingKey === `${account.id}:${intercom.id}`
                                  ? t('guest.unlocking')
                                  : t('intercoms.unlock')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {error ? <p className="error">{error}</p> : null}

      {modalOpen ? (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <section className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="integration-modal-title">
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
              ×
            </button>
            <h2 id="integration-modal-title">
              {targetAccount
                ? t('settings.renew_modal_title', { label: targetAccount.label })
                : t('settings.new_modal_title')}
            </h2>
            <p>{t('settings.modal_desc')}</p>

            {!targetAccount ? (
              <label className="field">
                <span>{t('settings.new_account_placeholder')}</span>
                <input
                  type="text"
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  placeholder={t('settings.new_account_placeholder')}
                  disabled={loading || authLoading}
                />
              </label>
            ) : null}

            <div className="settings-mode-switch">
              <button
                type="button"
                className={`btn ghost filter-chip ${integrationMode === 'auth' ? 'active' : ''}`}
                onClick={() => setIntegrationMode('auth')}
              >
                {t('settings.mode_auth')}
              </button>
              <button
                type="button"
                className={`btn ghost filter-chip ${integrationMode === 'token' ? 'active' : ''}`}
                onClick={() => setIntegrationMode('token')}
              >
                {t('settings.mode_token')}
              </button>
            </div>

            {integrationMode === 'token' ? (
              <div className="stack">
                <label className="field">
                  <span>{t('ring.refresh_token')}</span>
                  <textarea
                    rows={5}
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder={t('ring.refresh_token')}
                    disabled={loading || authLoading}
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => saveRefreshToken(refreshToken)}
                    disabled={loading || !refreshToken.trim()}
                  >
                    {loading ? t('ring.saving') : t('ring.save_token')}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={handleTestToken}
                    disabled={testLoading || !refreshToken.trim()}
                  >
                    {testLoading ? t('ring.testing') : t('ring.test_token')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack">
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
                    disabled={authLoading}
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
                <div className="actions">
                  {authSessionId ? (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleAuthVerify}
                        disabled={authLoading || !authCode.trim()}
                      >
                        {authLoading ? t('ring.verifying') : t('ring.verify_code')}
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={handleAuthStart}
                        disabled={authLoading || !authEmail.trim() || !authPassword.trim()}
                      >
                        {authLoading ? t('ring.requesting_code') : t('ring.resend_code')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={handleAuthStart}
                      disabled={authLoading || !authEmail.trim() || !authPassword.trim()}
                    >
                      {authLoading ? t('ring.requesting_code') : t('ring.start_auth')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {authError ? <p className="error">{authError}</p> : null}
          </section>
        </div>
      ) : null}

      {deleteModalAccount ? (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setDeleteModalAccount(null)}
        >
          <section className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
            <button
              type="button"
              className="modal-close"
              onClick={() => setDeleteModalAccount(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="delete-account-modal-title">{t('settings.delete_account')}</h2>
            <p>{t('settings.delete_account_confirm', { label: deleteModalAccount.label })}</p>
            <div className="actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeleteModalAccount(null)}
                disabled={loading}
              >
                {t('ring.cancel')}
              </button>
              <button
                type="button"
                className="btn danger btn-sm"
                onClick={() => handleDeleteAccount(deleteModalAccount)}
                disabled={loading}
              >
                <Icon name="trash" />
                {loading ? t('ring.saving') : t('settings.delete_account')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
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

function mapRingAuthError(
  message: string | undefined,
  t: (key: string) => string
): string {
  const raw = (message ?? '').toLowerCase();
  if (raw.includes('access_denied') || raw.includes('verify that your email and password are correct')) {
    return t('ring.error_invalid_credentials');
  }
  if (raw.includes('2fa') || raw.includes('authenticator') || raw.includes('code')) {
    return t('ring.error_invalid_2fa');
  }
  if (raw.includes('expired')) {
    return t('ring.error_auth_session_expired');
  }
  return message ?? t('common.error');
}
