import 'express-session';

declare module 'express-session' {
  interface SessionData {
    auth?: {
      id: number;
      username: string;
      role: 'admin' | 'user';
      loginAt: string;
    };
  }
}
