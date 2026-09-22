"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPublicRoles,
  publicRegister,
  type RegisterInviteLink,
  type RegisterTeammate,
  type RoleOption,
} from "@/lib/adminApi";

const INDUSTRIES = [
  { value: "professional", label: "Professional Services", desc: "Consulting, staffing, workforce" },
  { value: "healthcare", label: "Healthcare", desc: "Hospitals, clinics, care teams" },
  { value: "education", label: "Education", desc: "Schools, universities, cohorts" },
];

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

type TeamRow = { email: string; role: string };

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("professional");
  const [roles, setRoles] = useState<RoleOption[]>(ROLE_FALLBACK.professional);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [teammates, setTeammates] = useState<TeamRow[]>([]);
  const [inviteLinks, setInviteLinks] = useState<RegisterInviteLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectableRoles = roles.filter((r) => r.value !== "owner");

  useEffect(() => {
    const catalog = ROLE_FALLBACK[industry] ?? ROLE_FALLBACK.professional;
    setRoles(catalog);
    const firstSelectable = catalog.find((r) => r.value !== "owner")?.value ?? "viewer";
    setTeammates((prev) =>
      prev.map((row) => {
        const stillValid = catalog.some((r) => r.value === row.role && r.value !== "owner");
        return stillValid ? row : { ...row, role: firstSelectable };
      }),
    );

    let cancelled = false;
    getPublicRoles(industry)
      .then((r) => {
        if (!cancelled && r.roles.length > 0) {
          setRoles(r.roles);
          const fb = r.roles.find((ro) => ro.value !== "owner")?.value ?? "viewer";
          setTeammates((prev) =>
            prev.map((row) => {
              const stillValid = r.roles.some((ro) => ro.value === row.role && ro.value !== "owner");
              return stillValid ? row : { ...row, role: fb };
            }),
          );
        }
      })
      .catch(() => {
        /* keep local fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [industry]);

  function addTeammate() {
    if (teammates.length >= 5) return;
    const defaultRole = selectableRoles[0]?.value ?? "viewer";
    setTeammates((prev) => [...prev, { email: "", role: defaultRole }]);
  }

  function updateTeammate(index: number, patch: Partial<TeamRow>) {
    setTeammates((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeTeammate(index: number) {
    setTeammates((prev) => prev.filter((_, i) => i !== index));
  }

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
    const filled = teammates.filter((t) => t.email.trim());
    if (filled.some((t) => !t.role)) {
      setError("Pick a role for each teammate");
      return;
    }
    if (new Set(filled.map((t) => t.email.toLowerCase())).size !== filled.length) {
      setError("Teammate emails must be unique");
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterTeammate[] = filled.map((t) => ({
        email: t.email.trim(),
        role: t.role,
      }));
      const result = await publicRegister(username, email, password, orgName, industry, payload);
      if (result.invites?.length) {
        setInviteLinks(result.invites);
        setLoading(false);
        return;
      }
      router.push("/admin/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Invite link copied");
    } catch {
      prompt("Copy invite link:", text);
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

  if (inviteLinks.length > 0) {
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
            maxWidth: 520,
            padding: 40,
            borderRadius: 20,
            background: "#e8eaf6",
            boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "#fff",
                margin: "0 auto 16px",
                boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
              }}
            >
              ✅
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
              Workspace created
            </h1>
            <p style={{ fontSize: 13, color: "#a0aec0" }}>
              Copy these invite links and send them to your teammates
            </p>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            {inviteLinks.map((inv) => (
              <div
                key={inv.email + inv.role}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(99,102,241,.06)",
                  boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13, color: "#1e293b" }}>{inv.email}</strong>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#6366f1",
                      background: "rgba(99,102,241,.12)",
                      padding: "3px 8px",
                      borderRadius: 999,
                      textTransform: "uppercase",
                    }}
                  >
                    {selectableRoles.find((r) => r.value === inv.role)?.label ?? inv.role}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    wordBreak: "break-all",
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {inv.link}
                </div>
                <button
                  type="button"
                  onClick={() => copyText(inv.link)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#6366f1",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
                  }}
                >
                  Copy link
                </button>
              </div>
            ))}
          </div>

          <Link
            href="/admin/login"
            style={{
              display: "block",
              textAlign: "center",
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
            }}
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          maxWidth: 480,
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

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Your role</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(99,102,241,.08)",
                boxShadow: "inset 2px 2px 6px #b0b8d8, inset -2px -2px 6px #ffffff",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#6366f1",
                  background: "rgba(99,102,241,.14)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Owner
              </span>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Full control — set when the workspace is created
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Invite teammates</label>
              <button
                type="button"
                onClick={addTeammate}
                disabled={teammates.length >= 5}
                style={{
                  border: "none",
                  background: "transparent",
                  color: teammates.length >= 5 ? "#a0aec0" : "#6366f1",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: teammates.length >= 5 ? "not-allowed" : "pointer",
                  padding: 0,
                }}
              >
                + Add
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#a0aec0", margin: "0 0 8px" }}>
              Optional — pick a role and email; we&apos;ll generate invite links after signup.
            </p>

            {teammates.length === 0 && (
              <button
                type="button"
                onClick={addTeammate}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "1px dashed #b0b8d8",
                  background: "transparent",
                  color: "#6366f1",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add teammate with a role
              </button>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {teammates.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateTeammate(i, { email: e.target.value })}
                    placeholder="teammate@company.com"
                    required
                    style={{ ...inputStyle, padding: "10px 12px", fontSize: 12 }}
                  />
                  <select
                    value={row.role}
                    onChange={(e) => updateTeammate(i, { role: e.target.value })}
                    style={{
                      ...inputStyle,
                      padding: "10px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      width: "auto",
                      minWidth: 120,
                      cursor: "pointer",
                    }}
                  >
                    {selectableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTeammate(i)}
                    aria-label="Remove teammate"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#e97b8a",
                      fontSize: 16,
                      cursor: "pointer",
                      padding: "0 4px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

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
