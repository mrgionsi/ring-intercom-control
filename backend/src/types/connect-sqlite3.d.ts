declare module 'connect-sqlite3' {
  import type session from 'express-session';

  type SqliteStoreFactory = (
    sessionModule: typeof session
  ) => new (options?: Record<string, unknown>) => session.Store;

  const sqliteStoreFactory: SqliteStoreFactory;
  export default sqliteStoreFactory;
}
