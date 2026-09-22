"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createApiKey,
  deleteApiKey,
  getApiKeys,
  type ApiKeyCreated,
  type ApiKeyItem,
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

const btnDanger = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#e97b8a",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [error, setError] = useState("");
  const me = getSessionUser();
  const canManage = me?.permissions.includes("org:write") ?? false;

  async function load() {
    setLoading(true);
    try {
      setKeys(await getApiKeys());
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
    setCreating(true);
    try {
      const key = await createApiKey(name.trim() || "Default key");
      setCreated(key);
      setName("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this API key? Integrations using it will stop working.")) return;
    try {
      await deleteApiKey(id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      alert("API key copied");
    } catch {
      prompt("Copy this key:", key);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>API Keys</h2>
        <p style={{ fontSize: 11, color: "#a0aec0" }}>
          Authenticate server-to-server calls with the <code>X-API-Key</code> header
        </p>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(233,123,138,.15)", color: "#b5364a", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {created && (
        <div className="neo" style={{ padding: 16, marginBottom: 16, background: "rgba(16,185,129,.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0a7a52", marginBottom: 8 }}>
            Key created — copy it now, it won&apos;t be shown again
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <code style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "#e8eaf6", fontSize: 12, wordBreak: "break-all", boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff" }}>
              {created.key}
            </code>
            <button onClick={() => copyKey(created.key)} style={btnPrimary}>Copy</button>
            <button onClick={() => setCreated(null)} style={{ ...btnDanger, padding: "8px 12px" }}>Dismiss</button>
          </div>
        </div>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="neo" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. CRM integration)"
            required
            maxLength={120}
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button type="submit" disabled={creating} style={{ ...btnPrimary, opacity: creating ? 0.6 : 1 }}>
            {creating ? "Creating..." : "+ Create key"}
          </button>
        </form>
      )}

      <div className="neo" style={{ padding: 16, overflowX: "auto" }}>
        <table className="neo-table" style={{ width: "100%", minWidth: 560 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Last used</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>Loading keys...</td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  No API keys yet{canManage ? ". Create one above." : "."}
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id}>
                  <td style={{ fontWeight: 600 }}>{k.name}</td>
                  <td><code style={{ fontSize: 11 }}>{k.prefix}…</code></td>
                  <td style={{ fontSize: 11, color: "#a0aec0" }}>
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                  </td>
                  <td style={{ fontSize: 11, color: "#a0aec0" }}>
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {canManage && (
                      <button onClick={() => handleDelete(k.id)} style={btnDanger}>🗑️ Revoke</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
