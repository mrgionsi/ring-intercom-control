const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const CSRF_KEY = 'csrfToken';

export async function initCsrf(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/csrf`, {
    credentials: 'include'
  });
  if (!res.ok) {
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (data?.csrfToken) {
    localStorage.setItem(CSRF_KEY, data.csrfToken);
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const csrfToken = localStorage.getItem(CSRF_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Request failed');
  }

  return res.json();
}
