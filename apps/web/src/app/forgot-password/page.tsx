"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/adminApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setDevLink("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMsg(res.detail);
      if (res.dev_link) setDevLink(res.dev_link);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8eaf6", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 40, borderRadius: 20, background: "#e8eaf6", boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", margin: "0 auto 16px", boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff" }}>
            🔑
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Forgot password</h1>
          <p style={{ fontSize: 13, color: "#a0aec0" }}>Enter your email to request a reset link</p>
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "#e8eaf6", boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff", fontSize: 13, color: "#1e293b", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff" }}
          >
            {loading ? "Submitting..." : "Send reset link"}
          </button>
        </form>

        {devLink && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(99,102,241,.08)", fontSize: 12, wordBreak: "break-all" }}>
            <strong style={{ color: "#1e293b" }}>Dev reset link:</strong>{" "}
            <Link href={devLink} style={{ color: "#6366f1", fontWeight: 700 }}>
              {devLink}
            </Link>
          </div>
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
