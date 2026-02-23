import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';

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
  const { t } = useTranslation();
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
    setMessage(t('admin.save_changes'));
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
    const confirmDelete = window.confirm(t('admin.disable_user'));
    if (!confirmDelete) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${selectedUserId}`, { method: 'DELETE' });
      setMessage(t('common.disabled'));
      setSelectedUserId(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
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
      setMessage(nextDisabled ? t('common.disabled') : t('common.active'));
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
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
      setMessage(t('admin.save_limits'));
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    const confirmReset = window.confirm(t('admin.reset_password'));
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
      setMessage(t('admin.temp_password'));
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
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
          Number.isFinite(Date.parse(e.created_at))
            ? new Date(e.created_at).toISOString()
            : e.created_at
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
      setMessage(t('admin.export_csv'));
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>{t('app.loading')}</div>
        </div>
      ) : null}
      <section className="card">
        <h2>{t('admin.create_user')}</h2>
        <div className="grid two">
          <label className="field">
            <span>{t('login.username')}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="field">
            <span>{t('admin.role')}</span>
            <div className="muted">{t('admin.default_user_role')}</div>
          </div>
          <label className="field">
            <span>{t('profile.first_name')}</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('profile.last_name')}</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('profile.structure')}</span>
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
          {loading ? t('app.loading') : t('admin.create_user')}
        </button>
        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h2>{t('admin.rate_limits')}</h2>
        <div className="grid two">
          <label className="field">
            <span>{t('admin.guest_rpm')}</span>
            <input
              type="number"
              min="1"
              value={guestLimit}
              onChange={(e) => setGuestLimit(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>{t('admin.auth_rpm')}</span>
            <input
              type="number"
              min="1"
              value={authLimit}
              onChange={(e) => setAuthLimit(Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn" onClick={handleSaveLimits} disabled={loading}>
          {loading ? t('app.loading') : t('admin.save_limits')}
        </button>
      </section>

      <section className="card">
        <h2>{t('admin.users')}</h2>
        {users.length === 0 ? (
          <p className="muted">{t('admin.no_users')}</p>
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
                      : t('common.no_name')}
                  </div>
                  {user.structure ? (
                    <div className="muted">
                      {t('profile.structure')}: {user.structure}
                    </div>
                  ) : null}
                  {user.lockoutUntil ? (
                    <div className="muted">
                      {t('admin.locked_until')}: {formatDateTime(user.lockoutUntil)}
                    </div>
                  ) : null}
                  <div className="muted">
                    {t('common.created')}: {formatDateTime(user.createdAt)}
                  </div>
                </div>
                <div className="actions">
                  <span className="badge">{user.role}</span>
                  <span className={`badge ${user.disabled ? 'danger' : 'ok'}`}>
                    {user.disabled ? t('common.disabled') : t('common.active')}
                  </span>
                  <button
                    className="btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickToggle(user);
                    }}
                    disabled={loading}
                  >
                    {user.disabled ? t('common.active') : t('common.disabled')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('admin.details')}</h2>
        {!selectedUser ? (
          <p className="muted">{t('admin.select_user')}</p>
        ) : (
          <div className="stack">
            <div className="grid two">
              <label className="field">
                <span>{t('login.username')}</span>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('admin.reset_password')}</span>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('profile.first_name')}</span>
                <input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('profile.last_name')}</span>
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('profile.structure')}</span>
                <input
                  value={editStructure}
                  onChange={(e) => setEditStructure(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('profile.account_status')}</span>
                <select
                  value={editDisabled ? 'disabled' : 'active'}
                  onChange={(e) => setEditDisabled(e.target.value === 'disabled')}
                >
                  <option value="active">{t('common.active')}</option>
                  <option value="disabled">{t('common.disabled')}</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button className="btn" onClick={handleUpdate} disabled={loading}>
                {loading ? t('app.loading') : t('admin.save_changes')}
              </button>
              <button className="btn ghost" onClick={handleDelete} disabled={loading}>
                {t('admin.disable_user')}
              </button>
              <button className="btn ghost" onClick={handleResetPassword} disabled={loading}>
                {t('admin.reset_password')}
              </button>
            </div>
            {tempPassword ? (
              <div className="tile">
                <div>
                  <strong>{t('admin.temp_password')}</strong>
                  <div className="muted">
                    {t('admin.temp_password_desc')}
                  </div>
                </div>
                <code className="badge ok">{tempPassword}</code>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('admin.devices_readonly')}</h2>
        {!selectedDevices ? (
          <p className="muted">{t('admin.select_user')}</p>
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
                            {t('intercoms.battery')}:{' '}
                            {typeof intercom.batteryPercent === 'number'
                              ? `${intercom.batteryPercent}%`
                              : 'n/a'}
                          </div>
                          {intercom.connection ? (
                            <div className="muted">
                              {t('common.status')}: {intercom.connection}
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
          <h2>{t('admin.unlock_history')}</h2>
          <button className="btn ghost" onClick={handleExportAudit} disabled={loading}>
            {t('admin.export_csv')}
          </button>
        </div>
        {!selectedUser ? (
          <p className="muted">{t('admin.select_user')}</p>
        ) : auditEvents.length === 0 ? (
          <p className="muted">{t('intercoms.health_none')}</p>
        ) : (
          <div className="stack">
            {auditEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>Intercom {event.intercom_id}</strong>
                  <div className="muted">
                    {event.source === 'guest' ? 'Guest link' : 'User'} ·{' '}
                    {formatDateTime(event.created_at)}
                  </div>
                  {event.error_message ? (
                    <div className="muted">Error: {event.error_message}</div>
                  ) : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? t('common.success') : t('common.failed')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('admin.login_attempts')}</h2>
        {loginAudit.length === 0 ? (
          <p className="muted">{t('common.no_data')}</p>
        ) : (
          <div className="stack">
            {loginAudit.slice(0, 10).map((event) => (
              <div key={event.id} className="tile">
                <div>
                  <strong>{event.username}</strong>
                  <div className="muted">
                    {formatDateTime(event.created_at)}
                  </div>
                  {event.ip ? <div className="muted">IP: {event.ip}</div> : null}
                </div>
                <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                  {event.success ? t('common.success') : t('common.failed')}
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
