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

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3001),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME as string,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH as string,
  SESSION_SECRET: process.env.SESSION_SECRET as string,
  MASTER_KEY: process.env.MASTER_KEY as string,
  DB_PATH: process.env.DB_PATH ?? './data.db',
  SESSION_DB_FILE: process.env.SESSION_DB_FILE ?? 'session.db',
  UNLOCK_EVENTS_MAX: Number(process.env.UNLOCK_EVENTS_MAX ?? 10000)
};
