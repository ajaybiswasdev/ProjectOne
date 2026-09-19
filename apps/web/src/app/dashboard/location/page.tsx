"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import type { LocationCount, ExperienceBucket, DesignationCount, Summary, Resource } from "@/lib/api";
import { DownloadButton, locationExport } from "@/components/DownloadButton";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const LOC_COLORS = ["linear-gradient(90deg,#9b8fe0,#b8aee8)", "linear-gradient(90deg,#87c4ef,#6ab4e0)", "linear-gradient(90deg,#84d8b8,#6ec8a8)", "linear-gradient(90deg,#f8c09a,#f0a878)", "linear-gradient(90deg,#d4a8e8,#c08eda)", "linear-gradient(90deg,#f09db0,#e88090)", "linear-gradient(90deg,#80cece,#60aeae)"];
const EXP_COLORS = ["rgba(135,196,239,.85)", "rgba(155,143,224,.85)", "rgba(132,216,184,.85)", "rgba(248,192,154,.85)", "rgba(240,157,176,.85)", "rgba(212,168,232,.85)", "rgba(128,206,206,.85)"];
const DESIG_COLORS = ["#87c4ef", "#9b8fe0", "#84d8b8", "#f8c09a", "#f09db0", "#c5b8f0"];

export default function LocationPage() {
  const [locations, setLocations] = useState<LocationCount[]>([]);
  const [experience, setExperience] = useState<ExperienceBucket[]>([]);
  const [designations, setDesignations] = useState<DesignationCount[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
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
      fetch(`${base}/api/v1/locations${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/experience${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/designations${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/summary${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/resources${url}`).then((r) => r.json()),
    ]).then(([loc, exp, des, sum, res]) => { setLocations(loc); setExperience(exp); setDesignations(des); setSummary(sum); setResources(res); });
  };

  useEffect(() => {
    fetchData();
    fetch(`${base}/api/v1/filters`).then((r) => r.json()).then((f) => { setHrbps(f.hrbps); setLeaders(f.leaders); });
  }, [base]);

  const applyFilter = (h: string, l: string) => { setHrbp(h); setLeader(l); fetchData(h, l); };
  const clearFilter = () => { setHrbp(""); setLeader(""); fetchData(); };

  const maxLoc = Math.max(...locations.map((l) => l.count), 1);

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">Location &amp; Experience Analytics</div>
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
          <DownloadButton resources={resources} config={locationExport} />
        </div>
      </div>

      <div className="content-grid mb-20">
        <div className="neo chart-card">
          <h3>Bench by Location</h3>
          <div className="sub">Headcount distribution across offices</div>
          <div style={{ marginTop: 8 }}>
            {locations.map((loc, i) => (
              <div className="loc-bar-row" key={loc.location}>
                <span className="loc-name">📍 {loc.location}</span>
                <div className="loc-bar-wrap">
                  <div className="loc-bar" style={{ width: `${Math.round((loc.count / maxLoc) * 100)}%`, background: LOC_COLORS[i % LOC_COLORS.length] }}>{loc.count}</div>
                </div>
                <span className="loc-count">{loc.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="neo chart-card">
          <h3>Experience Bucket Distribution</h3>
          <div className="sub">Bench resources by years of experience</div>
          <div className="chart-wrap" style={{ height: 260 }}>
            <Bar
              data={{
                labels: experience.map((e) => e.bucket),
                datasets: [{ label: "Resources", data: experience.map((e) => e.count), backgroundColor: EXP_COLORS, borderRadius: 8 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(176,184,216,.25)" } } } }}
            />
          </div>
        </div>
      </div>

      <div className="content-grid mb-28">
        <div className="neo chart-card">
          <h3>Designation Mix</h3>
          <div className="sub">Seniority breakdown of all bench resources</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: designations.map((d) => d.level),
                datasets: [{ data: designations.map((d) => d.count), backgroundColor: DESIG_COLORS, borderWidth: 2, hoverOffset: 6 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom", labels: { color: "#718096", font: { size: 10 }, boxWidth: 10, padding: 8 } } } }}
            />
          </div>
        </div>

        {summary && (
          <div className="neo chart-card">
            <h3>Summary Statistics</h3>
            <div className="sub">Key bench analytics — 1 Sep 2026</div>
            <div style={{ marginTop: 12 }}>
              <div className="stat-row"><span className="stat-key">Total Bench</span><span className="stat-val">{summary.total}</span></div>
              <div className="stat-row"><span className="stat-key">Deployable</span><span className="stat-val" style={{ color: "#2e7d6e" }}>{summary.deployable} ({Math.round((summary.deployable / summary.total) * 100)}%)</span></div>
              <div className="stat-row"><span className="stat-key">Non Deployable</span><span className="stat-val" style={{ color: "#b5364a" }}>{summary.non_deployable}</span></div>
              <div className="stat-row"><span className="stat-key">Avg Days on Bench</span><span className="stat-val">{summary.average_days_on_bench} days</span></div>
              <div className="stat-row"><span className="stat-key">Critical (&gt;91 days)</span><span className="stat-val" style={{ color: "#b5364a" }}>{summary.critical_91_plus}</span></div>
              <div className="stat-row"><span className="stat-key">In IFB Pipeline</span><span className="stat-val" style={{ color: "#6b3fa0" }}>{summary.ifb_pipeline}</span></div>
              <div className="stat-row"><span className="stat-key">Available (Open)</span><span className="stat-val" style={{ color: "#2e7d6e" }}>{summary.available}</span></div>
              <div className="stat-row"><span className="stat-key">Largest Practice (Bench)</span><span className="stat-val">{Object.entries(summary.by_department).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}</span></div>
              <div className="stat-row"><span className="stat-key">Largest Location</span><span className="stat-val">{Object.entries(summary.by_location).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}</span></div>
              <div className="stat-row"><span className="stat-key">Dominant Experience</span><span className="stat-val">{experience.sort((a, b) => b.count - a.count)[0]?.bucket ?? "—"}</span></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
