import { afterEach, describe, expect, it, vi } from 'vitest';

const validMasterKey = '7sQb2MQ4mL/QBjxJgRLZ2TLGnciP9f4pBf3MQXybP5Q=';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function stubBaseEnv() {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('SESSION_SECRET', 'test-session-secret');
  vi.stubEnv('MASTER_KEY', validMasterKey);
  vi.stubEnv('ADMIN_USERNAME', 'admin');
  vi.stubEnv('ADMIN_PASSWORD_HASH', 'hash');
}

async function importConfig() {
  vi.resetModules();
  return import('../src/config.js');
}

describe('config validation', () => {
  it('uses numeric fallbacks for empty and whitespace env values', async () => {
    stubBaseEnv();
    vi.stubEnv('PORT', '');
    vi.stubEnv('UNLOCK_EVENTS_MAX', '   ');

    const { config } = await importConfig();

    expect(config.PORT).toBe(3001);
    expect(config.UNLOCK_EVENTS_MAX).toBe(10000);
  });

  it('rejects non-positive numeric env values', async () => {
    stubBaseEnv();
    vi.stubEnv('PORT', '0');

    await expect(importConfig()).rejects.toThrow(
      'PORT must be a positive integer'
    );
  });

  it('rejects non-canonical base64 master keys', async () => {
    stubBaseEnv();
    vi.stubEnv('MASTER_KEY', validMasterKey.replace(/=$/, ''));

    await expect(importConfig()).rejects.toThrow(
      'MASTER_KEY must be 32 bytes, base64-encoded'
    );
  });

  it('rejects master keys containing whitespace', async () => {
    stubBaseEnv();
    vi.stubEnv('MASTER_KEY', `${validMasterKey}\n`);

    await expect(importConfig()).rejects.toThrow(
      'MASTER_KEY must be 32 bytes, base64-encoded'
    );
  });
});
