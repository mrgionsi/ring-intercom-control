import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/dateTime';
import { Icon } from '../components/Icon';

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
    connection?: string | null;
  }>;
};

type UserDevices = {
  userId: number;
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
  created_at: string;
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [devices, setDevices] = useState<UserDevices[]>([]);
  const [loginAudit, setLoginAudit] = useState<LoginAuditEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [guestLimit, setGuestLimit] = useState(20);
  const [authLimit, setAuthLimit] = useState(120);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [structure, setStructure] = useState('');

  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editStructure, setEditStructure] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);

  const loadAll = async () => {
    setInitializing(true);
    try {
      const usersRes = await apiFetch<{ users: UserRow[] }>('/api/admin/users');
      const devicesRes = await apiFetch<{ users: UserDevices[] }>('/api/admin/devices');
      const limitsRes = await apiFetch<{ guestPerMinute: number; authPerMinute: number }>('/api/admin/limits');
      const loginAuditRes = await apiFetch<{ events: LoginAuditEvent[] }>('/api/admin/login-audit');
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

  useEffect(() => {
    const open = createOpen || detailsOpen;
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (detailsOpen) setDetailsOpen(false);
        if (createOpen) setCreateOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen, detailsOpen]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedDevices = devices.find((u) => u.userId === selectedUserId) ?? null;

  const openCreateModal = () => {
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setStructure('');
    setCreateOpen(true);
  };

  const openDetailsModal = (user: UserRow) => {
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
    setDetailsOpen(true);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, firstName, lastName, structure })
      });
      setCreateOpen(false);
      setMessage(t('admin.create_user'));
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
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
      setEditPassword('');
      setMessage(t('admin.save_changes'));
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!selectedUserId) return;
    const confirmDisable = window.confirm(t('admin.disable_user'));
    if (!confirmDisable) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${selectedUserId}`, { method: 'DELETE' });
      setDetailsOpen(false);
      setMessage(t('common.disabled'));
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedUserId) return;
    await handlePermanentDeleteById(selectedUserId, true);
  };

  const handlePermanentDeleteById = async (
    userId: number,
    closeDetailsModal: boolean
  ) => {
    const confirmDelete = window.confirm(t('admin.delete_user_confirm'));
    if (!confirmDelete) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/permanent`, { method: 'DELETE' });
      if (closeDetailsModal) {
        setDetailsOpen(false);
      }
      setMessage(t('admin.delete_user'));
      await loadAll();
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
        body: JSON.stringify({ guestPerMinute: Number(guestLimit), authPerMinute: Number(authLimit) })
      });
      setMessage(t('admin.save_limits'));
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
        <div className="actions settings-head-actions">
          <h2>{t('admin.users')}</h2>
          <button type="button" className="btn nav-link" onClick={openCreateModal} disabled={loading}>
            <Icon name="users" />
            {t('admin.create_user')}
          </button>
        </div>
        {users.length === 0 ? (
          <p className="muted">{t('admin.no_users')}</p>
        ) : (
          <div className="links-table-wrap">
            <table className="links-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('login.username')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('profile.structure')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.created')}</th>
                  <th>{t('guest_links.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="admin-user-row"
                    onClick={() => openDetailsModal(user)}
                  >
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>{user.structure || '-'}</td>
                    <td>
                      <span className={`badge ${user.disabled ? 'danger' : 'ok'}`}>
                        {capitalize(user.disabled ? t('common.disabled') : t('common.active'))}
                      </span>
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="links-table-actions">
                        <button
                          type="button"
                          className={`btn btn-sm ${user.disabled ? 'success' : 'danger'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickToggle(user);
                          }}
                          disabled={loading}
                        >
                          {capitalize(user.disabled ? t('common.active') : t('common.disabled'))}
                        </button>
                        <button
                          type="button"
                          className="btn danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDeleteById(user.id, false);
                          }}
                          disabled={loading}
                        >
                          {t('admin.delete_user')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('admin.rate_limits')}</h2>
        <div className="grid two">
          <label className="field">
            <span>{t('admin.guest_rpm')}</span>
            <input type="number" min="1" value={guestLimit} onChange={(e) => setGuestLimit(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>{t('admin.auth_rpm')}</span>
            <input type="number" min="1" value={authLimit} onChange={(e) => setAuthLimit(Number(e.target.value))} />
          </label>
        </div>
        <button className="btn" onClick={handleSaveLimits} disabled={loading}>
          {loading ? t('app.loading') : t('admin.save_limits')}
        </button>
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
                  <div className="muted">{formatDateTime(event.created_at)}</div>
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

      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {createOpen ? (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
          <section className="card modal-card" role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close">
              ×
            </button>
            <h2>{t('admin.create_user')}</h2>
            <div className="grid two">
              <label className="field">
                <span>{t('login.username')}</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('login.password')}</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <div className="field">
                <span>{t('admin.role')}</span>
                <div className="muted">{t('admin.default_user_role')}</div>
              </div>
              <label className="field">
                <span>{t('profile.first_name')}</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.last_name')}</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.structure')}</span>
                <input value={structure} onChange={(e) => setStructure(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)}>
                {t('ring.cancel')}
              </button>
              <button type="button" className="btn" onClick={handleCreate} disabled={loading || !username || !password}>
                {loading ? t('app.loading') : t('admin.create_user')}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {detailsOpen && selectedUser ? (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDetailsOpen(false)}>
          <section className="card modal-card" role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={() => setDetailsOpen(false)} aria-label="Close">
              ×
            </button>
            <h2>{t('admin.details')} - {selectedUser.username}</h2>
            <div className="grid two">
              <label className="field">
                <span>{t('login.username')}</span>
                <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('admin.reset_password')}</span>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.first_name')}</span>
                <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.last_name')}</span>
                <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.structure')}</span>
                <input value={editStructure} onChange={(e) => setEditStructure(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('profile.account_status')}</span>
                <select value={editDisabled ? 'disabled' : 'active'} onChange={(e) => setEditDisabled(e.target.value === 'disabled')}>
                  <option value="active">{t('common.active')}</option>
                  <option value="disabled">{t('common.disabled')}</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={handleUpdate} disabled={loading}>
                {loading ? t('app.loading') : t('admin.save_changes')}
              </button>
              <button type="button" className="btn ghost" onClick={handleDisable} disabled={loading}>
                {t('admin.disable_user')}
              </button>
              <button type="button" className="btn danger" onClick={handlePermanentDelete} disabled={loading}>
                {t('admin.delete_user')}
              </button>
              <button type="button" className="btn ghost" onClick={handleResetPassword} disabled={loading}>
                {t('admin.reset_password')}
              </button>
            </div>

            {tempPassword ? (
              <div className="tile">
                <div>
                  <strong>{t('admin.temp_password')}</strong>
                  <div className="muted">{t('admin.temp_password_desc')}</div>
                </div>
                <code className="badge ok">{tempPassword}</code>
              </div>
            ) : null}

            <div className="divider" />
            <h3>{t('admin.devices_readonly')}</h3>
            {!selectedDevices ? (
              <p className="muted">{t('admin.select_user')}</p>
            ) : selectedDevices.error ? (
              <p className="muted">{selectedDevices.error}</p>
            ) : selectedDevices.summary && selectedDevices.summary.length > 0 ? (
              <div className="stack">
                {selectedDevices.summary.map((location) => (
                  <div key={location.locationId} className="stack">
                    <strong>{location.locationName}</strong>
                    {location.intercoms.length === 0 ? (
                      <p className="muted">{t('intercoms.no_intercoms')}</p>
                    ) : (
                      <div className="stack">
                        {location.intercoms.map((intercom) => (
                          <div key={intercom.id} className="tile">
                            <div>
                              <strong>{intercom.name}</strong>
                              <div className="muted">
                                {t('intercoms.battery')}: {typeof intercom.batteryPercent === 'number' ? `${intercom.batteryPercent}%` : 'n/a'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{t('common.no_data')}</p>
            )}

            <div className="divider" />
            <h3>{t('admin.unlock_history')}</h3>
            {auditEvents.length === 0 ? (
              <p className="muted">{t('common.no_data')}</p>
            ) : (
              <div className="stack">
                {auditEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="tile">
                    <div>
                      <strong>Intercom {event.intercom_id}</strong>
                      <div className="muted">{formatDateTime(event.created_at)}</div>
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
      ) : null}
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}
