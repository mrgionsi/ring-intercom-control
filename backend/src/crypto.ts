import crypto from 'crypto';
import { config } from './config.js';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const raw = Buffer.from(config.MASTER_KEY, 'base64');
  if (raw.length !== 32) {
    throw new Error('MASTER_KEY must be 32 bytes, base64-encoded');
  }
  return raw;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  return plaintext.toString('utf8');
}
