"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { getSummary, getResources } from "@/lib/api";
import type { Summary, Resource } from "@/lib/api";
import { DownloadButton, overviewExport } from "@/components/DownloadButton";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DEPT_COLORS = ["#87c4ef", "#9b8fe0", "#84d8b8", "#80cece", "#d4a8e8", "#f8c09a", "#f09db0", "#f4a094"];
const AGE_COLORS = ["rgba(132,216,184,.8)", "rgba(135,196,239,.8)", "rgba(248,192,154,.8)", "rgba(240,157,176,.8)", "rgba(197,184,240,.8)", "rgba(181,54,74,.8)"];
const AGE_KEYS = ["0-15 Days", "16-30 Days", "31-45 Days", "46-60 Days", "61-90 Days", "91+ days"];

export default function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSummary(), getResources()])
      .then(([s, r]) => { setSummary(s); setResources(r); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#d14343", fontWeight: 700 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "#1B3A8A", color: "#fff", cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  if (loading || !summary) return <div style={{ padding: 40, textAlign: "center", color: "#718096" }}>Loading…</div>;

  const availableOpen = resources.filter((r) => r.status === "available").length;
  const upskilling = resources.filter((r) => r.rmg_status === "Available-Upskilling").length;
  const proposed = resources.filter((r) => r.rmg_status === "Proposed").length;

  const kpis = [
    { icon: "🏖️", value: summary.total, label: "Total on Bench", sub: "Current date", gradient: "rgba(197,184,240,.18)", iconBg: "linear-gradient(135deg,rgba(197,184,240,.55),rgba(167,154,220,.35))" },
    { icon: "⏱", value: `${summary.average_days_on_bench}d`, label: "Avg Bench Duration", sub: "Average days", gradient: "rgba(248,192,154,.18)", iconBg: "linear-gradient(135deg,rgba(248,192,154,.55),rgba(228,162,124,.35))" },
    { icon: "✅", value: summary.deployable, label: "Deployable", sub: `${Math.round((summary.deployable / summary.total) * 100)}% of bench`, gradient: "rgba(132,216,184,.18)", iconBg: "linear-gradient(135deg,rgba(132,216,184,.55),rgba(100,186,154,.35))" },
    { icon: "🚨", value: summary.critical_91_plus, label: "Critical Aged", sub: ">91 days — Act now", gradient: "rgba(240,157,176,.18)", iconBg: "linear-gradient(135deg,rgba(240,157,176,.55),rgba(210,127,146,.35))" },
    { icon: "🎯", value: summary.ifb_pipeline, label: "IFB / Interview", sub: "In deployment pipeline", gradient: "rgba(212,168,232,.18)", iconBg: "linear-gradient(135deg,rgba(212,168,232,.55),rgba(182,138,202,.35))" },
    { icon: "🟢", value: availableOpen, label: "Available (Open)", sub: `${Math.round((availableOpen / summary.total) * 100)}% of bench`, gradient: "rgba(135,196,239,.18)", iconBg: "linear-gradient(135deg,rgba(135,196,239,.5),rgba(105,166,209,.3))" },
    { icon: "📚", value: upskilling, label: "Upskilling", sub: "Active L&D", gradient: "rgba(168,212,168,.18)", iconBg: "linear-gradient(135deg,rgba(168,212,168,.5),rgba(138,192,138,.3))" },
    { icon: "📋", value: proposed, label: "Proposed", sub: "Submitted to client", gradient: "rgba(248,230,168,.18)", iconBg: "linear-gradient(135deg,rgba(248,230,168,.5),rgba(218,200,138,.3))" },
    { icon: "🔴", value: summary.non_deployable, label: "Non Deployable", sub: `${Math.round((summary.non_deployable / summary.total) * 100)}% of bench`, gradient: "rgba(244,160,148,.18)", iconBg: "linear-gradient(135deg,rgba(244,160,148,.5),rgba(214,130,118,.3))" },
  ];

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">Bench Overview — 1 Sep 2026</div>
        <DownloadButton resources={resources} config={overviewExport} />
      </div>

      <div className="kpi-grid" role="list" aria-label="Key performance indicators">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label} style={{ background: `linear-gradient(145deg, ${k.gradient}, var(--bg))` }} role="listitem" aria-label={`${k.label}: ${k.value}`}>
            <div className="kpi-icon" style={{ background: k.iconBg }}>{k.icon}</div>
            <div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3 mb-28">
        <div className="neo chart-card">
          <h3>Bench by Practice</h3>
          <div className="sub">Headcount distribution ({summary.total} total)</div>
          <div className="chart-wrap" style={{ height: 145 }}>
            <Doughnut
              data={{
                labels: Object.keys(summary.by_department),
                datasets: [{ data: Object.values(summary.by_department), backgroundColor: DEPT_COLORS, borderWidth: 0, hoverOffset: 8 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "right", labels: { color: "#718096", font: { size: 10 }, boxWidth: 10 } } } }}
            />
          </div>
        </div>
        <div className="neo chart-card">
          <h3>Bench Aging Snapshot</h3>
          <div className="sub">Resources by days on bench</div>
          <div className="chart-wrap" style={{ height: 145 }}>
            <Bar
              data={{
                labels: ["0–15d", "16–30d", "31–45d", "46–60d", "61–90d", "91+d"],
                datasets: [{ data: AGE_KEYS.map((b) => summary.by_age_bucket[b] ?? 0), backgroundColor: AGE_COLORS, borderRadius: 8 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#718096", font: { size: 10 } } }, y: { grid: { color: "rgba(176,184,216,.25)" }, ticks: { color: "#718096", font: { size: 10 } } } } }}
            />
          </div>
        </div>
        <div className="neo chart-card">
          <h3>Bench Status Breakdown</h3>
          <div className="sub">Current status of all {summary.total} resources</div>
          <div style={{ height: 145, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 120, height: 120, position: "relative" }}>
              <Doughnut
                data={{
                  labels: ["Deployable", "Non Deployable"],
                  datasets: [{ data: [summary.deployable, summary.non_deployable], backgroundColor: ["#84d8b8", "#f09db0"], borderWidth: 0, hoverOffset: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }}
              />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{summary.total}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>Total</div>
              </div>
            </div>
            <div style={{ marginLeft: 12 }}>
              <div style={{ marginBottom: 5 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#84d8b8" }} /><span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Deployable</span></div><div style={{ fontSize: 13, fontWeight: 800, color: "#2e7d6e" }}>{summary.deployable}</div></div>
              <div><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#f09db0" }} /><span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Non Deployable</span></div><div style={{ fontSize: 13, fontWeight: 800, color: "#b5364a" }}>{summary.non_deployable}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="neo chart-card mb-28">
        <h3>Resource Source Flow</h3>
        <div className="sub">Resource distribution by source — {summary.total} total headcount</div>

        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".6px", color: "var(--text-muted)", textTransform: "uppercase", margin: "10px 0 6px 4px" }}>Deployment Track — where each bench resource sits today</div>
        <div style={{ display: "flex", alignItems: "center", position: "relative", padding: "4px 0" }}>
          <div style={{ position: "absolute", top: 37, left: "calc(6% + 30px)", right: "calc(6% + 30px)", height: 3, background: "linear-gradient(90deg,var(--p-sky),var(--p-lavender),var(--p-peach),var(--p-cream),var(--p-mint))", borderRadius: 2, opacity: .5, zIndex: 0 }} />

          {[
            { n: 2, label: "New Joiner", sub: "1% of bench", clr: "#2a78aa", bg: "rgba(135,196,239,.38)", tag: "Entry" },
            { n: 133, label: "Available", sub: "56% of bench", clr: "#5c6bc0", bg: "rgba(197,184,240,.4)", tag: "Ready" },
            { n: 40, label: "Upskilling / Pending", sub: "17% of bench", clr: "#b5641a", bg: "rgba(248,192,154,.38)", tag: "Building" },
            { n: 16, label: "Proposed", sub: "7% of bench", clr: "#8a6a00", bg: "rgba(248,230,168,.45)", tag: "Active" },
            { n: summary.ifb_pipeline, label: "IFB Pipeline", sub: "12% of bench", clr: "#1a6040", bg: "rgba(132,216,184,.45)", tag: "Selecting", accent: true },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", flex: 1, zIndex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(145deg, ${item.bg}, var(--bg))`, boxShadow: "4px 4px 11px var(--shadow-dark), -4px -4px 11px var(--shadow-light)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...(item.accent ? { boxShadow: "inset 2px 2px 6px rgba(80,160,120,.25), 4px 4px 11px var(--shadow-dark), -4px -4px 11px var(--shadow-light)" } : {}) }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: item.clr, lineHeight: 1 }}>{item.n}</div>
                  <div style={{ fontSize: 7.5, color: "var(--text-muted)", fontWeight: 600, marginTop: 1 }}>{item.tag}</div>
                </div>
                <div style={{ marginTop: 7, textAlign: "center" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: "0 0 auto", zIndex: 1, marginBottom: 26 }}>
                  <svg width="16" height="12" viewBox="0 0 18 14" fill="none"><path d="M0 7h14M10 2l6 5-6 5" stroke="#b0b8d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".6px", color: "var(--text-muted)", textTransform: "uppercase", margin: "12px 0 7px 4px" }}>Non-Deployable Pool</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)", background: "linear-gradient(145deg, rgba(168,212,168,.16), var(--bg))" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(145deg, rgba(168,212,168,.4), rgba(138,192,138,.2))", boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#2e6040", lineHeight: 1 }}>14</div>
              <div style={{ fontSize: 7, color: "var(--text-muted)", fontWeight: 600, marginTop: 1 }}>100% ND</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)" }}>Internal / Extended</div>
              <div style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2 }}>Internal assignment, long leave, resignation &amp; extensions</div>
              <div style={{ marginTop: 6, height: 5, borderRadius: 3, boxShadow: "inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)", overflow: "hidden" }}><div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, var(--p-sage), var(--p-teal))", borderRadius: 3 }} /></div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)", background: "linear-gradient(145deg, rgba(128,206,206,.16), var(--bg))" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(145deg, rgba(128,206,206,.4), rgba(98,176,176,.2))", boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a5858", lineHeight: 1 }}>5</div>
              <div style={{ fontSize: 7, color: "var(--text-muted)", fontWeight: 600, marginTop: 1 }}>100% ND</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)" }}>Billed / Delivery Support</div>
              <div style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2 }}>Billed engagements &amp; delivery overhead roles</div>
              <div style={{ marginTop: 6, height: 5, borderRadius: 3, boxShadow: "inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)", overflow: "hidden" }}><div style={{ height: "100%", width: "36%", background: "linear-gradient(90deg, var(--p-teal), var(--p-sky))", borderRadius: 3 }} /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
