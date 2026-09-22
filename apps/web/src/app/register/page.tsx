"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPublicRoles, publicRegister, type RoleOption } from "@/lib/adminApi";

const INDUSTRIES = [
  { value: "professional", label: "Professional Services", desc: "Consulting, staffing, workforce" },
  { value: "healthcare", label: "Healthcare", desc: "Hospitals, clinics, care teams" },
  { value: "education", label: "Education", desc: "Schools, universities, cohorts" },
];

// Local fallback so the preview never depends on a live API call
const ROLE_FALLBACK: Record<string, RoleOption[]> = {
  professional: [
    { value: "owner", label: "Owner", desc: "Full control of the workspace" },
    { value: "admin", label: "Admin", desc: "Manage users & settings" },
    { value: "editor", label: "Editor", desc: "Add and edit workforce data" },
    { value: "viewer", label: "Viewer", desc: "Read-only access" },
  ],
  healthcare: [
    { value: "owner", label: "Owner", desc: "Full control of the workspace" },
    { value: "admin", label: "Admin", desc: "Manage clinical team & settings" },
    { value: "clinical_editor", label: "Clinical Editor", desc: "Update staffing & bench records" },
    { value: "observer", label: "Observer", desc: "Read-only clinical access (no export)" },
  ],
  education: [
    { value: "owner", label: "Owner", desc: "Full control of the workspace" },
    { value: "admin", label: "Admin", desc: "Manage faculty & settings" },
    { value: "faculty_editor", label: "Faculty Editor", desc: "Update cohort & placement data" },
    { value: "viewer", label: "Viewer", desc: "Read-only academic access" },
  ],
};

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("professional");
  const [roles, setRoles] = useState<RoleOption[]>(ROLE_FALLBACK.professional);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Instant industry-specific fallback while (or if) the API call runs
    setRoles(ROLE_FALLBACK[industry] ?? ROLE_FALLBACK.professional);

    let cancelled = false;
    getPublicRoles(industry)
      .then((r) => {
        if (!cancelled && r.roles.length > 0) setRoles(r.roles);
      })
      .catch(() => {
        /* keep local fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [industry]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await publicRegister(username, email, password, orgName, industry);
      router.push("/admin/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
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
    fontSize: 11,
    fontWeight: 700 as const,
    color: "#a0aec0",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e8eaf6",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          padding: 40,
          borderRadius: 20,
          background: "#e8eaf6",
          boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "#fff",
              margin: "0 auto 16px",
              boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
            }}
          >
            ✏️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
            Create your workspace
          </h1>
          <p style={{ fontSize: 13, color: "#a0aec0" }}>Set up your organization and admin account</p>
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              minLength={2}
              placeholder="Acme Corp"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Industry</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  type="button"
                  onClick={() => setIndustry(ind.value)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: "none",
                    background: industry === ind.value ? "#6366f1" : "#e8eaf6",
                    color: industry === ind.value ? "#fff" : "#1e293b",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow:
                      industry === ind.value
                        ? "inset 2px 2px 6px rgba(0,0,0,.2)"
                        : "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
                    transition: "all .15s",
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#a0aec0", margin: "6px 0 0" }}>
              {INDUSTRIES.find((i) => i.value === industry)?.desc}
            </p>
          </div>

          {roles.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Team roles for this workspace</label>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(99,102,241,.06)",
                  boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff",
                }}
              >
                {roles.map((r) => (
                  <div key={r.value} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#6366f1",
                        background: "rgba(99,102,241,.12)",
                        padding: "3px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        flexShrink: 0,
                      }}
                    >
                      {r.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{r.desc}</span>
                  </div>
                ))}
                <p style={{ fontSize: 10, color: "#a0aec0", margin: "2px 0 0" }}>
                  You&apos;ll be the <strong>Owner</strong>. Invite the other roles after signup.
                </p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
              transition: "opacity .18s",
            }}
          >
            {loading ? "Creating workspace..." : "Create Workspace"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#a0aec0" }}>
          Already have an account?{" "}
          <Link href="/admin/login" style={{ color: "#6366f1", fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
