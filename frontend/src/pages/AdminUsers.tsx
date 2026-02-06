import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

type UserRow = {
  id: number;
  username: string;
  createdAt: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  structure: string | null;
  disabled: number;
  lockoutUntil: string | null;
};

type DeviceSummary = {
  locationId: string;
  locationName: string;
  intercoms: Array<{
    id: string;
    name: string;
    batteryPercent?: number | null;
    batteryCategory?: string | null;
    connection?: string | null;
  }>;
};

type UserDevices = {
  userId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  structure: string | null;
  summary: DeviceSummary[] | null;
  error?: string;
};

type AuditEvent = {
  id: number;
  intercom_id: string;
  source: 'user' | 'guest';
  success: number;
  error_message: string | null;
  created_at: string;
};

type LoginAuditEvent = {
  id: number;
  username: string;
  success: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [devices, setDevices] = useState<UserDevices[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [structure, setStructure] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editStructure, setEditStructure] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loginAudit, setLoginAudit] = useState<LoginAuditEvent[]>([]);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [guestLimit, setGuestLimit] = useState(20);
  const [authLimit, setAuthLimit] = useState(120);

  const loadAll = async () => {
    setInitializing(true);
    try {
      const usersRes = await apiFetch<{ users: UserRow[] }>('/api/admin/users');
      const devicesRes = await apiFetch<{ users: UserDevices[] }>(
        '/api/admin/devices'
      );
      const limitsRes = await apiFetch<{
        guestPerMinute: number;
        authPerMinute: number;
      }>('/api/admin/limits');
      const loginAuditRes = await apiFetch<{ events: LoginAuditEvent[] }>(
        '/api/admin/login-audit'
      );
      setUsers(usersRes.users);
      setDevices(devicesRes.users);
      setGuestLimit(limitsRes.guestPerMinute);
      setAuthLimit(limitsRes.authPerMinute);
      setLoginAudit(loginAuditRes.events);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadAll().catch(() => null);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          firstName,
          lastName,
          structure
        })
      });
      setUsername('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setStructure('');
      setMessage('User created.');
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedDevices =
    devices.find((u) => u.userId === selectedUserId) ?? null;

  const selectUser = (user: UserRow) => {
    setSelectedUserId(user.id);
    setEditUsername(user.username);
    setEditPassword('');
    setEditFirstName(user.firstName ?? '');
    setEditLastName(user.lastName ?? '');
    setEditStructure(user.structure ?? '');
    setEditDisabled(Boolean(user.disabled));
    setTempPassword(null);
    apiFetch<{ events: AuditEvent[] }>(`/api/admin/audit?userId=${user.id}`)
      .then((data) => setAuditEvents(data.events))
      .catch(() => setAuditEvents([]));
  };

  const handleUpdate = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${selectedUserId}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: editUsername,
          password: editPassword || undefined,
          firstName: editFirstName,
          lastName: editLastName,
          structure: editStructure,
          disabled: editDisabled ? 1 : 0
        })
      });
      setMessage('User updated.');
      setEditPassword('');
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;
    const confirmDelete = window.confirm(
      'Disable this user account? (You can re-enable later)'
    );
    if (!confirmDelete) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${selectedUserId}`, { method: 'DELETE' });
      setMessage('User disabled.');
      setSelectedUserId(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? 'Failed to disable user');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (user: UserRow) => {
    const nextDisabled = user.disabled ? 0 : 1;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ disabled: nextDisabled })
      });
      setMessage(nextDisabled ? 'User disabled.' : 'User enabled.');
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/admin/limits', {
        method: 'POST',
        body: JSON.stringify({
          guestPerMinute: Number(guestLimit),
          authPerMinute: Number(authLimit)
        })
      });
      setMessage('Rate limits updated.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to update limits');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    const confirmReset = window.confirm(
      'Reset password and generate a temporary one for this user?'
    );
    if (!confirmReset) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ tempPassword: string }>(
        `/api/admin/users/${selectedUserId}/reset-password`,
        { method: 'POST' }
      );
      setTempPassword(result.tempPassword);
      setMessage('Temporary password generated.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAudit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ events: AuditEvent[] }>(
        selectedUserId
          ? `/api/admin/audit?userId=${selectedUserId}`
          : '/api/admin/audit'
      );
      const csv = [
        ['id', 'intercom_id', 'source', 'success', 'error_message', 'created_at'],
        ...res.events.map((e) => [
          e.id,
          e.intercom_id,
          e.source,
          e.success,
          e.error_message ?? '',
          e.created_at
        ])
      ]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedUserId
        ? `audit-user-${selectedUserId}.csv`
        : 'audit-all.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Audit CSV exported.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to export audit log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>Loading admin data…</div>
        </div>
      ) : null}
      <section className="card">
        <h2>Create User</h2>
        <div className="grid two">
          <label className="field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span>First Name</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Last Name</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Structure</span>
            <input
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
            />
          </label>
        </div>
        <button
          className="btn"
          onClick={handleCreate}
          disabled={loading || !username || !password}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h2>Rate Limits</h2>
        <div className="grid two">
          <label className="field">
            <span>Guest Requests / Minute</span>
            <input
              type="number"
              min="1"
              value={guestLimit}
              onChange={(e) => setGuestLimit(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Authenticated Requests / Minute</span>
            <input
              type="number"
              min="1"
              value={authLimit}
              onChange={(e) => setAuthLimit(Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn" onClick={handleSaveLimits} disabled={loading}>
          {loading ? 'Saving...' : 'Save Limits'}
        </button>
      </section>

      <section className="card">
        <h2>Users</h2>
        {users.length === 0 ? (
          <p className="muted">No users yet.</p>
        ) : (
          <div className="stack">
            {users.map((user) => (
              <div
                key={user.id}
                className={`tile selectable ${
                  selectedUserId === user.id ? 'selected' : ''
                }`}
                onClick={() => selectUser(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    selectUser(user);
                  }
                }}
              >
                <div>
                  <strong>{user.username}</strong>
                  <div className="muted">
                    {user.firstName || user.lastName
                      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                      : 'No name'}
                  </div>
                  {user.structure ? (
                    <div className="muted">Structure: {user.structure}</div>
                  ) : null}
                  {user.lockoutUntil ? (
                    <div className="muted">
                      Locked until: {new Date(user.lockoutUntil).toLocaleString()}
                    </div>
                  ) : null}
                  <div className="muted">
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="actions">
                  <span className="badge">{user.role}</span>
                  <span className={`badge ${user.disabled ? 'danger' : 'ok'}`}>
                    {user.disabled ? 'disabled' : 'active'}
                  </span>
                  <button
                    className="btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickToggle(user);
                    }}
                    disabled={loading}
                  >
                    {user.disabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>User Details</h2>
        {!selectedUser ? (
          <p className="muted">Select a user to view details.</p>
        ) : (
          <div className="stack">
            <div className="grid two">
              <label className="field">
                <span>Username</span>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </label>
              <label className="field">
                <span>New Password (optional)</span>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </label>
              <label className="field">
                <span>First Name</span>
                <input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Last Name</span>
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Structure</span>
                <input
                  value={editStructure}
                  onChange={(e) => setEditStructure(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Account Status</span>
                <select
                  value={editDisabled ? 'disabled' : 'active'}
                  onChange={(e) => setEditDisabled(e.target.value === 'disabled')}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button className="btn" onClick={handleUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn ghost" onClick={handleDelete} disabled={loading}>
                Disable User
              </button>
              <button className="btn ghost" onClick={handleResetPassword} disabled={loading}>
                Reset Password
              </button>
            </div>
            {tempPassword ? (
              <div className="tile">
                <div>
                  <strong>Temporary Password</strong>
                  <div className="muted">
                    Share this with the user and ask them to change it after login.
                  </div>
                </div>
                <code className="badge ok">{tempPassword}</code>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Devices (Read Only)</h2>
        {!selectedDevices ? (
          <p className="muted">Select a user to view devices.</p>
        ) : selectedDevices.error ? (
          <p className="muted">{selectedDevices.error}</p>
        ) : selectedDevices.summary && selectedDevices.summary.length > 0 ? (
          <div className="stack">
            {selectedDevices.summary.map((location) => (
              <div key={location.locationId} className="stack">
                <h3>{location.locationName}</h3>
                {location.intercoms.length === 0 ? (
                  <p className="muted">No intercoms detected.</p>
                ) : (
                  <div className="grid">
                    {location.intercoms.map((intercom) => (
                      <div key={intercom.id} className="tile">
                        <div>
                          <strong>{intercom.name}</strong>
                          <div className="muted">
                            Battery:{' '}
                            {typeof intercom.batteryPercent === 'number'
                              ? `${intercom.batteryPercent}%`
                              : 'n/a'}
                          </div>
                          {intercom.connection ? (
                            <div className="muted">
                              Status: {intercom.connection}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No devices loaded.</p>
        )}
      </section>

      <section className="card">
        <div className="actions">
          <h2>Unlock History</h2>
          <button className="btn ghost" onClick={handleExportAudit} disabled={loading}>
            Export CSV
          </button>
        </div>
        {!selectedUser ? (
          <p className="muted">Select a user to view unlock history.</p>
        ) : auditEvents.length === 0 ? (
          <p className="muted">No unlock activity yet.</p>
        ) : (
          <div className="stack">
            {auditEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>Intercom {event.intercom_id}</strong>
                  <div className="muted">
                    {event.source === 'guest' ? 'Guest link' : 'User'} ·{' '}
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                  {event.error_message ? (
                    <div className="muted">Error: {event.error_message}</div>
                  ) : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? 'success' : 'failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Login Attempts</h2>
        {loginAudit.length === 0 ? (
          <p className="muted">No login attempts yet.</p>
        ) : (
          <div className="stack">
            {loginAudit.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>{event.username}</strong>
                  <div className="muted">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                  {event.ip ? <div className="muted">IP: {event.ip}</div> : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? 'success' : 'failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
