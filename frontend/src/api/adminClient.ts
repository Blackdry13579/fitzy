const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const KEY = 'adminToken';

export function getAdminToken() { return localStorage.getItem(KEY); }
export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY);
}

export async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setAdminToken(null);
    throw new Error((data && (data.error || data.message)) || 'Erreur serveur');
  }
  return data as T;
}
