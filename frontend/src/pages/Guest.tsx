import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';

type GuestStatus = {
  token: string;
  label: string | null;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  valid: boolean;
};

export default function Guest() {
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
      setMessage('Door unlock requested.');
    } catch (err: any) {
      setError(err.message ?? 'Unlock failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card narrow">
        <h1>Guest Access</h1>
        {status ? (
          <>
            <p>{status.label || 'Welcome! Use the button below to unlock.'}</p>
            <p className="muted">
              Expires: {new Date(status.expiresAt).toLocaleString()}
            </p>
            <button
              className="btn"
              onClick={handleUnlock}
              disabled={!status.valid || loading}
            >
              {loading ? 'Unlocking…' : 'Unlock Door'}
            </button>
          </>
        ) : (
          <p className="muted">Checking access…</p>
        )}
        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>
    </div>
  );
}
