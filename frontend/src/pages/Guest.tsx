import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';
import type { GuestLinkStatus } from './guestLinkStatus';

type GuestStatus = {
  token: string;
  label: string | null;
  startsAt: string;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  valid: boolean;
  state: GuestLinkStatus;
};

export default function Guest() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStateMessage = (state: GuestLinkStatus): string | null => {
    if (state === 'scheduled') return t('guest.not_active_yet');
    if (state === 'expired') return t('guest.expired');
    if (state === 'used_up') return t('guest.used_up');
    if (state === 'disabled') return t('guest.disabled');
    if (state === 'invalid_date') return t('guest.invalid_date');
    return null;
  };

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
              {t('guest.starts')}: {formatDateTime(status.startsAt)}
            </p>
            <p className="muted">
              {t('guest.expires')}: {formatDateTime(status.expiresAt)}
            </p>
            <button className="btn" onClick={handleUnlock} disabled={status.state !== 'valid' || loading}>
              {loading ? t('guest.unlocking') : t('guest.unlock')}
            </button>
            {getStateMessage(status.state) ? (
              <p className="muted">{getStateMessage(status.state)}</p>
            ) : null}
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
