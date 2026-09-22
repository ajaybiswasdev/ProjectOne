"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getOrgSettings, updateOrgSettings, type OrgSettings } from "@/lib/adminApi";
import { getSessionUser, applyBranding } from "@/lib/session";

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

const labelStyle = {
  display: "block" as const,
  fontSize: 10,
  fontWeight: 700 as const,
  color: "#a0aec0",
  marginBottom: 4,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
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

const INDUSTRIES = [
  { value: "professional", label: "Professional Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
];

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#14b8a6", "#f97316",
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const user = getSessionUser();
  const canWrite = user?.permissions.includes("org:write") ?? false;

  useEffect(() => {
    getOrgSettings()
      .then(setSettings)
      .catch(() => setErr("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const updated = await updateOrgSettings(settings);
      setSettings(updated);
      // Refresh session user with new branding
      const { getMe } = await import("@/lib/adminApi");
      const me = await getMe();
      applyBranding(me.organization);
      setMsg("Settings saved");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#a0aec0" }}>Loading settings...</div>;
  }

  if (!settings) {
    return <div style={{ padding: 24, color: "#e97b8a" }}>{err || "Settings unavailable"}</div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Workspace Settings</h2>
        <p style={{ fontSize: 11, color: "#a0aec0" }}>
          Customize branding, industry, and labels for your workspace
        </p>
      </div>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(16,185,129,.15)", color: "#0a7a52", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(233,123,138,.15)", color: "#b5364a", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          {err}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Branding */}
        <div className="neo" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Branding</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="settings-grid">
            <div>
              <label style={labelStyle}>Workspace Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={!canWrite}
                required
                style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6 }}
              />
            </div>
            <div>
              <label style={labelStyle}>App Display Name</label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => set("app_name", e.target.value)}
                disabled={!canWrite}
                required
                style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6 }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Logo URL (optional)</label>
              <input
                type="url"
                value={settings.logo_url}
                onChange={(e) => set("logo_url", e.target.value)}
                disabled={!canWrite}
                placeholder="https://example.com/logo.png"
                style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Unit Label (e.g. Resources, Staff, Cohort)</label>
              <input
                type="text"
                value={settings.unit_label}
                onChange={(e) => set("unit_label", e.target.value)}
                disabled={!canWrite}
                style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Industry Template</label>
              <select
                value={settings.industry}
                onChange={(e) => set("industry", e.target.value)}
                disabled={!canWrite}
                style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6, cursor: "pointer" }}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="neo" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Colors</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="settings-grid">
            <div>
              <label style={labelStyle}>Primary Color</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => set("primary_color", e.target.value)}
                  disabled={!canWrite}
                  style={{ width: 40, height: 40, border: "none", borderRadius: 10, cursor: "pointer", background: "none" }}
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => set("primary_color", e.target.value)}
                  disabled={!canWrite}
                  style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6, flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => canWrite && set("primary_color", c)}
                    style={{
                      width: 24, height: 24, borderRadius: 6, background: c,
                      border: settings.primary_color === c ? "2px solid #1e293b" : "2px solid transparent",
                      cursor: canWrite ? "pointer" : "default",
                    }}
                    aria-label={`Set color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Accent Color</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => set("accent_color", e.target.value)}
                  disabled={!canWrite}
                  style={{ width: 40, height: 40, border: "none", borderRadius: 10, cursor: "pointer", background: "none" }}
                />
                <input
                  type="text"
                  value={settings.accent_color}
                  onChange={(e) => set("accent_color", e.target.value)}
                  disabled={!canWrite}
                  style={{ ...inputStyle, opacity: canWrite ? 1 : 0.6, flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="neo" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Preview</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 12, background: settings.primary_color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 18, fontWeight: 800,
                boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
              }}
            >
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
              ) : (
                settings.app_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{settings.app_name}</div>
              <div style={{ fontSize: 11, color: settings.accent_color, fontWeight: 600 }}>
                {settings.unit_label} · {settings.industry}
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto", padding: "8px 16px", borderRadius: 10,
                background: settings.primary_color, color: "#fff",
                fontSize: 12, fontWeight: 700,
              }}
            >
              Sample Button
            </div>
          </div>
        </div>

        {canWrite && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}
        {!canWrite && (
          <p style={{ fontSize: 12, color: "#a0aec0", textAlign: "right" }}>
            You have view-only access. Ask an admin to change settings.
          </p>
        )}
      </form>

      <style jsx global>{`
        @media (max-width: 640px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
