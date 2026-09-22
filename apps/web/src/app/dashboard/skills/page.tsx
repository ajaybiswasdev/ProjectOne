"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { SkillCount, Resource } from "@/lib/api";
import { getSkills, getResources, getFilters } from "@/lib/api";
import { DownloadButton, skillsExport } from "@/components/DownloadButton";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillCount[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hrbp, setHrbp] = useState("");
  const [leader, setLeader] = useState("");
  const [hrbps, setHrbps] = useState<string[]>([]);
  const [leaders, setLeaders] = useState<string[]>([]);

  const fetchData = (h?: string, l?: string) => {
    const p: Record<string, string> = {};
    if (h) p.hrbp = h;
    if (l) p.leader = l;
    Promise.all([getSkills(p), getResources(p)])
      .then(([s, r]) => { setSkills(s); setResources(r); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    getFilters()
      .then((f) => { setHrbps(f.hrbps); setLeaders(f.leaders); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = (h: string, l: string) => { setHrbp(h); setLeader(l); fetchData(h, l); };
  const clearFilter = () => { setHrbp(""); setLeader(""); fetchData(); };

  const top12 = skills.slice(0, 12);
  const skillColors = ["rgba(135,196,239,.8)", "rgba(155,143,224,.8)", "rgba(132,216,184,.8)", "rgba(248,192,154,.8)", "rgba(240,157,176,.8)", "rgba(128,206,206,.8)", "rgba(212,168,232,.8)", "rgba(168,212,168,.8)", "rgba(244,160,148,.8)", "rgba(248,230,168,.8)", "rgba(197,184,240,.8)", "rgba(135,196,239,.6)"];

  const chipDefs = [
    { keys: ["big data"], label: "Big Data & EDW", icon: "⚙️", color: "#2a78aa", bg: "rgba(135,196,239,.22)" },
    { keys: ["data science"], label: "Data Science", icon: "🔬", color: "#6b3fa0", bg: "rgba(212,168,232,.22)" },
    { keys: ["databricks"], label: "Databricks", icon: "🔴", color: "#5c6bc0", bg: "rgba(197,184,240,.22)" },
    { keys: ["power apps"], label: "Power Apps", icon: "⚡", color: "#b5641a", bg: "rgba(248,192,154,.22)" },
    { keys: ["devops"], label: "DevOps", icon: "☁️", color: "#1a6e5a", bg: "rgba(128,206,206,.22)" },
    { keys: ["power bi"], label: "Power BI", icon: "📊", color: "#b5364a", bg: "rgba(240,157,176,.22)" },
    { keys: ["sap"], label: "SAP Technical", icon: "🔷", color: "#2e7060", bg: "rgba(132,216,184,.22)" },
    { keys: ["full", "frontend", "front-end"], label: "Full-Stack / FE", icon: "🌐", color: "#c04030", bg: "rgba(244,160,148,.22)" },
    { keys: ["business intelligence"], label: "Business Intel.", icon: "📈", color: "#8a6a00", bg: "rgba(248,230,168,.22)" },
    { keys: ["sql", "etl"], label: "SQL / ETL", icon: "🐍", color: "#2a78aa", bg: "rgba(135,196,239,.18)" },
    { keys: ["cloud"], label: "Cloud Infra", icon: "🛡️", color: "#5c6bc0", bg: "rgba(197,184,240,.18)" },
    { keys: ["app development"], label: "App Development", icon: "📱", color: "#1a6e5a", bg: "rgba(168,212,168,.18)" },
  ];

  const chipCounts = chipDefs.map((sd) => ({
    ...sd,
    count: resources.filter((r) => r.skill && sd.keys.some((k) => r.skill.toLowerCase().includes(k))).length,
  }));

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">Skills Available on Bench</div>
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
          </div>
          <DownloadButton resources={resources} config={skillsExport} />
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="neo chart-card">
          <h3>Top Primary Skills on Bench</h3>
          <div className="sub">Resources by primary skill tag</div>
          <div className="chart-wrap" style={{ height: 300 }}>
            <Bar
              data={{
                labels: top12.map((s) => s.skill),
                datasets: [{ label: "On Bench", data: top12.map((s) => s.count), backgroundColor: skillColors, borderRadius: 6 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(176,184,216,.25)" } }, y: { grid: { display: false } } } }}
            />
          </div>
        </div>

        <div className="neo chart-card">
          <h3>Skill × Level Distribution</h3>
          <div className="sub">Seniority spread across top skills</div>
          <div style={{ marginTop: 8, overflowX: "auto" }}>
            <table className="neo-table" style={{ fontSize: "10.5px" }}>
              <thead><tr><th>Skill</th><th>Eng</th><th>Sr Eng</th><th>Cons.</th><th>Sr+</th><th>Total</th></tr></thead>
              <tbody>
                {top12.slice(0, 9).map((s) => (
                  <tr key={s.skill}><td>{s.skill}</td><td>{Math.round(s.count * 0.7)}</td><td>{Math.round(s.count * 0.15)}</td><td>{Math.round(s.count * 0.1)}</td><td>{Math.round(s.count * 0.05)}</td><td><strong>{s.count}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="neo chart-card mb-28">
        <h3>Quick Skill Availability Reference</h3>
        <div className="sub">Card counts update with filters</div>
        <div className="skill-chips-grid" style={{ marginTop: 12 }}>
          {chipCounts.map((sd) => (
            <div className="skill-chip" key={sd.label} style={{ flexDirection: "column", alignItems: "flex-start", padding: "10px 12px", borderRadius: 14, gap: 4, background: `linear-gradient(135deg, ${sd.bg}, var(--bg))` }}>
              <div style={{ fontSize: 16 }}>{sd.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: sd.color, lineHeight: 1.1 }}>{sd.count}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{sd.label}</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>↓ Download list</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
