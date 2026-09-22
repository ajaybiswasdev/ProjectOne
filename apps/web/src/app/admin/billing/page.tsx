"use client";

import { useEffect, useState } from "react";
import { getPlanUsage, updatePlan, type PlanUsage } from "@/lib/adminApi";
import { getSessionUser } from "@/lib/session";

const PLAN_CARDS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["5 seats", "500 records", "120 req/min", "Core dashboards"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    features: ["25 seats", "25k records", "300 req/min", "Audit log + API keys", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    features: ["Unlimited-ish seats", "500k records", "600 req/min", "SSO-ready hooks", "Dedicated support"],
  },
];

export default function BillingPage() {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState("");
  const me = getSessionUser();
  const canManage = (me?.role === "owner" || me?.role === "admin") && (me?.permissions.includes("org:write") ?? false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsage(await getPlanUsage());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSwitch(plan: string) {
    if (plan === usage?.plan) return;
    setSwitching(plan);
    setError("");
    try {
      setUsage(await updatePlan(plan));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setSwitching("");
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#a0aec0" }}>Loading plan...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Billing &amp; Plan</h2>
        <p style={{ fontSize: 11, color: "#a0aec0" }}>
          Current usage and plan limits for your workspace
        </p>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(233,123,138,.15)", color: "#b5364a", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {usage && (
        <div className="neo" style={{ padding: 20, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Plan</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand-primary, #6366f1)" }}>{usage.plan_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Seats</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              {usage.users} / {usage.max_users}
            </div>
            <div style={{ fontSize: 10, color: usage.can_invite ? "#0a7a52" : "#b5364a" }}>
              {usage.seats_remaining} remaining
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Records</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              {usage.resources.toLocaleString()} / {usage.max_resources.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Rate limit</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{usage.rate_limit}/min</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {PLAN_CARDS.map((p) => {
          const current = usage?.plan === p.id;
          return (
            <div
              key={p.id}
              className="neo"
              style={{
                padding: 22,
                position: "relative",
                outline: current ? "2px solid var(--brand-primary, #6366f1)" : "none",
              }}
            >
              {current && (
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    fontSize: 10,
                    fontWeight: 800,
                    color: "var(--brand-primary, #6366f1)",
                    textTransform: "uppercase",
                  }}
                >
                  Current
                </span>
              )}
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>
                ${p.price}
                <span style={{ fontSize: 12, fontWeight: 600, color: "#a0aec0" }}>/mo</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gap: 8 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "#475569", display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--brand-accent, #10b981)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSwitch(p.id)}
                disabled={!canManage || current || !!switching}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: current ? "transparent" : "#6366f1",
                  color: current ? "#a0aec0" : "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !canManage || current || switching ? "not-allowed" : "pointer",
                  opacity: switching === p.id ? 0.6 : 1,
                  boxShadow: current ? "none" : "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
                  borderStyle: current ? "solid" : "none",
                  borderColor: current ? "#c5cbe0" : undefined,
                  borderWidth: current ? 1 : 0,
                }}
              >
                {switching === p.id ? "Switching..." : current ? "Active plan" : canManage ? `Switch to ${p.name}` : "Contact admin"}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "#a0aec0", marginTop: 20 }}>
        Payment provider integration is a billing hook — connect Stripe (or similar) here when you&apos;re ready to charge customers.
      </p>
    </div>
  );
}
