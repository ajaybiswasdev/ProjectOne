"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getAdminUsers,
  adminRegister,
  deleteUser,
  type AdminUser,
} from "@/lib/adminApi";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "viewer" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await adminRegister(form.username, form.email, form.password, form.role);
      setShowForm(false);
      setForm({ username: "", email: "", password: "", role: "viewer" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSaving(false);
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
      admin: "pill-red",
      editor: "pill-purple",
      viewer: "pill-blue",
    };
    return map[role] || "pill-gray";
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>User Management</h2>
          <p style={{ fontSize: 11, color: "#a0aec0" }}>{users.length} users registered</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(""); }} style={btnPrimary}>
          + Add User
        </button>
      </div>

      <div className="neo" style={{ padding: 16, overflowX: "auto" }}>
        <table className="neo-table" style={{ width: "100%", minWidth: 600 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: "#6366f1" }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`pill ${rolePill(u.role)}`}>{u.role}</span>
                  </td>
                  <td style={{ fontSize: 11, color: "#a0aec0" }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button onClick={() => setDeleteId(u.id)} style={btnDangerSmall}>
                      🗑️ Delete
                    </button>
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Add User</h3>
              <button onClick={() => setShowForm(false)} style={{ ...btnGhost, fontSize: 18 }}>✕</button>
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
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                </div>
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
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#a0aec0", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnGhost, padding: "10px 16px" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div style={overlayStyle} onClick={() => setDeleteId(null)}>
          <div style={{ ...modalStyle, maxWidth: 400, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Delete User?</h3>
            <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>
              This action cannot be undone. The user will be permanently removed.
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
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
