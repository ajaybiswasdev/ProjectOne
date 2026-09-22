// ─── Session ────────────────────────────────────────────────────────────────
// Stores auth token, user identity, permissions, and org branding.
// ─────────────────────────────────────────────────────────────────────────────

export type OrgSettings = {
  name: string;
  slug: string;
  industry: string;
  app_name: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  unit_label: string;
  settings_json: Record<string, unknown>;
};

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  org_id: number;
  permissions: string[];
  organization: OrgSettings | null;
};

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function can(permission: string): boolean {
  const user = getSessionUser();
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function getOrgBranding(): OrgSettings | null {
  const user = getSessionUser();
  return user?.organization ?? null;
}

/** Apply white-label branding as CSS custom properties. */
export function applyBranding(org: OrgSettings | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (org) {
    root.style.setProperty("--brand-primary", org.primary_color);
    root.style.setProperty("--brand-accent", org.accent_color);
    root.style.setProperty("--brand-app-name", org.app_name);
    if (org.logo_url) {
      root.style.setProperty("--brand-logo", `url(${org.logo_url})`);
    }
  }
}
