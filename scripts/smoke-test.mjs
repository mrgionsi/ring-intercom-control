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

  const createAccountLabel = `Smoke Account ${Date.now()}`;
  const createAccountRes = await assertStatus('/api/ring/accounts', 200, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.csrfToken
    },
    body: JSON.stringify({ label: createAccountLabel })
  });
  const createAccount = await readJson(createAccountRes);
  const createdId = createAccount?.account?.id;
  if (!createdId) {
    throw new Error('/api/ring/accounts create did not return account id');
  }
  console.log('PASS /api/ring/accounts create');

  const listAccountsRes = await assertStatus('/api/ring/accounts', 200);
  const listAccounts = await readJson(listAccountsRes);
  if (!listAccounts?.accounts?.some((a) => a.id === createdId)) {
    throw new Error('/api/ring/accounts list missing created account');
  }
  console.log('PASS /api/ring/accounts list');

  await assertStatus(`/api/ring/accounts/${createdId}`, 200, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrf.csrfToken
    }
  });
  console.log('PASS /api/ring/accounts delete');
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  process.exit(1);
});
