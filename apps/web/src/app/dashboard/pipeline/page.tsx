"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import type { PipelineSummary, Resource } from "@/lib/api";
import { DownloadButton, pipelineExport } from "@/components/DownloadButton";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AVATAR_COLORS = ["linear-gradient(135deg,#9b8fe0,#b8aee8)", "linear-gradient(135deg,#84d8b8,#6ec8a8)", "linear-gradient(135deg,#87c4ef,#6ab4e0)", "linear-gradient(135deg,#f09db0,#e88090)", "linear-gradient(135deg,#d4a8e8,#c08eda)", "linear-gradient(135deg,#f8c09a,#f0a878)"];
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function ageColor(d: number) {
  if (d >= 91) return "#b5364a";
  if (d >= 61) return "#c04030";
  if (d >= 46) return "#b5641a";
  if (d >= 16) return "#2a78aa";
  return "#2e7d6e";
}

function PipelineItem({ r, i }: { r: Resource; i: number }) {
  return (
    <div className="pipeline-item">
      <div className="ro-avatar" style={{ background: AVATAR_COLORS[i % 6] }}>{initials(r.name)}</div>
      <div>
        <div className="ro-name">{r.name}</div>
        <div className="ro-meta">{r.skill || r.department} · {r.location}</div>
      </div>
      <div className="ro-days">
        <div className="d-num" style={{ color: ageColor(r.days_on_bench) }}>{r.days_on_bench}</div>
        <div className="d-lbl">days on bench</div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
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
      fetch(`${base}/api/v1/pipeline${url}`).then((r) => r.json()),
      fetch(`${base}/api/v1/resources${url}`).then((r) => r.json()),
    ]).then(([p, r]) => { setPipeline(p); setResources(r); });
  };

  useEffect(() => {
    fetchData();
    fetch(`${base}/api/v1/filters`).then((r) => r.json()).then((f) => { setHrbps(f.hrbps); setLeaders(f.leaders); });
  }, [base]);

  const applyFilter = (h: string, l: string) => { setHrbp(h); setLeader(l); fetchData(h, l); };
  const clearFilter = () => { setHrbp(""); setLeader(""); fetchData(); };

  if (!pipeline) return <div style={{ padding: 40 }}>Loading…</div>;

  const ifbResources = resources.filter((r) => r.status === "ifb");
  const selected = ifbResources.filter((r) => r.rmg_status === "IFB-Selected");
  const reserved = ifbResources.filter((r) => r.rmg_status === "IFB-Reserved" || r.rmg_status === "Available-Pipeline Planned");
  const deptColors = ["#87c4ef", "#9b8fe0", "#84d8b8", "#80cece", "#d4a8e8", "#f8c09a"];

  const kpis = [
    { value: pipeline.ifb_selected, label: "IFB-Selected", sub: "Shortlisted by client", gradient: "rgba(212,168,232,.15)" },
    { value: pipeline.ifb_reserved, label: "IFB-Reserved", sub: "Reserved for deployment", gradient: "rgba(248,192,154,.15)" },
    { value: pipeline.pipeline_planned, label: "Pipeline Planned", sub: "Opportunities lined up", gradient: "rgba(135,196,239,.15)" },
    { value: pipeline.ifb_shadow, label: "IFB-Shadow", sub: "Shadowing placement", gradient: "rgba(160,174,192,.1)" },
  ];

  return (
    <>
      <div className="tab-header-row">
        <div className="section-label">IFB Pipeline — Resources in Interview / Deployment Process</div>
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
          <DownloadButton resources={resources} config={pipelineExport} />
        </div>
      </div>

      <div className="grid-4 mb-20">
        {kpis.map((k) => (
          <div className="neo kpi-card" key={k.label} style={{ padding: "16px 20px", background: `linear-gradient(145deg, ${k.gradient}, var(--bg))` }}>
            <div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-20">
        <div className="neo chart-card">
          <h3>IFB-Selected ({selected.length}) — Top Candidates</h3>
          <div className="sub">Shortlisted by clients, awaiting final deployment</div>
          <div className="pipeline-list" style={{ marginTop: 8 }}>
            {selected.length === 0 && <p className="empty-state">No resources match filter</p>}
            {selected.map((r, i) => <PipelineItem key={r.id} r={r} i={i} />)}
          </div>
        </div>
        <div className="neo chart-card">
          <h3>IFB-Reserved + Pipeline Planned ({reserved.length})</h3>
          <div className="sub">Reserved or planned for upcoming engagements</div>
          <div className="pipeline-list" style={{ marginTop: 8 }}>
            {reserved.length === 0 && <p className="empty-state">No resources match filter</p>}
            {reserved.map((r, i) => <PipelineItem key={r.id} r={r} i={i} />)}
          </div>
        </div>
      </div>

      <div className="neo chart-card mb-28">
        <h3>IFB Pipeline by Practice</h3>
        <div className="sub">Distribution of pipeline resources across practices</div>
        <div className="chart-wrap" style={{ height: 220 }}>
          <Bar
            data={{
              labels: Object.keys(pipeline.by_department),
              datasets: [{ label: "IFB Resources", data: Object.values(pipeline.by_department), backgroundColor: deptColors, borderRadius: 6 }],
            }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(176,184,216,.25)" } } } }}
          />
        </div>
      </div>
    </>
  );
}
