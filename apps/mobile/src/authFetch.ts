import { clearSession, getToken } from "./session";

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return {
    Accept: "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

/** fetch with Bearer token; on 401 clears session so App can show login. */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (response.status === 401) {
    await clearSession();
  }
  return response;
}
