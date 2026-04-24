import dotenv from 'dotenv';

dotenv.config();

const required = [
  'SESSION_SECRET',
  'MASTER_KEY',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH'
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const port = parseIntegerEnv('PORT', process.env.PORT, 3001);
const unlockEventsMax = parseIntegerEnv(
  'UNLOCK_EVENTS_MAX',
  process.env.UNLOCK_EVENTS_MAX,
  10000
);
const masterKey = process.env.MASTER_KEY as string;
const sessionSecret = process.env.SESSION_SECRET as string;

if (Buffer.from(masterKey, 'base64').length !== 32) {
  throw new Error('MASTER_KEY must be 32 bytes, base64-encoded');
}

if (nodeEnv === 'production' && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production');
}

export const config = {
  NODE_ENV: nodeEnv,
  PORT: port,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME as string,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH as string,
  SESSION_SECRET: sessionSecret,
  MASTER_KEY: masterKey,
  DB_PATH: process.env.DB_PATH ?? './data.db',
  SESSION_DB_FILE: process.env.SESSION_DB_FILE ?? 'session.db',
  UNLOCK_EVENTS_MAX: unlockEventsMax
};

function parseIntegerEnv(
  key: string,
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return parsed;
}
