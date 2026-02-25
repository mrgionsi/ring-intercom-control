import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';
import type { GuestLinkStatus } from './guestLinkStatus';
import { setLanguage } from '../i18n';
import { Icon } from '../components/Icon';

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
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [slideValue, setSlideValue] = useState(0);
  const unlockInProgressRef = useRef(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = (ref: { current: ReturnType<typeof setTimeout> | null }) => {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

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
      .catch((err) => setError(err.message ?? t('guest.link_not_found')));
  }, [token, t]);

  useEffect(() => {
    setSlideValue(0);
  }, [status?.state]);

  useEffect(
    () => () => {
      clearTimeoutRef(unlockTimeoutRef);
      clearTimeoutRef(messageTimeoutRef);
      clearTimeoutRef(slideTimeoutRef);
    },
    []
  );

  const handleUnlock = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/guest/${token}/unlock`, { method: 'POST' });
      setMessage(t('guest.requested'));
      setUnlockSuccess(true);
      clearTimeoutRef(unlockTimeoutRef);
      clearTimeoutRef(messageTimeoutRef);
      unlockTimeoutRef.current = setTimeout(() => {
        setUnlockSuccess(false);
        unlockTimeoutRef.current = null;
      }, 1600);
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null);
        messageTimeoutRef.current = null;
      }, 2200);
    } catch (err: any) {
      setError(err.message ?? t('guest.error'));
    } finally {
      setLoading(false);
    }
  };

  const canUnlock = Boolean(status?.state === 'valid' && !loading);
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en')
    .toLowerCase()
    .split('-')[0];

  const handleSlideChange = async (nextValue: number) => {
    setSlideValue(nextValue);
    if (!canUnlock) {
      return;
    }
    if (nextValue < 98 || unlockInProgressRef.current) {
      return;
    }
    unlockInProgressRef.current = true;
    await handleUnlock();
    setSlideValue(0);
    clearTimeoutRef(slideTimeoutRef);
    slideTimeoutRef.current = setTimeout(() => {
      unlockInProgressRef.current = false;
      slideTimeoutRef.current = null;
    }, 300);
  };

  const displayLabel =
    status && status.label && status.label.trim() && !/^\d+$/.test(status.label.trim())
      ? status.label
      : t('guest.welcome');
  const slideStyle = { '--slide-pct': `${slideValue}%` } as CSSProperties;

  return (
    <div className="page guest-page">
      <div className="card narrow guest-card">
        <div className="guest-topbar">
          <h1 className="nav-link">
            <Icon name="unlock" />
            {t('guest.title')}
          </h1>
          <div className="guest-lang-switch">
            <span className="guest-lang-label nav-link">
              <Icon name="language" />
              {t('app.language')}
            </span>
            <select
              className="guest-lang-select"
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="it">IT</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
            </select>
          </div>
        </div>
        {status ? (
          <>
            <div className="guest-status-row">
              <strong className="guest-link-label">{displayLabel}</strong>
              <span className={`badge ${statusBadgeClass(status.state)}`}>
                <span className="nav-link">
                  <span className="guest-badge-icon-dot">
                    <Icon name="status" />
                  </span>
                  {statusStateLabel(status.state, t)}
                </span>
              </span>
            </div>
            <div className="guest-meta-grid">
              <div className="guest-meta-item">
                <span className="muted nav-link">
                  <Icon name="status" />
                  {t('guest.starts')}
                </span>
                <strong>{formatDateTime(status.startsAt)}</strong>
              </div>
              <div className="guest-meta-item">
                <span className="muted nav-link">
                  <Icon name="status" />
                  {t('guest.expires')}
                </span>
                <strong>{formatDateTime(status.expiresAt)}</strong>
              </div>
              <div className="guest-meta-item">
                <span className="muted nav-link">
                  <Icon name="links" />
                  {t('guest_links.uses')}
                </span>
                <strong>
                  {status.uses}
                  {status.maxUses ? ` / ${status.maxUses}` : ''}
                </strong>
              </div>
            </div>
            <div className={`slide-unlock ${canUnlock ? '' : 'disabled'}`}>
              <div className="slide-unlock-title">
                <span className="nav-link">
                  <Icon name="unlock" />
                  {loading ? t('guest.unlocking') : t('guest.unlock')}
                </span>
              </div>
              <div className="slide-range-wrap" style={slideStyle}>
                <div className="slide-track-base" aria-hidden />
                <div className="slide-track-fill" aria-hidden />
                <div
                  className={`slide-track-hint ${slideValue > 8 ? 'hidden' : ''}`}
                  aria-hidden
                >
                  › › ›
                </div>
                <input
                  className="slide-range"
                  type="range"
                  min={0}
                  max={100}
                  value={slideValue}
                  disabled={!canUnlock}
                  onChange={(e) => void handleSlideChange(Number(e.target.value))}
                  onMouseUp={() => setSlideValue((value) => (value >= 98 ? value : 0))}
                  onTouchEnd={() => setSlideValue((value) => (value >= 98 ? value : 0))}
                  aria-label={t('guest.unlock')}
                />
              </div>
              <div className="slide-unlock-hint">
                {canUnlock ? t('guest.slide_to_unlock') : getStateMessage(status.state)}
              </div>
              {unlockSuccess ? (
                <div className="unlock-success-chip">
                  <span className="unlock-success-dot">✓</span>
                  {t('guest.requested')}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted">{t('guest.checking')}</p>
        )}
        {message && !unlockSuccess ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>
    </div>
  );
}

function statusBadgeClass(state: GuestLinkStatus): string {
  if (state === 'valid') return 'ok';
  if (state === 'scheduled' || state === 'used_up') return 'warn';
  if (state === 'disabled') return 'disabled';
  return 'danger';
}

function statusStateLabel(
  state: GuestLinkStatus | string,
  t: (key: string) => string
): string {
  if (state === 'valid') return t('guest.state_valid');
  if (state === 'scheduled') return t('guest.state_scheduled');
  if (state === 'expired') return t('guest.state_expired');
  if (state === 'used_up') return t('guest.state_used_up');
  if (state === 'disabled') return t('guest.state_disabled');
  if (state === 'invalid_date') return t('guest.state_invalid');
  return t('guest.state_unknown');
}
