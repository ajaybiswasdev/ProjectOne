"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem("admin_token", data.access_token);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
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
          maxWidth: 400,
          padding: 40,
          borderRadius: 20,
          background: "#e8eaf6",
          boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
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
            🔒
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: 13, color: "#a0aec0" }}>Sign in to continue</p>
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#e8eaf6",
                boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff",
                fontSize: 13,
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#e8eaf6",
                boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff",
                fontSize: 13,
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
