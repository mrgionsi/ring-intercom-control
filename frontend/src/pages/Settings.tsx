import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const [configured, setConfigured] = useState(false);
  const [refreshToken, setRefreshToken] = useState('');
  const [editingToken, setEditingToken] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
  const [testLoading, setTestLoading] = useState(false);

  const loadStatus = async () => {
    const status = await apiFetch<{ configured: boolean }>('/api/ring/status');
    setConfigured(status.configured);
  };

  useEffect(() => {
    setInitializing(true);
    loadStatus()
      .catch(() => null)
      .finally(() => setInitializing(false));
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
      setToast(t('messages.token_saved'));
      setTimeout(() => setToast(null), 3000);
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

  const handleTestToken = async () => {
    if (!refreshToken.trim()) return;
    setTestLoading(true);
    setError(null);
    setMessage(null);
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
      setError(err.message ?? t('ring.test_failed'));
    } finally {
      setTestLoading(false);
    }
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
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.desc')}</p>
      </section>
      <section className="card">
        <h2>{t('ring.connection_title')}</h2>
        <p>{t('ring.connection_desc')}</p>
        <div className="stack">
          {configured && !editingToken ? (
            <div className="token-status">
              <div>
                <strong>{t('ring.token_stored')}</strong>
                <div className="muted">{t('ring.token_stored_desc')}</div>
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
                <button
                  className="btn ghost"
                  onClick={handleTestToken}
                  disabled={testLoading || !refreshToken.trim()}
                >
                  {testLoading ? t('ring.testing') : t('ring.test_token')}
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
                {authError ? <p className="error">{authError}</p> : null}
                <div className="actions">
                  {authSessionId ? (
                    <>
                      <button
                        className="btn"
                        onClick={handleAuthVerify}
                        disabled={authLoading || !authCode.trim()}
                      >
                        {authLoading
                          ? t('ring.verifying')
                          : t('ring.verify_code')}
                      </button>
                      <button
                        className="btn ghost"
                        onClick={handleAuthStart}
                        disabled={
                          authLoading ||
                          !authEmail.trim() ||
                          !authPassword.trim()
                        }
                      >
                        {authLoading
                          ? t('ring.requesting_code')
                          : t('ring.resend_code')}
                      </button>
                    </>
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
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
