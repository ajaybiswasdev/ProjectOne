const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
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
  imported: number;
  skipped: number;
  errors: string[];
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleAuthError(status: number) {
  if (status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
    }
  }
}

export async function adminLogin(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function adminRegister(username: string, email: string, password: string, role: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ username, email, password, role }),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  const err = await res.json().catch(() => ({ detail: "Request failed" }));
  throw new Error(err.detail || "Registration failed");
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw new Error("Failed to fetch users");
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw new Error("Failed to delete user");
  }
}

export async function adminCreateResource(data: Partial<AdminResource>): Promise<AdminResource> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  const err = await res.json().catch(() => ({ detail: "Request failed" }));
  throw new Error(err.detail || "Failed to create resource");
}

export async function adminUpdateResource(id: number, data: Partial<AdminResource>): Promise<AdminResource> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  const err = await res.json().catch(() => ({ detail: "Request failed" }));
  throw new Error(err.detail || "Failed to update resource");
}

export async function adminDeleteResource(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/resources/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleAuthError(res.status);
    throw new Error("Failed to delete resource");
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
  const err = await res.json().catch(() => ({ detail: "Import failed" }));
  throw new Error(err.detail || "Import failed");
}

export async function adminExportCsv(): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/export`, { headers: authHeaders() });
  if (!res.ok) {
    handleAuthError(res.status);
    throw new Error("Export failed");
  }
  return res.blob();
}

export async function getAdminSummary(): Promise<{ total_resources: number; total_users: number; departments: number; last_updated: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/summary`, { headers: authHeaders() });
  if (res.ok) return res.json();
  handleAuthError(res.status);
  throw new Error("Failed to fetch summary");
}

export function isAdminLoggedIn(): boolean {
  return !!getToken();
}
