import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';

type GuestStatus = {
  token: string;
  label: string | null;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  valid: boolean;
};

export default function Guest() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<GuestStatus>(`/api/guest/${token}`)
      .then(setStatus)
      .catch((err) => setError(err.message ?? 'Link not found'));
  }, [token]);

  const handleUnlock = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/guest/${token}/unlock`, { method: 'POST' });
      setMessage(t('guest.requested'));
    } catch (err: any) {
      setError(err.message ?? t('guest.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card narrow">
        <h1>{t('guest.title')}</h1>
        {status ? (
          <>
            <p>{status.label || t('guest.welcome')}</p>
            <p className="muted">
              {t('guest.expires')}: {new Date(status.expiresAt).toLocaleString()}
            </p>
            <button
              className="btn"
              onClick={handleUnlock}
              disabled={!status.valid || loading}
            >
              {loading ? t('guest.unlocking') : t('guest.unlock')}
            </button>
          </>
        ) : (
          <p className="muted">{t('guest.checking')}</p>
        )}
        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>
    </div>
  );
}
