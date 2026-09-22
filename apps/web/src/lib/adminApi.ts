import { clearSession, getSessionUser, getToken, setSession, type SessionUser } from "./session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AdminResource = {
  id: number;
  employee_id: string;
  name: string;
  level: string;
  skill: string;
  department: string;
  location: string;
  days_on_bench: number;
  age_bucket: string;
  deployable: string;
  rmg_status: string;
  status: string;
  experience_bucket: string;
  hrbp: string;
  leader: string;
};

export type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
  total_processed: number;
};

export type LoginResult = {
  access_token: string;
  token_type: string;
  role: string;
  org_id: number;
  org_name: string;
  permissions: string[];
};

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

export type PlanUsage = {
  plan: string;
  plan_name: string;
  max_users: number;
  max_resources: number;
  rate_limit: number;
  price_month: number;
  users: number;
  resources: number;
  seats_remaining: number;
  can_invite: boolean;
};

export type AuditEntry = {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  resource: string;
  detail: string;
  created_at: string;
};

export type ApiKeyItem = {
  id: number;
  name: string;
  prefix: string;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
};

export type ApiKeyCreated = ApiKeyItem & { key: string };

export type InviteItem = {
  id: number;
  email: string;
  role: string;
  kind: string;
  expires_at: string;
  used_at: string;
  created_at: string;
};

export type InviteLink = {
  token: string;
  link: string;
  expires_at: string;
};

export type InvitePreview = {
  email: string;
  role: string;
  org_name: string;
  valid: boolean;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleAuthError(status: number) {
  if (status === 401) {
    if (typeof window !== "undefined") {
      clearSession();
      window.location.href = "/admin/login";
    }
  }
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  const err = await res.json().catch(() => ({ detail: fallback }));
  return new Error(err.detail || fallback);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await parseError(res, "Login failed");
  const data: LoginResult = await res.json();
  // Fetch full user profile (with org branding) and persist session
  const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (meRes.ok) {
    const me: SessionUser = await meRes.json();
    setSession(data.access_token, me);
  } else {
    // Fallback minimal session
    setSession(data.access_token, {
      id: 0,
      username,
      email: "",
      role: data.role,
      org_id: data.org_id,
      permissions: data.permissions,
      organization: null,
    });
  }
  return data;
}

export async function publicRegister(
  username: string,
  email: string,
  password: string,
  orgName: string,
  industry: string,
): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, org_name: orgName, industry }),
  });
  if (res.ok) return res.json();
  throw await parseError(res, "Registration failed");
}

export async function getMe(): Promise<SessionUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { headers: authHeaders() });
  if (!res.ok) {
    handleAuthError(res.status);
    throw await parseError(res, "Failed to fetch profile");
  }
  const me: SessionUser = await res.json();
  // Keep session fresh
  const token = getToken();
  if (token) setSession(token, me);
  return me;
}

export function logout(): void {
  clearSession();
  if (typeof window !== "undefined") window.location.href = "/admin/login";
}

// ── Password reset & invites ─────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ detail: string; dev_link?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (res.ok) return res.json();
  throw await parseError(res, "Request failed");
}

export async function resetPassword(token: string, password: string): Promise<{ detail: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (res.ok) return res.json();
  throw await parseError(res, "Reset failed");
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/invite/${encodeURIComponent(token)}`);
  if (res.ok) return res.json();
  throw await parseError(res, "Invite invalid");
}

export async function acceptInvite(
  token: string,
  username: string,
  password: string,
): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/invite/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, username, password }),
  });
  if (res.ok) return res.json();
  throw await parseError(res, "Could not accept invite");
}

export async function createInvite(email: string, role: string): Promise<InviteLink> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, role }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to create invite");
}

export async function getInvites(): Promise<InviteItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/invites`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to fetch invites");
}

export async function revokeInvite(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/invites/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw await parseError(res, "Failed to revoke invite");
  }
}

export async function adminResetLink(userId: number): Promise<InviteLink> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/reset-link`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to create reset link");
}

// ── Audit log ────────────────────────────────────────────────────────────────

export async function getAuditLog(limit = 50, action = ""): Promise<AuditEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (action) params.set("action", action);
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/audit?${params}`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to fetch audit log");
}

// ── API keys ─────────────────────────────────────────────────────────────────

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/api-keys`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to fetch API keys");
}

export async function createApiKey(name: string): Promise<ApiKeyCreated> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to create API key");
}

export async function deleteApiKey(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/api-keys/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw await parseError(res, "Failed to delete API key");
  }
}

// ── Plan / billing ───────────────────────────────────────────────────────────

export async function getPlanUsage(): Promise<PlanUsage> {
  const res = await fetch(`${API_BASE_URL}/api/v1/org/plan`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to fetch plan");
}

export async function updatePlan(plan: string): Promise<PlanUsage> {
  const res = await fetch(`${API_BASE_URL}/api/v1/org/plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to update plan");
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw new Error("Failed to fetch users");
}

export async function adminCreateUser(
  username: string,
  email: string,
  password: string,
  role: string,
): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ username, email, password, role }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to create user");
}

export async function changeUserRole(userId: number, role: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to change role");
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw await parseError(res, "Failed to delete user");
  }
}

// ── Resources ────────────────────────────────────────────────────────────────

export async function adminCreateResource(data: Partial<AdminResource>): Promise<AdminResource> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to create resource");
}

export async function adminUpdateResource(id: number, data: Partial<AdminResource>): Promise<AdminResource> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to update resource");
}

export async function adminDeleteResource(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw await parseError(res, "Failed to delete resource");
  }
}

export async function adminImportCsv(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/import`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Import failed");
}

export async function adminExportCsv(): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/export`, { headers: authHeaders() });
  if (!res.ok) {
    handleAuthError(res.status);
    throw new Error("Export failed");
  }
  return res.blob();
}

export async function getAdminSummary(): Promise<{
  total_resources: number;
  total_users: number;
  departments: number;
  last_updated: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/summary`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw new Error("Failed to fetch summary");
}

// ── Org settings ─────────────────────────────────────────────────────────────

export async function getOrgSettings(): Promise<OrgSettings> {
  const res = await fetch(`${API_BASE_URL}/api/v1/org/settings`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to fetch settings");
}

export async function updateOrgSettings(data: Partial<OrgSettings>): Promise<OrgSettings> {
  const res = await fetch(`${API_BASE_URL}/api/v1/org/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw await parseError(res, "Failed to update settings");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isAdminLoggedIn(): boolean {
  return !!getToken();
}

export function getCurrentUser(): SessionUser | null {
  return getSessionUser();
}
