import crypto from 'crypto';
import { RingRestClient } from 'ring-client-api/lib/rest-client.js';

const AUTH_TTL_MS = 5 * 60 * 1000;

type PendingAuth = {
  id: string;
  userId: number;
  restClient: RingRestClient;
  expiresAt: number;
  timer: NodeJS.Timeout;
};

const pendingAuthById = new Map<string, PendingAuth>();

function clearPendingAuth(id: string) {
  const pending = pendingAuthById.get(id);
  if (pending) {
    clearTimeout(pending.timer);
    pendingAuthById.delete(id);
  }
}

function createPendingAuth(userId: number, restClient: RingRestClient) {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + AUTH_TTL_MS;
  const timer = setTimeout(() => pendingAuthById.delete(id), AUTH_TTL_MS);
  pendingAuthById.set(id, { id, userId, restClient, expiresAt, timer });
  return { id, expiresAt };
}

export async function startRingAuth(
  userId: number,
  email: string,
  password: string
) {
  const restClient = new RingRestClient({ email, password });
  try {
    const auth = await restClient.getCurrentAuth();
    return { refreshToken: auth.refresh_token };
  } catch (err) {
    if (restClient.promptFor2fa) {
      const { id, expiresAt } = createPendingAuth(userId, restClient);
      return { authSessionId: id, prompt: restClient.promptFor2fa, expiresAt };
    }
    throw err;
  }
}

export async function verifyRingAuth(
  userId: number,
  authSessionId: string,
  code: string
) {
  const pending = pendingAuthById.get(authSessionId);
  if (!pending || pending.userId !== userId) {
    const error = new Error('Auth session expired. Please start again.');
    (error as any).status = 400;
    throw error;
  }

  try {
    const auth = await pending.restClient.getAuth(code);
    clearPendingAuth(authSessionId);
    return { refreshToken: auth.refresh_token };
  } catch (err) {
    if (pending.restClient.promptFor2fa) {
      const error = new Error(pending.restClient.promptFor2fa);
      (error as any).status = 400;
      throw error;
    }
    throw err;
  }
}
