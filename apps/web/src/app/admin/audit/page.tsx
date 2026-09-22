"use client";

import { useEffect, useState } from "react";
import { getAuditLog, type AuditEntry } from "@/lib/adminApi";
import { getSessionUser } from "@/lib/session";

const ACTIONS = [
  "",
  "auth.login",
  "org.registered",
  "user.created",
  "user.role.changed",
  "user.deleted",
  "invite.created",
  "invite.accepted",
  "invite.revoked",
  "password.reset.requested",
  "password.reset.completed",
  "password.reset.link.created",
  "password.reset.by_admin",
  "org.settings.updated",
  "plan.changed",
  "api_key.created",
  "api_key.deleted",
  "resources.imported",
];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const me = getSessionUser();
  const canView = me?.permissions.includes("org:write") ?? false;

  async function load(filter = action) {
    setLoading(true);
    setError("");
    try {
      setEntries(await getAuditLog(100, filter));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) load("");
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canView) {
    return (
      <div style={{ padding: 24, color: "#a0aec0" }}>
        You need admin permissions to view the audit log.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Audit Log</h2>
          <p style={{ fontSize: 11, color: "#a0aec0" }}>{entries.length} recent event{entries.length === 1 ? "" : "s"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              load(e.target.value);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: "#e8eaf6",
              boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff",
              fontSize: 12,
              color: "#1e293b",
              cursor: "pointer",
            }}
          >
            {ACTIONS.map((a) => (
              <option key={a || "all"} value={a}>
                {a || "All actions"}
              </option>
            ))}
          </select>
          <button
            onClick={() => load()}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(233,123,138,.15)", color: "#b5364a", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="neo" style={{ padding: 16, overflowX: "auto" }}>
        <table className="neo-table" style={{ width: "100%", minWidth: 640 }}>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>Loading...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>No audit events yet.</td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: 11, color: "#a0aec0", whiteSpace: "nowrap" }}>
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{e.username || "—"}</td>
                  <td>
                    <span
                      className="pill pill-blue"
                      style={{ fontSize: 10 }}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "#a0aec0" }}>{e.resource || "—"}</td>
                  <td style={{ fontSize: 11, color: "#475569", maxWidth: 320, wordBreak: "break-word" }}>
                    {e.detail}
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
