import path from 'path';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret';
}
if (!process.env.MASTER_KEY) {
  process.env.MASTER_KEY = '7sQb2MQ4mL/QBjxJgRLZ2TLGnciP9f4pBf3MQXybP5Q=';
}
if (!process.env.ADMIN_USERNAME) {
  process.env.ADMIN_USERNAME = 'admin';
}
if (!process.env.ADMIN_PASSWORD_HASH) {
  process.env.ADMIN_PASSWORD_HASH =
    '$2a$12$tGQSEUZiEq0SSh0Rt9rSlucHJqSrXVh5mbLK4AqYWiIISapwRZCUy';
}
if (!process.env.CLIENT_ORIGIN) {
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
}
if (!process.env.DB_PATH) {
  process.env.DB_PATH = path.resolve(
    process.cwd(),
    `test-${Date.now()}-${process.pid}.db`
  );
}
