import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { apiFetch, initCsrf } from './api';
import Login from './pages/Login';
import Admin from './pages/Admin';
import GuestLinks from './pages/GuestLinks';
import Guest from './pages/Guest';
import AdminUsers from './pages/AdminUsers';
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
          <h1>{t('app.title')}</h1>
          <p>{t('app.signed_in_as', { username: user.username })}</p>
        </div>
        <div className="actions">
          <Link to="/" className="btn ghost">
            {t('app.dashboard')}
          </Link>
          <Link to="/links" className="btn ghost">
            {t('app.guest_links')}
          </Link>
          {user.role === 'admin' ? (
            <Link to="/admin/users" className="btn ghost">
              {t('app.users')}
            </Link>
          ) : null}
          <div className="lang-select">
            <span className="lang-label">{t('app.language')}</span>
            <select
              className="btn ghost"
              onChange={(e) => setLang(e.target.value)}
              value={i18n.language}
            >
              <option value="en">EN</option>
              <option value="it">IT</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
            </select>
          </div>
          <button className="btn" onClick={handleLogout}>
            {t('app.logout')}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
