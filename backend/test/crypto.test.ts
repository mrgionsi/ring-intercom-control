import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../src/crypto.js';

describe('crypto helpers', () => {
  it('encrypts and decrypts payload', () => {
    const original = 'ring-refresh-token-value';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('fails decryption when payload is tampered', () => {
    const encrypted = encrypt('sensitive');
    const raw = Buffer.from(encrypted, 'base64');
    raw[raw.length - 1] = raw[raw.length - 1] ^ 0xff;
    const tampered = raw.toString('base64');

    expect(() => decrypt(tampered)).toThrow();
  });
});
