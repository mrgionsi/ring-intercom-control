import { defineConfig } from '@playwright/test';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const masterKey = requiredEnv('MASTER_KEY');
const adminPasswordHash =
  process.env.E2E_ADMIN_PASSWORD_HASH ?? requiredEnv('ADMIN_PASSWORD_HASH');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'npm --prefix ../backend run build && npm --prefix ../backend run start',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: {
        SESSION_SECRET: process.env.SESSION_SECRET ?? 'e2e-session-secret',
        MASTER_KEY: masterKey,
        ADMIN_USERNAME: process.env.E2E_USERNAME ?? 'admin',
        ADMIN_PASSWORD_HASH: adminPasswordHash,
        CLIENT_ORIGIN: 'http://127.0.0.1:5173',
        PORT: '3001',
        DB_PATH: process.env.E2E_DB_PATH ?? '../backend/e2e.db'
      }
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI
    }
  ]
});
