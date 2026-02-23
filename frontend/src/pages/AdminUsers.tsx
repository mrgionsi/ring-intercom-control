import { useEffect, useMemo, useState } from 'react';
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

type AuditResponse = {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
};

const UNLOCK_HISTORY_PAGE_SIZE = 10;

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [devices, setDevices] = useState<UserDevices[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [loginAudit, setLoginAudit] = useState<LoginAuditEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loginRowsPerPage, setLoginRowsPerPage] = useState(20);
  const [loginPage, setLoginPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersSortKey, setUsersSortKey] = useState<'id' | 'username' | 'role' | 'structure' | 'status' | 'createdAt'>('id');
  const [usersSortDir, setUsersSortDir] = useState<'asc' | 'desc'>('asc');
  const [guestLimit, setGuestLimit] = useState(20);
  const [authLimit, setAuthLimit] = useState(120);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [createRole, setCreateRole] = useState<'user' | 'admin'>('user');
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
      const [usersRes, limitsRes, loginAuditRes] = await Promise.all([
        apiFetch<{ users: UserRow[] }>('/api/admin/users'),
        apiFetch<{ guestPerMinute: number; authPerMinute: number }>('/api/admin/limits'),
        apiFetch<{ events: LoginAuditEvent[] }>('/api/admin/login-audit')
      ]);
      setUsers(usersRes.users);
      setGuestLimit(limitsRes.guestPerMinute);
      setAuthLimit(limitsRes.authPerMinute);
      setLoginAudit(loginAuditRes.events);
    } finally {
      setInitializing(false);
    }
    loadDevices().catch(() => null);
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const devicesRes = await apiFetch<{ users: UserDevices[] }>('/api/admin/devices');
      setDevices(devicesRes.users);
    } finally {
      setDevicesLoading(false);
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedDevices = devices.find((u) => u.userId === selectedUserId) ?? null;
  const intercomNameById = new Map(
    (selectedDevices?.summary ?? []).flatMap((location) =>
      location.intercoms.map((intercom) => [intercom.id, intercom.name] as const)
    )
  );

  const openCreateModal = () => {
    setUsername('');
    setPassword('');
    setCreateRole('user');
    setFirstName('');
    setLastName('');
    setStructure('');
    setCreateOpen(true);
  };

  const openDetailsModal = (user: UserRow) => {
    setSelectedUserId(user.id);
    setAuditPage(1);
    setAuditEvents([]);
    setAuditTotal(0);
    setEditUsername(user.username);
    setEditPassword('');
    setEditFirstName(user.firstName ?? '');
    setEditLastName(user.lastName ?? '');
    setEditStructure(user.structure ?? '');
    setEditDisabled(Boolean(user.disabled));
    setDetailsOpen(true);
  };

  useEffect(() => {
    if (!detailsOpen || !selectedUserId) return;
    const loadAudit = async () => {
      setAuditLoading(true);
      try {
        const data = await apiFetch<AuditResponse>(
          `/api/admin/audit?userId=${selectedUserId}&page=${auditPage}&pageSize=${UNLOCK_HISTORY_PAGE_SIZE}`
        );
        setAuditEvents(data.events ?? []);
        setAuditTotal(data.total ?? 0);
      } catch {
        setAuditEvents([]);
        setAuditTotal(0);
      } finally {
        setAuditLoading(false);
      }
    };
    loadAudit().catch(() => null);
  }, [auditPage, detailsOpen, selectedUserId]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role: createRole,
          firstName,
          lastName,
          structure
        })
      });
      setCreateOpen(false);
      setToast({ type: 'success', text: t('admin.create_user_success') });
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'error', text: err.message ?? t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUserId) return;
    setLoading(true);
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
      setToast({ type: 'success', text: t('admin.save_changes_success') });
      setDetailsOpen(false);
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'error', text: err.message ?? t('common.error') });
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
    try {
      await apiFetch(`/api/admin/users/${userId}/permanent`, { method: 'DELETE' });
      if (closeDetailsModal) {
        setDetailsOpen(false);
      }
      setToast({ type: 'success', text: t('admin.delete_user_success') });
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'error', text: err.message ?? t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (user: UserRow) => {
    const nextDisabled = user.disabled ? 0 : 1;
    setLoading(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ disabled: nextDisabled })
      });
      setToast({
        type: 'success',
        text: nextDisabled ? t('admin.user_disabled_success') : t('admin.user_enabled_success')
      });
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'error', text: err.message ?? t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/admin/limits', {
        method: 'POST',
        body: JSON.stringify({ guestPerMinute: Number(guestLimit), authPerMinute: Number(authLimit) })
      });
      setToast({ type: 'success', text: t('admin.save_limits_success') });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message ?? t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const totalAuditPages = Math.max(1, Math.ceil(auditTotal / UNLOCK_HISTORY_PAGE_SIZE));
  const totalLoginPages = Math.max(1, Math.ceil(loginAudit.length / loginRowsPerPage));
  const loginStart = (loginPage - 1) * loginRowsPerPage;
  const pagedLoginAudit = loginAudit.slice(loginStart, loginStart + loginRowsPerPage);
  const filteredAndSortedUsers = useMemo(() => {
    const q = usersSearch.trim().toLowerCase();
    const filtered = !q
      ? users
      : users.filter((u) =>
          [
            String(u.id),
            u.username,
            u.role,
            u.structure ?? '',
            u.firstName ?? '',
            u.lastName ?? ''
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        );

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (usersSortKey === 'id') cmp = a.id - b.id;
      if (usersSortKey === 'username') cmp = a.username.localeCompare(b.username);
      if (usersSortKey === 'role') cmp = a.role.localeCompare(b.role);
      if (usersSortKey === 'structure') cmp = (a.structure ?? '').localeCompare(b.structure ?? '');
      if (usersSortKey === 'status') cmp = (a.disabled ?? 0) - (b.disabled ?? 0);
      if (usersSortKey === 'createdAt') cmp = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return usersSortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [users, usersSearch, usersSortDir, usersSortKey]);

  const handleUsersSort = (key: 'id' | 'username' | 'role' | 'structure' | 'status' | 'createdAt') => {
    if (usersSortKey === key) {
      setUsersSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setUsersSortKey(key);
    setUsersSortDir('asc');
  };

  const sortMark = (key: 'id' | 'username' | 'role' | 'structure' | 'status' | 'createdAt') =>
    usersSortKey === key ? (usersSortDir === 'asc' ? '↑' : '↓') : '';

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
        <div className="links-filters">
          <label className="field links-search">
            <span>{t('guest_links.search_label')}</span>
            <input
              value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              placeholder={t('guest_links.search_placeholder')}
            />
          </label>
        </div>
        {users.length === 0 ? (
          <p className="muted">{t('admin.no_users')}</p>
        ) : (
          <div className="links-table-wrap">
            <table className="links-table">
              <thead>
                <tr>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('id')}>ID <span className="table-sort-mark">{sortMark('id')}</span></button></th>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('username')}>{t('login.username')} <span className="table-sort-mark">{sortMark('username')}</span></button></th>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('role')}>{t('admin.role')} <span className="table-sort-mark">{sortMark('role')}</span></button></th>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('structure')}>{t('profile.structure')} <span className="table-sort-mark">{sortMark('structure')}</span></button></th>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('status')}>{t('common.status')} <span className="table-sort-mark">{sortMark('status')}</span></button></th>
                  <th><button type="button" className="table-sort-btn" onClick={() => handleUsersSort('createdAt')}>{t('common.created')} <span className="table-sort-mark">{sortMark('createdAt')}</span></button></th>
                  <th>{t('guest_links.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user) => (
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
                          className={`btn btn-sm ${user.disabled ? 'success' : 'warn'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickToggle(user);
                          }}
                          disabled={loading}
                        >
                          {user.disabled
                            ? t('admin.action_enable')
                            : t('admin.action_disable')}
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
                {filteredAndSortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">{t('guest_links.no_results')}</td>
                  </tr>
                ) : null}
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
        <div className="actions settings-head-actions">
          <h2>{t('admin.login_attempts')}</h2>
          <div className="actions">
            <label className="field">
              <span>Rows</span>
              <select
                value={loginRowsPerPage}
                onChange={(e) => {
                  setLoginRowsPerPage(Number(e.target.value));
                  setLoginPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className="badge">{loginAudit.length}</span>
          </div>
        </div>
        {loginAudit.length === 0 ? (
          <p className="muted">{t('common.no_data')}</p>
        ) : (
          <div className="stack">
            <div className="links-table-wrap">
              <table className="links-table login-attempts-table">
                <thead>
                  <tr>
                    <th>{t('login.username')}</th>
                    <th>{t('common.status')}</th>
                    <th>IP</th>
                    <th>{t('common.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLoginAudit.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <div className="login-attempt-user">
                          <Icon name="account" />
                          <span>{event.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                          {capitalize(event.success ? t('common.success') : t('common.failed'))}
                        </span>
                      </td>
                      <td className="muted">{event.ip || '-'}</td>
                      <td>{formatDateTime(event.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="links-pagination">
              <button
                type="button"
                className="btn ghost"
                disabled={loginPage <= 1}
                onClick={() => setLoginPage((prev) => Math.max(1, prev - 1))}
              >
                {t('guest_links.prev')}
              </button>
              <span className="muted">{`${loginPage} / ${totalLoginPages}`}</span>
              <button
                type="button"
                className="btn ghost"
                disabled={loginPage >= totalLoginPages}
                onClick={() => setLoginPage((prev) => Math.min(totalLoginPages, prev + 1))}
              >
                {t('guest_links.next')}
              </button>
            </div>
          </div>
        )}
      </section>

      {toast ? <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.text}</div> : null}

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
                <select
                  value={createRole}
                  onChange={(e) =>
                    setCreateRole((e.target.value as 'user' | 'admin') ?? 'user')
                  }
                >
                  <option value="user">{t('admin.default_user_role')}</option>
                  <option value="admin">{t('admin.admin_role')}</option>
                </select>
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
          <section className="card modal-card modal-card-fullscreen" role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={() => setDetailsOpen(false)} aria-label="Close">
              ×
            </button>
            <h2>{t('admin.details')} - {selectedUser.username}</h2>
            <div className="admin-user-modal-grid">
              <div className="stack admin-user-panel">
                <h3>{t('admin.details')}</h3>
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
                  <button type="button" className="btn danger" onClick={handlePermanentDelete} disabled={loading}>
                    {t('admin.delete_user')}
                  </button>
                  <button type="button" className="btn ghost" disabled>
                    {t('admin.reset_password')}
                  </button>
                </div>
              </div>

              <div className="stack admin-user-panel">
                <h3>{t('admin.devices_readonly')}</h3>
                {devicesLoading && !selectedDevices ? (
                  <p className="muted">{t('app.loading')}</p>
                ) : !selectedDevices ? (
                  <p className="muted">{t('admin.select_user')}</p>
                ) : selectedDevices.error ? (
                  <p className="muted">{selectedDevices.error}</p>
                ) : selectedDevices.summary && selectedDevices.summary.length > 0 ? (
                  <div className="stack admin-device-list">
                    {selectedDevices.summary.map((location) => (
                      <div key={location.locationId} className="stack admin-device-group">
                        <strong className="admin-device-location">{location.locationName}</strong>
                        {location.intercoms.length === 0 ? (
                          <p className="muted">{t('intercoms.no_intercoms')}</p>
                        ) : (
                          <div className="stack">
                            {location.intercoms.map((intercom) => (
                              <div key={intercom.id} className="tile admin-device-tile">
                                <div className="admin-device-main">
                                  <div className="admin-device-title">
                                    <Icon name="phone" />
                                    <strong>{intercom.name}</strong>
                                  </div>
                                  <div className="muted admin-device-id">ID: {intercom.id}</div>
                                </div>
                                <div className="badge">{t('intercoms.battery')}: {typeof intercom.batteryPercent === 'number' ? `${intercom.batteryPercent}%` : 'n/a'}</div>
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
                {auditLoading ? (
                  <p className="muted">{t('app.loading')}</p>
                ) : auditEvents.length === 0 ? (
                  <p className="muted">{t('common.no_data')}</p>
                ) : (
                  <div className="stack admin-audit-list">
                    {auditEvents.slice(0, 10).map((event) => (
                      <div key={event.id} className="tile admin-audit-tile">
                        <div>
                          <div className="admin-device-title">
                            <Icon name="unlock" />
                            <strong>{intercomNameById.get(event.intercom_id) ?? `Intercom ${event.intercom_id}`}</strong>
                          </div>
                          <div className="muted admin-device-id">ID: {event.intercom_id}</div>
                          <div className="muted">{formatDateTime(event.created_at)}</div>
                        </div>
                        <span className={`badge ${event.success ? 'ok' : 'danger'}`}>
                          {event.success ? t('common.success') : t('common.failed')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="links-pagination">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={auditPage <= 1 || auditLoading}
                    onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                  >
                    {t('guest_links.prev')}
                  </button>
                  <span className="muted">
                    {auditTotal === 0
                      ? '0 / 0'
                      : `${auditPage} / ${totalAuditPages} • ${auditTotal}`}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={auditPage >= totalAuditPages || auditLoading}
                    onClick={() => setAuditPage((prev) => Math.min(totalAuditPages, prev + 1))}
                  >
                    {t('guest_links.next')}
                  </button>
                </div>
              </div>
            </div>
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
