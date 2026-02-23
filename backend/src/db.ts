import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from './config.js';

export type GuestLink = {
  id: number;
  token: string;
  label: string | null;
  ringAccountId: number;
  intercomId: string;
  userId: number;
  startsAt: string;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  disabled: number;
  createdAt: string;
};

export type UnlockEvent = {
  id: number;
  user_id: number;
  intercom_id: string;
  source: 'user' | 'guest';
  guest_link_id: number | null;
  success: number;
  error_message: string | null;
  created_at: string;
};

export type LoginAttempt = {
  username: string;
  failed_count: number;
  locked_until: string | null;
  last_failed_at: string | null;
};

export type LoginAudit = {
  id: number;
  username: string;
  success: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type DeviceHealthSample = {
  id: number;
  user_id: number;
  intercom_id: string;
  battery_percent: number | null;
  rssi: number | null;
  ota_status: string | null;
  created_at: string;
};

export type GuestLinkTemplate = {
  id: number;
  user_id: number;
  name: string;
  duration_hours: number;
  max_uses: number | null;
  created_at: string;
};

export type RingAccount = {
  id: number;
  user_id: number;
  label: string;
  refresh_token: string | null;
  is_default: number;
  disabled: number;
  created_at: string;
  updated_at: string;
};
export type User = {
  id: number;
  username: string;
  password_hash: string;
  role: 'user' | 'admin';
  first_name?: string | null;
  last_name?: string | null;
  structure?: string | null;
  disabled?: number | null;
  created_at: string;
};

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDb(): Promise<void> {
  db = await open({
    filename: config.DB_PATH,
    driver: sqlite3.Database
  });

  await getDb().exec('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      first_name TEXT,
      last_name TEXT,
      structure TEXT,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tokens (
      user_id INTEGER PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ring_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      refresh_token TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guest_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      ring_account_id INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      intercom_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      max_uses INTEGER,
      uses INTEGER NOT NULL DEFAULT 0,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(ring_account_id) REFERENCES ring_accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS unlock_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      intercom_id TEXT NOT NULL,
      source TEXT NOT NULL,
      guest_link_id INTEGER,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(guest_link_id) REFERENCES guest_links(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      username TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_failed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS login_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      success INTEGER NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guest_link_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration_hours INTEGER NOT NULL,
      max_uses INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS device_health_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      intercom_id TEXT NOT NULL,
      battery_percent INTEGER,
      rssi INTEGER,
      ota_status TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await ensureUsersProfileColumns();
  await ensureUsersDisabledColumn();
  await ensureRingAccountsTable();
  await migrateUserTokensToRingAccounts();
  await ensureGuestLinksUserIdColumn();
  await ensureGuestLinksRingAccountIdColumn();
  await ensureGuestLinksStartsAtColumn();
  await ensureUnlockEventsTable();
  await ensureLoginAttemptsTable();
  await ensureGuestLinkTemplatesTable();
  await ensureDeviceHealthHistoryTable();
  await ensureLoginAuditTable();
}

function getDb(): Database<sqlite3.Database, sqlite3.Statement> {
  if (!db) {
    throw new Error('DB not initialized');
  }
  return db;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await getDb().get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    key,
    value,
    now
  );
}

export async function createGuestLink(input: {
  token: string;
  userId: number;
  ringAccountId: number;
  label?: string;
  intercomId: string;
  startsAt: string;
  expiresAt: string;
  maxUses?: number | null;
}): Promise<GuestLink> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO guest_links
        (token, user_id, ring_account_id, label, intercom_id, starts_at, expires_at, max_uses, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    input.token,
    input.userId,
    input.ringAccountId,
    input.label ?? null,
    input.intercomId,
    input.startsAt,
    input.expiresAt,
    input.maxUses ?? null,
    now
  );

  const row = await getDb().get<GuestLink>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      WHERE token = ?
    `,
    input.token
  );
  return mapGuestLink(row!);
}

export async function listGuestLinks(): Promise<GuestLink[]> {
  const rows = await getDb().all<GuestLink[]>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      ORDER BY created_at DESC
    `
  );
  return rows.map(mapGuestLink);
}

export async function listGuestLinksForUser(
  userId: number
): Promise<GuestLink[]> {
  const rows = await getDb().all<GuestLink[]>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    userId
  );
  return rows.map(mapGuestLink);
}

export async function getGuestLinkByToken(
  token: string
): Promise<GuestLink | null> {
  const row = await getDb().get<GuestLink>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      WHERE token = ?
    `,
    token
  );
  return row ? mapGuestLink(row) : null;
}

export async function incrementGuestLinkUses(id: number): Promise<void> {
  await getDb().run(
    'UPDATE guest_links SET uses = uses + 1 WHERE id = ?',
    id
  );
}

export async function disableGuestLink(
  id: number,
  userId: number
): Promise<void> {
  await getDb().run(
    'UPDATE guest_links SET disabled = 1 WHERE id = ? AND user_id = ?',
    id,
    userId
  );
}

export async function getGuestLinkByIdForUser(
  id: number,
  userId: number
): Promise<GuestLink | null> {
  const row = await getDb().get<GuestLink>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      WHERE id = ? AND user_id = ?
    `,
    id,
    userId
  );
  return row ? mapGuestLink(row) : null;
}

export async function updateGuestLinkExpiresAt(
  id: number,
  userId: number,
  expiresAtIso: string
): Promise<GuestLink | null> {
  await getDb().run(
    'UPDATE guest_links SET expires_at = ? WHERE id = ? AND user_id = ?',
    expiresAtIso,
    id,
    userId
  );
  const updated = await getDb().get<GuestLink>(
    `
      SELECT
        id,
        token,
        label,
        ring_account_id AS ringAccountId,
        intercom_id AS intercomId,
        user_id AS userId,
        starts_at AS startsAt,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        uses,
        disabled,
        created_at AS createdAt
      FROM guest_links
      WHERE id = ? AND user_id = ?
    `,
    id,
    userId
  );
  return updated ? mapGuestLink(updated) : null;
}

export async function hasActiveGuestLinkWithLabel(
  userId: number,
  label: string,
  nowIso: string,
  ringAccountId?: number
): Promise<boolean> {
  const accountFilter =
    typeof ringAccountId === 'number' ? 'AND ring_account_id = ?' : '';
  const args: Array<number | string> = [userId, label, nowIso];
  if (typeof ringAccountId === 'number') {
    args.push(ringAccountId);
  }
  const row = await getDb().get<{ count: number }>(
    `
      SELECT COUNT(1) as count
      FROM guest_links
      WHERE user_id = ?
        AND disabled = 0
        AND label = ?
        AND expires_at > ?
        ${accountFilter}
        AND (max_uses IS NULL OR uses < max_uses)
    `,
    ...args
  );
  return (row?.count ?? 0) > 0;
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role?: 'user' | 'admin';
  firstName?: string | null;
  lastName?: string | null;
  structure?: string | null;
}): Promise<User> {
  const now = new Date().toISOString();
  const role = input.role === 'admin' ? 'admin' : 'user';
  await getDb().run(
    `
      INSERT INTO users (username, password_hash, role, first_name, last_name, structure, disabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `,
    input.username,
    input.passwordHash,
    role,
    input.firstName ?? null,
    input.lastName ?? null,
    input.structure ?? null,
    now
  );
  const row = await getDb().get<User>(
    'SELECT * FROM users WHERE username = ?',
    input.username
  );
  return row!;
}

export async function createAdminUserIfMissing(
  username: string
): Promise<User> {
  const existing = await getUserByUsername(username);
  if (existing) {
    if (existing.role !== 'admin') {
      await getDb().run(
        'UPDATE users SET role = ? WHERE id = ?',
        'admin',
        existing.id
      );
    }
    return { ...existing, role: 'admin' };
  }

  const now = new Date().toISOString();
  const placeholderHash = 'ADMIN_EXTERNAL_AUTH';
  await getDb().run(
    `
      INSERT INTO users (username, password_hash, role, created_at)
      VALUES (?, ?, 'admin', ?)
    `,
    username,
    placeholderHash,
    now
  );
  const row = await getDb().get<User>(
    'SELECT * FROM users WHERE username = ?',
    username
  );
  return row!;
}

export async function listUsers(): Promise<User[]> {
  const rows = await getDb().all<User[]>(
    'SELECT * FROM users ORDER BY created_at DESC'
  );
  return rows;
}

export async function getUserByUsername(
  username: string
): Promise<User | null> {
  const row = await getDb().get<User>(
    'SELECT * FROM users WHERE username = ?',
    username
  );
  return row ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const row = await getDb().get<User>('SELECT * FROM users WHERE id = ?', id);
  return row ?? null;
}

export async function updateUser(
  id: number,
  input: {
    username?: string;
    passwordHash?: string;
    firstName?: string | null;
    lastName?: string | null;
    structure?: string | null;
    disabled?: number | null;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.username) {
    fields.push('username = ?');
    values.push(input.username);
  }
  if (input.passwordHash) {
    fields.push('password_hash = ?');
    values.push(input.passwordHash);
  }
  if (input.firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(input.firstName);
  }
  if (input.lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(input.lastName);
  }
  if (input.structure !== undefined) {
    fields.push('structure = ?');
    values.push(input.structure);
  }
  if (input.disabled !== undefined) {
    fields.push('disabled = ?');
    values.push(input.disabled);
  }

  if (fields.length === 0) {
    return;
  }
  values.push(id);
  await getDb().run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function deleteUser(id: number): Promise<void> {
  await updateUser(id, { disabled: 1 });
}

export async function createRingAccount(
  userId: number,
  label: string
): Promise<RingAccount> {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error('Invalid userId for ring account');
  }
  const now = new Date().toISOString();
  const existingCount = await getDb().get<{ count: number }>(
    'SELECT COUNT(1) as count FROM ring_accounts WHERE user_id = ? AND disabled = 0',
    userId
  );
  const isDefault = (existingCount?.count ?? 0) === 0 ? 1 : 0;
  await getDb().run(
    `
      INSERT INTO ring_accounts (user_id, label, is_default, disabled, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `,
    userId,
    label,
    isDefault,
    now,
    now
  );
  const row = await getDb().get<RingAccount>(
    'SELECT * FROM ring_accounts WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    userId
  );
  return row!;
}

export async function listRingAccountsForUser(userId: number): Promise<RingAccount[]> {
  return await getDb().all<RingAccount[]>(
    'SELECT * FROM ring_accounts WHERE user_id = ? AND disabled = 0 ORDER BY id ASC',
    userId
  );
}

export async function getRingAccountByIdForUser(
  userId: number,
  ringAccountId: number
): Promise<RingAccount | null> {
  const row = await getDb().get<RingAccount>(
    'SELECT * FROM ring_accounts WHERE id = ? AND user_id = ? AND disabled = 0',
    ringAccountId,
    userId
  );
  return row ?? null;
}

export async function getDefaultRingAccountForUser(
  userId: number
): Promise<RingAccount | null> {
  const row = await getDb().get<RingAccount>(
    `SELECT * FROM ring_accounts
     WHERE user_id = ? AND disabled = 0
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    userId
  );
  return row ?? null;
}

export async function setRingAccountDefault(
  userId: number,
  ringAccountId: number
): Promise<void> {
  await getDb().run(
    'UPDATE ring_accounts SET is_default = 0, updated_at = ? WHERE user_id = ?',
    new Date().toISOString(),
    userId
  );
  await getDb().run(
    'UPDATE ring_accounts SET is_default = 1, updated_at = ? WHERE id = ? AND user_id = ?',
    new Date().toISOString(),
    ringAccountId,
    userId
  );
}

export async function updateRingAccountLabel(
  userId: number,
  ringAccountId: number,
  label: string
): Promise<void> {
  await getDb().run(
    'UPDATE ring_accounts SET label = ?, updated_at = ? WHERE id = ? AND user_id = ? AND disabled = 0',
    label,
    new Date().toISOString(),
    ringAccountId,
    userId
  );
}

export async function disableRingAccount(
  userId: number,
  ringAccountId: number
): Promise<void> {
  await getDb().run(
    'UPDATE ring_accounts SET disabled = 1, is_default = 0, updated_at = ? WHERE id = ? AND user_id = ?',
    new Date().toISOString(),
    ringAccountId,
    userId
  );
  const hasDefault = await getDb().get<{ count: number }>(
    'SELECT COUNT(1) as count FROM ring_accounts WHERE user_id = ? AND disabled = 0 AND is_default = 1',
    userId
  );
  if ((hasDefault?.count ?? 0) === 0) {
    const next = await getDefaultRingAccountForUser(userId);
    if (next) {
      await setRingAccountDefault(userId, next.id);
    }
  }
}

export async function deleteRingAccountPermanently(
  userId: number,
  ringAccountId: number
): Promise<void> {
  const existing = await getDb().get<{ is_default: number }>(
    'SELECT is_default FROM ring_accounts WHERE id = ? AND user_id = ? AND disabled = 0',
    ringAccountId,
    userId
  );
  if (!existing) {
    return;
  }

  await getDb().run(
    'DELETE FROM ring_accounts WHERE id = ? AND user_id = ?',
    ringAccountId,
    userId
  );

  if (existing.is_default) {
    const next = await getDefaultRingAccountForUser(userId);
    if (next) {
      await setRingAccountDefault(userId, next.id);
    }
  }
}

export async function setRingAccountToken(
  userId: number,
  ringAccountId: number,
  encryptedRefreshToken: string
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      UPDATE ring_accounts
      SET refresh_token = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ? AND disabled = 0
    `,
    encryptedRefreshToken,
    now,
    ringAccountId,
    userId
  );
}

export async function setUserToken(
  userId: number,
  encryptedRefreshToken: string
): Promise<void> {
  const defaultAccount = await getDefaultRingAccountForUser(userId);
  if (!defaultAccount) {
    const account = await createRingAccount(userId, 'Primary Ring Account');
    await setRingAccountToken(userId, account.id, encryptedRefreshToken);
    return;
  }
  await setRingAccountToken(userId, defaultAccount.id, encryptedRefreshToken);
}

export async function getRingAccountToken(
  userId: number,
  ringAccountId: number
): Promise<string | null> {
  const row = await getDb().get<{ refresh_token: string | null }>(
    'SELECT refresh_token FROM ring_accounts WHERE id = ? AND user_id = ? AND disabled = 0',
    ringAccountId,
    userId
  );
  return row?.refresh_token ?? null;
}

export async function getUserToken(userId: number): Promise<string | null> {
  const row = await getDb().get<{ refresh_token: string }>(
    `SELECT refresh_token
     FROM ring_accounts
     WHERE user_id = ? AND disabled = 0 AND refresh_token IS NOT NULL
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    userId
  );
  if (row?.refresh_token) {
    return row.refresh_token;
  }
  const legacy = await getDb().get<{ refresh_token: string }>(
    'SELECT refresh_token FROM user_tokens WHERE user_id = ?',
    userId
  );
  return legacy?.refresh_token ?? null;
}

export async function getUserTokenStatus(
  userId: number
): Promise<{ configured: boolean; updatedAt: string | null }> {
  const row = await getDb().get<{ updated_at: string }>(
    `SELECT updated_at
     FROM ring_accounts
     WHERE user_id = ? AND disabled = 0 AND refresh_token IS NOT NULL
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    userId
  );
  if (row) {
    return { configured: true, updatedAt: row.updated_at };
  }
  const legacy = await getDb().get<{ updated_at: string }>(
    'SELECT updated_at FROM user_tokens WHERE user_id = ?',
    userId
  );
  return { configured: Boolean(legacy), updatedAt: legacy?.updated_at ?? null };
}

export async function listUsersWithTokens(): Promise<
  Array<{
    id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    structure: string | null;
    refresh_token: string | null;
  }>
> {
  const rows = await getDb().all<
    Array<{
      id: number;
      username: string;
      first_name: string | null;
      last_name: string | null;
      structure: string | null;
      refresh_token: string | null;
    }>
  >(
    `
      SELECT users.id, users.username, users.first_name, users.last_name, users.structure,
             (
               SELECT ra.refresh_token
               FROM ring_accounts ra
               WHERE ra.user_id = users.id AND ra.disabled = 0
               ORDER BY ra.is_default DESC, ra.id ASC
               LIMIT 1
             ) AS refresh_token
      FROM users
      ORDER BY users.created_at DESC
    `
  );
  return rows;
}

export async function setLegacyUserToken(
  userId: number,
  encryptedRefreshToken: string
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO user_tokens (user_id, refresh_token, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        refresh_token = excluded.refresh_token,
        updated_at = excluded.updated_at
    `,
    userId,
    encryptedRefreshToken,
    now
  );
}

export async function recordUnlockEvent(input: {
  userId: number;
  intercomId: string;
  source: 'user' | 'guest';
  guestLinkId?: number | null;
  success: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO unlock_events
        (user_id, intercom_id, source, guest_link_id, success, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    input.userId,
    input.intercomId,
    input.source,
    input.guestLinkId ?? null,
    input.success ? 1 : 0,
    input.errorMessage ?? null,
    now
  );
}

export async function listUnlockEventsForUser(
  userId: number,
  limit = 50
): Promise<UnlockEvent[]> {
  const rows = await getDb().all<UnlockEvent[]>(
    `
      SELECT * FROM unlock_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    userId,
    limit
  );
  return rows;
}

export async function listUnlockEventsAll(
  limit = 200
): Promise<UnlockEvent[]> {
  const rows = await getDb().all<UnlockEvent[]>(
    `
      SELECT * FROM unlock_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit
  );
  return rows;
}

export async function getLoginAttempt(
  username: string
): Promise<LoginAttempt | null> {
  const row = await getDb().get<LoginAttempt>(
    'SELECT * FROM login_attempts WHERE username = ?',
    username
  );
  return row ?? null;
}

export async function listLoginAttempts(): Promise<LoginAttempt[]> {
  const rows = await getDb().all<LoginAttempt[]>(
    'SELECT * FROM login_attempts ORDER BY last_failed_at DESC'
  );
  return rows;
}

export async function recordLoginAudit(input: {
  username: string;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO login_audit
        (username, success, ip, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    input.username,
    input.success ? 1 : 0,
    input.ip ?? null,
    input.userAgent ?? null,
    now
  );
}

export async function listLoginAudit(limit = 200): Promise<LoginAudit[]> {
  const rows = await getDb().all<LoginAudit[]>(
    `
      SELECT * FROM login_audit
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit
  );
  return rows;
}

export async function recordLoginFailure(
  username: string,
  failedCount: number,
  lockedUntil: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO login_attempts (username, failed_count, locked_until, last_failed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        failed_count = excluded.failed_count,
        locked_until = excluded.locked_until,
        last_failed_at = excluded.last_failed_at
    `,
    username,
    failedCount,
    lockedUntil,
    now
  );
}

export async function clearLoginFailures(username: string): Promise<void> {
  await getDb().run(
    `
      UPDATE login_attempts
      SET failed_count = 0, locked_until = NULL, last_failed_at = NULL
      WHERE username = ?
    `,
    username
  );
}

export async function createGuestLinkTemplate(input: {
  userId: number;
  name: string;
  durationHours: number;
  maxUses?: number | null;
}): Promise<GuestLinkTemplate> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO guest_link_templates
        (user_id, name, duration_hours, max_uses, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    input.userId,
    input.name,
    input.durationHours,
    input.maxUses ?? null,
    now
  );
  const row = await getDb().get<GuestLinkTemplate>(
    'SELECT * FROM guest_link_templates WHERE user_id = ? AND name = ? ORDER BY id DESC LIMIT 1',
    input.userId,
    input.name
  );
  return row!;
}

export async function listGuestLinkTemplatesForUser(
  userId: number
): Promise<GuestLinkTemplate[]> {
  const rows = await getDb().all<GuestLinkTemplate[]>(
    'SELECT * FROM guest_link_templates WHERE user_id = ? ORDER BY created_at DESC',
    userId
  );
  return rows;
}

export async function deleteGuestLinkTemplate(
  id: number,
  userId: number
): Promise<void> {
  await getDb().run(
    'DELETE FROM guest_link_templates WHERE id = ? AND user_id = ?',
    id,
    userId
  );
}

export async function recordDeviceHealthSample(input: {
  userId: number;
  intercomId: string;
  batteryPercent?: number | null;
  rssi?: number | null;
  otaStatus?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    `
      INSERT INTO device_health_history
        (user_id, intercom_id, battery_percent, rssi, ota_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    input.userId,
    input.intercomId,
    input.batteryPercent ?? null,
    input.rssi ?? null,
    input.otaStatus ?? null,
    now
  );
}

export async function getLastDeviceHealthSample(
  userId: number,
  intercomId: string
): Promise<DeviceHealthSample | null> {
  const row = await getDb().get<DeviceHealthSample>(
    `
      SELECT * FROM device_health_history
      WHERE user_id = ? AND intercom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    userId,
    intercomId
  );
  return row ?? null;
}

export async function listDeviceHealthHistory(
  userId: number,
  intercomId: string,
  limit = 20
): Promise<DeviceHealthSample[]> {
  const rows = await getDb().all<DeviceHealthSample[]>(
    `
      SELECT * FROM device_health_history
      WHERE user_id = ? AND intercom_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    userId,
    intercomId,
    limit
  );
  return rows;
}

function mapGuestLink(row: GuestLink): GuestLink {
  return row;
}

async function ensureRingAccountsTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ring_accounts'"
  );
  if (tables.length > 0) {
    return;
  }
  await getDb().exec(`
    CREATE TABLE IF NOT EXISTS ring_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      refresh_token TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

async function migrateUserTokensToRingAccounts(): Promise<void> {
  const rows = await getDb().all<
    Array<{ user_id: number; refresh_token: string; updated_at: string }>
  >('SELECT user_id, refresh_token, updated_at FROM user_tokens');
  for (const row of rows) {
    if (!Number.isFinite(row.user_id) || row.user_id <= 0) {
      continue;
    }
    const existing = await getDb().get<{ id: number }>(
      'SELECT id FROM ring_accounts WHERE user_id = ? AND disabled = 0 ORDER BY is_default DESC, id ASC LIMIT 1',
      row.user_id
    );
    if (existing) {
      await getDb().run(
        `UPDATE ring_accounts
         SET refresh_token = COALESCE(refresh_token, ?),
             updated_at = CASE WHEN refresh_token IS NULL THEN ? ELSE updated_at END
         WHERE id = ?`,
        row.refresh_token,
        row.updated_at,
        existing.id
      );
      continue;
    }
    await getDb().run(
      `INSERT INTO ring_accounts
        (user_id, label, refresh_token, is_default, disabled, created_at, updated_at)
       VALUES (?, ?, ?, 1, 0, ?, ?)`,
      row.user_id,
      'Primary Ring Account',
      row.refresh_token,
      row.updated_at,
      row.updated_at
    );
  }
}

async function ensureGuestLinksUserIdColumn(): Promise<void> {
  const columns = await getDb().all<Array<{ name: string }>>(
    'PRAGMA table_info(guest_links)'
  );
  const hasUserId = columns.some((col) => col.name === 'user_id');
  if (!hasUserId) {
    await getDb().exec('ALTER TABLE guest_links ADD COLUMN user_id INTEGER');
  }
}

async function ensureGuestLinksRingAccountIdColumn(): Promise<void> {
  const columns = await getDb().all<Array<{ name: string }>>(
    'PRAGMA table_info(guest_links)'
  );
  const hasRingAccountId = columns.some((col) => col.name === 'ring_account_id');
  if (!hasRingAccountId) {
    await getDb().exec('ALTER TABLE guest_links ADD COLUMN ring_account_id INTEGER NOT NULL DEFAULT 0');
  }
  const rows = await getDb().all<Array<{ id: number; user_id: number; ring_account_id: number }>>(
    'SELECT id, user_id, ring_account_id FROM guest_links'
  );
  for (const row of rows) {
    if (row.ring_account_id && row.ring_account_id > 0) {
      continue;
    }
    if (!Number.isFinite(row.user_id) || row.user_id <= 0) {
      continue;
    }
    const fallback = await getDefaultRingAccountForUser(row.user_id);
    if (!fallback) {
      const created = await createRingAccount(row.user_id, 'Primary Ring Account');
      await getDb().run(
        'UPDATE guest_links SET ring_account_id = ? WHERE id = ?',
        created.id,
        row.id
      );
      continue;
    }
    await getDb().run(
      'UPDATE guest_links SET ring_account_id = ? WHERE id = ?',
      fallback.id,
      row.id
    );
  }
}

async function ensureGuestLinksStartsAtColumn(): Promise<void> {
  const columns = await getDb().all<Array<{ name: string }>>(
    'PRAGMA table_info(guest_links)'
  );
  const hasStartsAt = columns.some((col) => col.name === 'starts_at');
  if (!hasStartsAt) {
    await getDb().exec('ALTER TABLE guest_links ADD COLUMN starts_at TEXT');
    await getDb().exec(
      "UPDATE guest_links SET starts_at = COALESCE(created_at, expires_at) WHERE starts_at IS NULL OR starts_at = ''"
    );
  }
}

async function ensureUsersProfileColumns(): Promise<void> {
  const columns = await getDb().all<Array<{ name: string }>>(
    'PRAGMA table_info(users)'
  );
  const existing = new Set(columns.map((c) => c.name));
  if (!existing.has('first_name')) {
    await getDb().exec('ALTER TABLE users ADD COLUMN first_name TEXT');
  }
  if (!existing.has('last_name')) {
    await getDb().exec('ALTER TABLE users ADD COLUMN last_name TEXT');
  }
  if (!existing.has('structure')) {
    await getDb().exec('ALTER TABLE users ADD COLUMN structure TEXT');
  }
}

async function ensureUsersDisabledColumn(): Promise<void> {
  const columns = await getDb().all<Array<{ name: string }>>(
    'PRAGMA table_info(users)'
  );
  const existing = new Set(columns.map((c) => c.name));
  if (!existing.has('disabled')) {
    await getDb().exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0');
  }
}

async function ensureUnlockEventsTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='unlock_events'"
  );
  if (tables.length === 0) {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS unlock_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        intercom_id TEXT NOT NULL,
        source TEXT NOT NULL,
        guest_link_id INTEGER,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(guest_link_id) REFERENCES guest_links(id) ON DELETE SET NULL
      );
    `);
  }
}

async function ensureLoginAttemptsTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'"
  );
  if (tables.length === 0) {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        username TEXT PRIMARY KEY,
        failed_count INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        last_failed_at TEXT
      );
    `);
  }
}

async function ensureLoginAuditTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='login_audit'"
  );
  if (tables.length === 0) {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS login_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        success INTEGER NOT NULL,
        ip TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }
}

async function ensureGuestLinkTemplatesTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='guest_link_templates'"
  );
  if (tables.length === 0) {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS guest_link_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        duration_hours INTEGER NOT NULL,
        max_uses INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }
}

async function ensureDeviceHealthHistoryTable(): Promise<void> {
  const tables = await getDb().all<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='device_health_history'"
  );
  if (tables.length === 0) {
    await getDb().exec(`
      CREATE TABLE IF NOT EXISTS device_health_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        intercom_id TEXT NOT NULL,
        battery_percent INTEGER,
        rssi INTEGER,
        ota_status TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }
}
