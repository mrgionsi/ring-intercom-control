import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { apiFetch, initCsrf } from './api';
import Login from './pages/Login';
import Admin from './pages/Admin';
import GuestLinks from './pages/GuestLinks';
import Guest from './pages/Guest';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';
import { useTranslation } from 'react-i18next';
import { setLanguage } from './i18n';

type User = { username: string; role: 'admin' | 'user' } | null;

export default function App() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    initCsrf()
      .then(() =>
        apiFetch<{ username: string; role: 'admin' | 'user' }>('/api/auth/me')
      )
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <h1>{t('app.loading')}</h1>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="/guest/:token" element={<Guest />} />
      <Route
        path="/"
        element={
          user ? (
            <Shell user={user} onLogout={() => setUser(null)}>
              <Admin />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/links"
        element={
          user ? (
            <Shell user={user} onLogout={() => setUser(null)}>
              <GuestLinks />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/users"
        element={
          user && user.role === 'admin' ? (
            <Shell user={user} onLogout={() => setUser(null)}>
              <AdminUsers />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/settings"
        element={
          user ? (
            <Shell user={user} onLogout={() => setUser(null)}>
              <Settings />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Shell({
  user,
  onLogout,
  children
}: {
  user: { username: string; role: 'admin' | 'user' };
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en')
    .toLowerCase()
    .split('-')[0];
  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  };

  const setLang = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="brand-title">
            <img
              src="/ring_intercom_logo.png"
              alt="Ring Intercom Control logo"
              className="brand-logo"
            />
            <h1>{t('app.title')}</h1>
          </div>
          <p>{t('app.signed_in_as', { username: user.username })}</p>
        </div>
        <div className="actions">
          <Link to="/" className="btn ghost nav-link">
            <NavIcon name="dashboard" />
            {t('app.dashboard')}
          </Link>
          <Link to="/links" className="btn ghost nav-link">
            <NavIcon name="links" />
            {t('app.guest_links')}
          </Link>
          <Link to="/settings" className="btn ghost nav-link">
            <NavIcon name="settings" />
            {t('app.settings')}
          </Link>
          {user.role === 'admin' ? (
            <Link to="/admin/users" className="btn ghost nav-link">
              <NavIcon name="users" />
              {t('app.users')}
            </Link>
          ) : null}
          <div className="lang-select">
            <span className="lang-label">
              <NavIcon name="language" />
              {t('app.language')}
            </span>
            <select
              className="btn ghost lang-native-select"
              onChange={(e) => setLang(e.target.value)}
              value={currentLanguage}
            >
              <option value="en">{'\uD83C\uDDEC\uD83C\uDDE7'} EN</option>
              <option value="it">{'\uD83C\uDDEE\uD83C\uDDF9'} IT</option>
              <option value="es">{'\uD83C\uDDEA\uD83C\uDDF8'} ES</option>
              <option value="de">{'\uD83C\uDDE9\uD83C\uDDEA'} DE</option>
            </select>
          </div>
          <button className="btn nav-link" onClick={handleLogout}>
            <NavIcon name="logout" />
            {t('app.logout')}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function NavIcon({
  name
}: {
  name: 'dashboard' | 'links' | 'settings' | 'users' | 'logout' | 'language';
}) {
  const common = {
    className: 'nav-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" />
        <rect x="13" y="3" width="8" height="5" />
        <rect x="13" y="10" width="8" height="11" />
        <rect x="3" y="13" width="8" height="8" />
      </svg>
    );
  }

  if (name === 'links') {
    return (
      <svg {...common}>
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11 5" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.4l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }

  if (name === 'language') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15 15 0 0 1 0 20" />
        <path d="M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
