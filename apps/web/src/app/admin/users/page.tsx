"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getAdminUsers,
  adminCreateUser,
  changeUserRole,
  deleteUser,
  createInvite,
  adminResetLink,
  getOrgRoles,
  type AdminUser,
  type InviteLink,
  type RoleOption,
} from "@/lib/adminApi";
import { getSessionUser } from "@/lib/session";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#e8eaf6",
  boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff",
  fontSize: 13,
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box" as const,
};

const btnPrimary = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
};

const btnGhost = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#6366f1",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const btnDangerSmall = {
  ...btnGhost,
  color: "#e97b8a",
};

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modalStyle = {
  width: "100%",
  maxWidth: 480,
  background: "#e8eaf6",
  borderRadius: 20,
  padding: 28,
  boxShadow: "8px 8px 24px #b0b8d8, -8px -8px 24px #ffffff",
};

const FALLBACK_ROLES: RoleOption[] = [
  { value: "viewer", label: "Viewer", desc: "Read-only access" },
  { value: "editor", label: "Editor", desc: "Add and edit data" },
  { value: "admin", label: "Admin", desc: "Manage users & settings" },
  { value: "owner", label: "Owner", desc: "Full control" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const defaultRole = () =>
    roleOptions.find((r) => r.value === "viewer")?.value ??
    roleOptions.find((r) => r.value !== "owner")?.value ??
    "viewer";
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "viewer" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [inviteMode, setInviteMode] = useState<"password" | "link">("password");
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const me = getSessionUser();
  const canWrite = me?.permissions.includes("user:write") ?? false;
  const canDelete = me?.permissions.includes("user:delete") ?? false;
  const isOwner = me?.role === "owner";

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getOrgRoles()
      .then((r) => {
        setRoleOptions(r.roles);
        setForm((prev) => {
          const valid = r.roles.some((ro) => ro.value === prev.role);
          if (valid) return prev;
          const fallback =
            r.roles.find((ro) => ro.value === "viewer")?.value ??
            r.roles.find((ro) => ro.value !== "owner")?.value ??
            "viewer";
          return { ...prev, role: fallback };
        });
      })
      .catch(() => setRoleOptions(FALLBACK_ROLES));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (inviteMode === "link") {
        const link = await createInvite(form.email, form.role);
        setInviteLink(link);
        setShowForm(false);
        setForm({ username: "", email: "", password: "", role: defaultRole() });
      } else {
        await adminCreateUser(form.username, form.email, form.password, form.role);
        setShowForm(false);
        setForm({ username: "", email: "", password: "", role: defaultRole() });
        await load();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetLink(userId: number) {
    setLinkBusy(true);
    try {
      const link = await adminResetLink(userId);
      setInviteLink({ ...link, token: link.token });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create reset link");
    } finally {
      setLinkBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch {
      prompt("Copy:", text);
    }
  }

  async function handleRoleChange(userId: number, role: string) {
    try {
      await changeUserRole(userId, role);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change role");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteUser(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const rolePill = (role: string) => {
    const map: Record<string, string> = {
      owner: "pill-red",
      admin: "pill-purple",
      editor: "pill-blue",
      clinical_editor: "pill-blue",
      faculty_editor: "pill-blue",
      viewer: "pill-gray",
      observer: "pill-gray",
    };
    return map[role] || "pill-gray";
  };

  const roleLabel = (value: string) =>
    roleOptions.find((r) => r.value === value)?.label ?? value;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Team & Roles</h2>
          <p style={{ fontSize: 11, color: "#a0aec0" }}>{users.length} member{users.length === 1 ? "" : "s"}</p>
        </div>
        {canWrite && (
          <button onClick={() => { setShowForm(true); setError(""); }} style={btnPrimary}>
            + Invite Member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="neo" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        {roleOptions.map((r) => (
          <div key={r.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`pill ${rolePill(r.value)}`}>{r.label}</span>
            <span style={{ fontSize: 10, color: "#a0aec0" }}>{r.desc}</span>
          </div>
        ))}
      </div>

      <div className="neo" style={{ padding: 16, overflowX: "auto" }}>
        <table className="neo-table" style={{ width: "100%", minWidth: 640 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th style={{ minWidth: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  Loading members...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  No members found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: "var(--brand-primary, #6366f1)" }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {u.username}
                    {u.id === me?.id && (
                      <span style={{ fontSize: 9, color: "#a0aec0", marginLeft: 6 }}>(you)</span>
                    )}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {canWrite && u.id !== me?.id && (u.role !== "owner" || isOwner) ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          ...inputStyle,
                          width: "auto",
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {roleOptions.filter((r) => r.value !== "owner" || isOwner).map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`pill ${rolePill(u.role)}`}>{roleLabel(u.role)}</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "#a0aec0" }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {canWrite && (
                        <button onClick={() => handleResetLink(u.id)} disabled={linkBusy} style={btnGhost}>
                          🔑 Reset link
                        </button>
                      )}
                      {canDelete && u.id !== me?.id && (
                        <button onClick={() => setDeleteId(u.id)} style={btnDangerSmall}>
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div style={modalStyle} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Invite Member</h3>
              <button onClick={() => setShowForm(false)} style={{ ...btnGhost, fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setInviteMode("link")}
                style={{
                  ...btnGhost,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: inviteMode === "link" ? "rgba(99,102,241,.12)" : "transparent",
                  color: inviteMode === "link" ? "#6366f1" : "#a0aec0",
                }}
              >
                Invite link
              </button>
              <button
                type="button"
                onClick={() => setInviteMode("password")}
                style={{
                  ...btnGhost,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: inviteMode === "password" ? "rgba(99,102,241,.12)" : "transparent",
                  color: inviteMode === "password" ? "#6366f1" : "#a0aec0",
                }}
              >
                Set password now
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "rgba(233,123,138,.15)",
                  color: "#b5364a",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gap: 12 }}>
                {inviteMode === "password" && (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                      required
                      minLength={3}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                </div>
                {inviteMode === "password" && (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      required
                      minLength={6}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {roleOptions.filter((r) => r.value !== "owner" || isOwner).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.desc}
                      </option>
                    ))}
                  </select>
                </div>
                {inviteMode === "link" && (
                  <p style={{ fontSize: 11, color: "#a0aec0", margin: 0 }}>
                    We&apos;ll generate a shareable invite link (valid 7 days). Send it to the member yourself — no email is configured yet.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnGhost, padding: "10px 16px" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Creating..." : inviteMode === "link" ? "Create invite link" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared invite / reset link modal */}
      {inviteLink && (
        <div style={overlayStyle} onClick={() => setInviteLink(null)}>
          <div style={modalStyle} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Share this link</h3>
              <button onClick={() => setInviteLink(null)} style={{ ...btnGhost, fontSize: 18 }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 12 }}>
              Valid until {new Date(inviteLink.expires_at).toLocaleString()}. Copy and send it securely.
            </p>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#e8eaf6",
                boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff",
                fontSize: 12,
                wordBreak: "break-all",
                color: "#1e293b",
                marginBottom: 16,
              }}
            >
              {inviteLink.link}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setInviteLink(null)} style={{ ...btnGhost, padding: "10px 16px" }}>
                Close
              </button>
              <button onClick={() => copyText(inviteLink.link)} style={btnPrimary}>
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div style={overlayStyle} onClick={() => setDeleteId(null)}>
          <div style={{ ...modalStyle, maxWidth: 400, textAlign: "center" }} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Remove Member?</h3>
            <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>
              This action cannot be undone. The member will lose access immediately.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ ...btnGhost, padding: "10px 16px" }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  ...btnPrimary,
                  background: "#e97b8a",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
