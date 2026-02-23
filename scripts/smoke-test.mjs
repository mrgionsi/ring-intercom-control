#!/usr/bin/env node

const args = process.argv.slice(2);

function getArg(name, fallback = '') {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const baseUrl = getArg('--base-url', process.env.SMOKE_BASE_URL || 'http://localhost:3001');
const username = getArg('--username', process.env.SMOKE_USERNAME || '');
const password = getArg('--password', process.env.SMOKE_PASSWORD || '');

const cookies = new Map();

function setCookieFromHeader(setCookieValue) {
  if (!setCookieValue) return;
  const firstPair = setCookieValue.split(';', 1)[0];
  const [name, ...rest] = firstPair.split('=');
  if (!name || rest.length === 0) return;
  cookies.set(name.trim(), rest.join('=').trim());
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    for (const value of values) setCookieFromHeader(value);
    return;
  }
  const single = headers.get('set-cookie');
  if (single) {
    const parts = single.split(/,(?=[^;]+=[^;]+)/g);
    for (const part of parts) setCookieFromHeader(part);
  }
}

function cookieHeader() {
  if (cookies.size === 0) return '';
  return Array.from(cookies.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = cookieHeader();
  if (cookie) headers.set('cookie', cookie);
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });
  readSetCookieHeaders(res.headers);
  return res;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function assertStatus(path, expected, options) {
  const res = await request(path, options);
  if (res.status !== expected) {
    const body = await readJson(res);
    throw new Error(`${path} expected ${expected}, got ${res.status}. body=${JSON.stringify(body)}`);
  }
  return res;
}

async function main() {
  console.log(`Smoke test target: ${baseUrl}`);

  const healthRes = await assertStatus('/api/health', 200);
  const health = await readJson(healthRes);
  if (!health || health.ok !== true) {
    throw new Error('/api/health returned unexpected payload');
  }
  console.log('PASS /api/health');

  await assertStatus('/api/auth/me', 401);
  console.log('PASS /api/auth/me unauthenticated');

  await assertStatus('/api/ring/status', 401);
  console.log('PASS /api/ring/status unauthenticated');

  const csrfRes = await assertStatus('/api/auth/csrf', 200);
  const csrf = await readJson(csrfRes);
  if (!csrf?.csrfToken || typeof csrf.csrfToken !== 'string') {
    throw new Error('/api/auth/csrf did not return csrfToken');
  }
  console.log('PASS /api/auth/csrf');

  if (!username || !password) {
    console.log('SKIP login smoke (no username/password provided)');
    return;
  }

  const loginRes = await assertStatus('/api/auth/login', 200, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.csrfToken
    },
    body: JSON.stringify({ username, password })
  });
  const login = await readJson(loginRes);
  if (!login?.ok) {
    throw new Error('/api/auth/login returned unexpected payload');
  }
  console.log('PASS /api/auth/login');

  const meRes = await assertStatus('/api/auth/me', 200);
  const me = await readJson(meRes);
  if (!me?.username || !me?.role) {
    throw new Error('/api/auth/me returned unexpected payload after login');
  }
  console.log(`PASS /api/auth/me authenticated as ${me.username} (${me.role})`);

  const ringStatusRes = await assertStatus('/api/ring/status', 200);
  const ringStatus = await readJson(ringStatusRes);
  if (!ringStatus || !Array.isArray(ringStatus.accounts)) {
    throw new Error('/api/ring/status returned unexpected payload');
  }
  console.log('PASS /api/ring/status authenticated');

  const basicUser = `smoke-user-${Date.now()}`;
  const basicPassword = 'smoke-user-password';
  let createdAccountId = null;
  let createdUserId = null;
  let adminCsrfToken = csrf.csrfToken;

  try {
    const createAccountLabel = `Smoke Account ${Date.now()}`;
    const createAccountRes = await assertStatus('/api/ring/accounts', 200, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrfToken
      },
      body: JSON.stringify({ label: createAccountLabel })
    });
    const createAccount = await readJson(createAccountRes);
    createdAccountId = createAccount?.account?.id ?? null;
    if (!createdAccountId) {
      throw new Error('/api/ring/accounts create did not return account id');
    }
    console.log('PASS /api/ring/accounts create');

    const listAccountsRes = await assertStatus('/api/ring/accounts', 200);
    const listAccounts = await readJson(listAccountsRes);
    if (!listAccounts?.accounts?.some((a) => a.id === createdAccountId)) {
      throw new Error('/api/ring/accounts list missing created account');
    }
    console.log('PASS /api/ring/accounts list');

    await assertStatus(`/api/ring/accounts/${createdAccountId}`, 200, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': adminCsrfToken
      }
    });
    createdAccountId = null;
    console.log('PASS /api/ring/accounts delete');

    const createUserRes = await assertStatus('/api/admin/users', 200, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrfToken
      },
      body: JSON.stringify({
        username: basicUser,
        password: basicPassword,
        role: 'user',
        firstName: 'Smoke',
        lastName: 'User',
        structure: 'Test'
      })
    });
    const createUser = await readJson(createUserRes);
    createdUserId = createUser?.user?.id ?? null;
    if (!createdUserId) {
      throw new Error('/api/admin/users create did not return user id');
    }
    console.log('PASS /api/admin/users create standard user');

    await assertStatus('/api/auth/logout', 200, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': adminCsrfToken
      }
    });
    console.log('PASS /api/auth/logout');

    const csrfUserRes = await assertStatus('/api/auth/csrf', 200);
    const csrfUser = await readJson(csrfUserRes);
    if (!csrfUser?.csrfToken || typeof csrfUser.csrfToken !== 'string') {
      throw new Error('/api/auth/csrf did not return csrfToken for user login');
    }

    await assertStatus('/api/auth/login', 200, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfUser.csrfToken
      },
      body: JSON.stringify({ username: basicUser, password: basicPassword })
    });
    console.log('PASS /api/auth/login standard user');

    await assertStatus('/api/admin/users', 403);
    console.log('PASS /api/admin/users forbidden for standard user');

    await assertStatus('/api/ring/status', 200);
    console.log('PASS /api/ring/status allowed for standard user');
  } finally {
    if (createdUserId || createdAccountId) {
      try {
        const logoutCsrfRes = await assertStatus('/api/auth/csrf', 200);
        const logoutCsrf = await readJson(logoutCsrfRes);
        if (logoutCsrf?.csrfToken) {
          await assertStatus('/api/auth/logout', 200, {
            method: 'POST',
            headers: { 'X-CSRF-Token': logoutCsrf.csrfToken }
          });
        }
      } catch {
        // best-effort logout before admin cleanup
      }
      try {
        if (username && password) {
          const loginCsrfRes = await assertStatus('/api/auth/csrf', 200);
          const loginCsrf = await readJson(loginCsrfRes);
          if (!loginCsrf?.csrfToken) {
            throw new Error('Missing CSRF token for admin login during cleanup');
          }
          await assertStatus('/api/auth/login', 200, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': loginCsrf.csrfToken
            },
            body: JSON.stringify({ username, password })
          });
          const cleanupCsrfRes = await assertStatus('/api/auth/csrf', 200);
          const cleanupCsrf = await readJson(cleanupCsrfRes);
          if (!cleanupCsrf?.csrfToken) {
            throw new Error('Missing CSRF token for admin cleanup operations');
          }
          adminCsrfToken = cleanupCsrf.csrfToken;
        }
        if (createdAccountId && adminCsrfToken) {
          await assertStatus(`/api/ring/accounts/${createdAccountId}`, 200, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': adminCsrfToken }
          });
        }
        if (createdUserId && adminCsrfToken) {
          await assertStatus(`/api/admin/users/${createdUserId}/permanent`, 200, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': adminCsrfToken }
          });
        }
      } catch (err) {
        console.warn(`WARN cleanup failed: ${err?.message ?? String(err)}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  process.exit(1);
});
