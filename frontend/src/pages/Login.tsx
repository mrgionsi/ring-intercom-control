import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';

export default function Login({
  onLogin
}: {
  onLogin: (user: { username: string; role: 'admin' | 'user' }) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ username: string; role: 'admin' | 'user' }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password })
        }
      );
      onLogin(result);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card narrow">
        <div className="login-brand">
          <img
            src="/ring_intercom_logo.png"
            alt="Ring Intercom Control logo"
            className="login-logo"
          />
        </div>
        <h1>{t('login.title')}</h1>
        <p>{t('login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>{t('login.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={loading}>
            {loading ? t('login.signing_in') : t('login.sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
}
