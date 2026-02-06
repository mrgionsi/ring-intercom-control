import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { apiFetch, initCsrf } from './api';
import Login from './pages/Login';
import Admin from './pages/Admin';
import GuestLinks from './pages/GuestLinks';
import Guest from './pages/Guest';
import AdminUsers from './pages/AdminUsers';

type User = { username: string; role: 'admin' | 'user' } | null;

export default function App() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

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
          <h1>Loading…</h1>
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
  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Ring Intercom Control</h1>
          <p>Signed in as {user.username}</p>
        </div>
        <div className="actions">
          <Link to="/" className="btn ghost">
            Dashboard
          </Link>
          <Link to="/links" className="btn ghost">
            Guest Links
          </Link>
          {user.role === 'admin' ? (
            <Link to="/admin/users" className="btn ghost">
              Users
            </Link>
          ) : null}
          <button className="btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
