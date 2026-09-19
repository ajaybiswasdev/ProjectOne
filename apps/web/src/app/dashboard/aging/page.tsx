"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { AgingDepartmentRow, AgingBucketSummary, Resource } from "@/lib/api";
import { DownloadButton, agingExport } from "@/components/DownloadButton";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BUCKETS = ["0-15 Days", "16-30 Days", "31-45 Days", "46-60 Days", "61-90 Days", "91+ days"];
const BUCKET_COLORS = ["rgba(132,216,184,.8)", "rgba(135,196,239,.8)", "rgba(248,192,154,.8)", "rgba(240,157,176,.8)", "rgba(197,184,240,.8)", "rgba(181,54,74,.7)"];
const BAR_GRADIENTS = ["linear-gradient(90deg,#84d8b8,#6ec8a8)", "linear-gradient(90deg,#87c4ef,#6ab4e0)", "linear-gradient(90deg,#f8c09a,#f0a878)", "linear-gradient(90deg,#f4a094,#e88070)", "linear-gradient(90deg,#f09db0,#e08090)", "linear-gradient(90deg,#f09db0,#e08090)"];
const LABEL_EMOJIS = ["🟢", "🔵", "🟣", "🟡", "🟠", "🔴"];
const LABEL_COLORS = ["#2e7d6e", "#2a78aa", "#5c6bc0", "#b5641a", "#c04030", "#b5364a"];
const RISK_COLORS: Record<string, string> = { High: "pill-red", Medium: "pill-yellow", Low: "pill-green" };

export default function AgingPage() {
  const [aging, setAging] = useState<AgingDepartmentRow[]>([]);
  const [agingSummary, setAgingSummary] = useState<AgingBucketSummary[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hrbp, setHrbp] = useState("");
  const [leader, setLeader] = useState("");
  const [hrbps, setHrbps] = useState<string[]>([]);
  const [leaders, setLeaders] = useState<string[]>([]);
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const fetchData = (h?: string, l?: string) => {
    const p: Record<string, string> = {};
    if (h) p.hrbp = h;
    if (l) p.leader = l;
    const qs = new URLSearchParams(p).toString();
    const url = qs ? `?${qs}` : "";
    Promise.all([
      fetch(`${base}/api/v1/aging${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/aging/summary${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/resources${url}`).then((r) => r.json()),
    ]).then(([a, s, res]) => { setAging(a); setAgingSummary(s); setResources(res); });
  };

  useEffect(() => {
    fetchData();
    fetch(`${base}/api/v1/filters`).then((r) => r.json()).then((f) => { setHrbps(f.hrbps); setLeaders(f.leaders); });
  }, [base]);

  const applyFilter = (h: string, l: string) => { setHrbp(h); setLeader(l); fetchData(h, l); };
  const clearFilter = () => { setHrbp(""); setLeader(""); fetchData(); };
  const countText = (hrbp || leader) ? `${resources.length} of total` : "";

  const total = agingSummary.reduce((s, a) => s + a.count, 0);
  const critical = agingSummary.find((a) => a.bucket === "91+ days")?.count ?? 0;
  const watch = agingSummary.find((a) => a.bucket === "61-90 Days")?.count ?? 0;

  const bucketLabels = ["0–15d", "16–30d", "31–45d", "46–60d", "61–90d", "91+ d"];

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">Aging Analysis — Detailed Breakdown</div>
        <div className="tab-actions">
          <div className="filter-bar">
            <label>🎯 HRBP</label>
            <select className="pod-select" value={hrbp} onChange={(e) => applyFilter(e.target.value, leader)}>
              <option value="">All HRBPs</option>
              {hrbps.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <label>👤 Leader</label>
            <select className="pod-select" value={leader} onChange={(e) => applyFilter(hrbp, e.target.value)}>
              <option value="">All Leaders</option>
              {leaders.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {(hrbp || leader) && <button className="clear-btn" onClick={clearFilter}>✕ Clear</button>}
            {countText && <span className="filter-count">{countText}</span>}
          </div>
          <DownloadButton resources={resources} config={agingExport} />
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="neo chart-card">
          <h3>Aging Distribution by Practice</h3>
          <div className="sub">Stacked bench age buckets per practice</div>
          <div className="chart-wrap" style={{ height: 280 }}>
            <Bar
              data={{
                labels: aging.map((a) => a.department),
                datasets: BUCKETS.map((b, i) => ({
                  label: bucketLabels[i],
                  data: aging.map((a) => a.buckets[b] ?? 0),
                  backgroundColor: BUCKET_COLORS[i],
                  borderRadius: 4,
                })),
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#718096", font: { size: 10 }, boxWidth: 10 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: "rgba(176,184,216,.25)" } } } }}
            />
          </div>
        </div>

        <div className="neo chart-card">
          <h3>Aging Bucket Summary</h3>
          <div className="sub">All bench resources by age</div>
          <div style={{ marginTop: 8 }}>
            {agingSummary.map((a, i) => (
              <div className="aging-row" key={a.bucket}>
                <span className="aging-label" style={{ color: LABEL_COLORS[i] || "#718096" }}>{LABEL_EMOJIS[i]} {bucketLabels[i]}</span>
                <div className="aging-bar-wrap">
                  <div className="aging-bar" style={{ width: `${total ? Math.round((a.count / total) * 100) : 0}%`, background: BAR_GRADIENTS[i] }}>{a.count}</div>
                </div>
                <span className="aging-count" style={{ color: LABEL_COLORS[i] || "#718096" }}>{a.count}</span>
              </div>
            ))}
          </div>
          <div className="neo-inset" style={{ marginTop: 18, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Bench</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--primary-dark)" }}>{total}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Critical Aged (&gt;91d)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#b5364a" }}>{critical}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Watch Zone (61–90d)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#c04030" }}>{watch}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="neo chart-card mb-28">
        <h3>Aging Heatmap — Practice × Bucket</h3>
        <div className="sub">Bench aging intensity across all practices</div>
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table className="neo-table">
            <thead>
              <tr>
                <th>Practice</th><th>Total</th>
                <th style={{ color: "#2e7d6e" }}>0–15d</th>
                <th style={{ color: "#2a78aa" }}>16–30d</th>
                <th style={{ color: "#5c6bc0" }}>31–45d</th>
                <th style={{ color: "#b5641a" }}>46–60d</th>
                <th style={{ color: "#c04030" }}>61–90d</th>
                <th style={{ color: "#b5364a" }}>91+ d</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((a) => (
                <tr key={a.department}>
                  <td>{a.department}</td>
                  <td><strong>{a.total}</strong></td>
                  {BUCKETS.map((b) => <td key={b}>{a.buckets[b] ?? 0}</td>)}
                  <td><span className={`pill ${RISK_COLORS[a.risk]}`}>{a.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
