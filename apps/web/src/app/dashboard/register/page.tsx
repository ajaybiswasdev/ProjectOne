"use client";

import { useEffect, useState } from "react";
import type { Resource, FilterOptions } from "@/lib/api";
import { DownloadButton, registerExport } from "@/components/DownloadButton";

export default function RegisterPage() {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [hrbp, setHrbp] = useState("");
  const [leader, setLeader] = useState("");
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("all");
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const fetchData = (h?: string, l?: string) => {
    const p: Record<string, string> = {};
    if (h) p.hrbp = h;
    if (l) p.leader = l;
    const qs = new URLSearchParams(p).toString();
    const url = qs ? `?${qs}` : "";
    fetch(`${base}/api/v1/resources${url}`).then((r) => r.json()).then(setAllResources);
  };

  useEffect(() => {
    fetchData();
    fetch(`${base}/api/v1/filters`).then((r) => r.json()).then(setFilters);
  }, [base]);

  const applyFilter = (h: string, l: string) => { setHrbp(h); setLeader(l); fetchData(h, l); };
  const clearFilter = () => { setHrbp(""); setLeader(""); fetchData(); };
  const podCount = (hrbp || leader) ? `${allResources.length} of total` : "";

  const filtered = allResources.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.skill.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) ||
      r.level.toLowerCase().includes(q) || r.rmg_status.toLowerCase().includes(q);
    const matchChip = chip === "all" ||
      (chip === "critical91" && r.age_bucket === "91+ days") ||
      (chip === "watch" && r.age_bucket === "61-90 Days") ||
      (chip === "available" && r.status === "available") ||
      (chip === "ifb" && r.status === "ifb") ||
      (chip === "deployable" && r.deployable === "Deployable") ||
      (chip === "nondeployable" && r.deployable === "Non Deployable");
    return matchSearch && matchChip;
  });

  const chips = [
    { key: "all", label: `All (${allResources.length})` },
    { key: "critical91", label: "🔴 91+ Days" },
    { key: "watch", label: "🟠 61–90 Days" },
    { key: "available", label: "🟢 Available" },
    { key: "ifb", label: "🎯 IFB Pipeline" },
    { key: "deployable", label: "✅ Deployable" },
    { key: "nondeployable", label: "🚫 Non Deployable" },
  ];

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">Bench Register — All Resources</div>
        <div className="tab-actions">
          <div className="filter-bar">
            <label>🎯 HRBP</label>
            <select className="pod-select" value={hrbp} onChange={(e) => applyFilter(e.target.value, leader)}>
              <option value="">All HRBPs</option>
              {(filters?.hrbps ?? []).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <label>👤 Leader</label>
            <select className="pod-select" value={leader} onChange={(e) => applyFilter(hrbp, e.target.value)}>
              <option value="">All Leaders</option>
              {(filters?.leaders ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {(hrbp || leader) && <button className="clear-btn" onClick={clearFilter}>✕ Clear</button>}
            {podCount && <span className="filter-count">{podCount}</span>}
          </div>
          <DownloadButton resources={filtered} config={registerExport} />
        </div>
      </div>

      <div className="search-box">
        <span>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, skill, practice, location, designation…"
        />
      </div>

      <div className="filter-strip">
        {chips.map((c) => (
          <button
            key={c.key}
            className={`filter-chip ${chip === c.key ? "active" : ""}`}
            onClick={() => setChip(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
        Showing {filtered.length} of {allResources.length} resources
      </p>

      <div className="neo" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="neo-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Primary Skill</th>
                <th>Practice</th>
                <th>Location</th>
                <th>Days on Bench</th>
                <th>Exp</th>
                <th>Deployable</th>
                <th>RMG Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const riskClass = r.days_on_bench >= 91 ? "pill-red" : r.days_on_bench >= 61 ? "pill-yellow" : "pill-green";
                const riskLabel = r.days_on_bench >= 91 ? "Critical" : r.days_on_bench >= 61 ? "Watch" : "Safe";
                return (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.level}</td>
                    <td>{r.skill}</td>
                    <td>{r.department}</td>
                    <td>{r.location}</td>
                    <td><strong>{r.days_on_bench}</strong></td>
                    <td>{r.experience_bucket}</td>
                    <td><span className={`pill ${r.deployable === "Deployable" ? "pill-green" : "pill-red"}`}>{r.deployable}</span></td>
                    <td><span className={`pill ${riskClass}`}>{r.rmg_status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
