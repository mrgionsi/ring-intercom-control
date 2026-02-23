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
import { Icon } from './components/Icon';

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
    await initCsrf();
    onLogout();
  };

  const setLang = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header-top">
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
          <div className="header-controls">
            <div className="lang-select">
              <span className="lang-label">
                <Icon name="language" />
                {t('app.language')}
              </span>
              <select
                className="btn ghost lang-native-select"
                onChange={(e) => setLang(e.target.value)}
                value={currentLanguage}
              >
                <option value="en">EN</option>
                <option value="it">IT</option>
                <option value="es">ES</option>
                <option value="de">DE</option>
              </select>
            </div>
            <button className="btn nav-link" onClick={handleLogout}>
              <Icon name="logout" />
              {t('app.logout')}
            </button>
          </div>
        </div>
        <div className="actions menu-links">
          <Link to="/" className="btn ghost nav-link">
            <Icon name="dashboard" />
            {t('app.dashboard')}
          </Link>
          <Link to="/links" className="btn ghost nav-link">
            <Icon name="links" />
            {t('app.guest_links')}
          </Link>
          <Link to="/settings" className="btn ghost nav-link">
            <Icon name="settings" />
            {t('app.settings')}
          </Link>
          {user.role === 'admin' ? (
            <Link to="/admin/users" className="btn ghost nav-link">
              <Icon name="users" />
              {t('app.users')}
            </Link>
          ) : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
