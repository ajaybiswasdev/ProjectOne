"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/adminApi";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Missing reset token. Request a new link.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      setMsg(res.detail);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8eaf6", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 40, borderRadius: 20, background: "#e8eaf6", boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", margin: "0 auto 16px", boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff" }}>
            🛡️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Set new password</h1>
          <p style={{ fontSize: 13, color: "#a0aec0" }}>Choose a strong password for your account</p>
        </div>

        {error && (
          <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(233,123,138,.15)", color: "#b5364a", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {msg && (
          <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(16,185,129,.15)", color: "#0a7a52", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            {msg}
          </div>
        )}

        {!done && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "#e8eaf6", boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff", fontSize: 13, color: "#1e293b", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "#e8eaf6", boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff", fontSize: 13, color: "#1e293b", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff" }}
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {done && (
          <Link
            href="/admin/login"
            style={{ display: "block", textAlign: "center", width: "100%", padding: "12px 0", borderRadius: 10, background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff" }}
          >
            Go to sign in
          </Link>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#a0aec0" }}>
          <Link href="/admin/login" style={{ color: "#6366f1", fontWeight: 700 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0" }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
