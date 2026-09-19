"use client";

import type { Resource } from "@/lib/api";

type ExportConfig = {
  label: string;
  filename: string;
  getRows: (resources: Resource[]) => Record<string, unknown>[];
};

export function DownloadButton({ resources, config }: { resources: Resource[]; config: ExportConfig }) {
  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = config.getRows(resources);
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const cols = Object.keys(rows[0]).map((k) => ({
      wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2,
    }));
    ws["!cols"] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.label.substring(0, 31));
    XLSX.writeFile(wb, config.filename);
  };

  return (
    <button className="dl-btn" onClick={handleExport}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download Excel
    </button>
  );
}

export const overviewExport = {
  label: "Overview_Summary",
  filename: "Bench_Overview.xlsx",
  getRows: (resources: Resource[]) => {
    const total = resources.length;
    const deployable = resources.filter((r) => r.deployable === "Deployable").length;
    return [
      { Metric: "Total on Bench", Value: total },
      { Metric: "Deployable", Value: deployable },
      { Metric: "Non Deployable", Value: total - deployable },
      { Metric: "Available (Open)", Value: resources.filter((r) => r.status === "available").length },
      { Metric: "In IFB Pipeline", Value: resources.filter((r) => r.status === "ifb").length },
      { Metric: "Critical Aged 91+d", Value: resources.filter((r) => r.age_bucket === "91+ days").length },
      { Metric: "Avg Bench Duration", Value: Math.round(resources.reduce((s, r) => s + r.days_on_bench, 0) / (total || 1)) },
    ];
  },
};

export const registerExport = {
  label: "Bench_Register",
  filename: "Bench_Register.xlsx",
  getRows: (resources: Resource[]) =>
    resources.map((r) => ({
      EID: r.employee_id, Name: r.name, Designation: r.level,
      "Primary Skill": r.skill, Practice: r.department, Location: r.location,
      "Days on Bench": r.days_on_bench, "Age Bucket": r.age_bucket,
      Experience: r.experience_bucket, Deployable: r.deployable, "RMG Status": r.rmg_status,
    })),
};

export const agingExport = {
  label: "Aging_Analysis",
  filename: "Bench_Aging.xlsx",
  getRows: (resources: Resource[]) =>
    resources.map((r) => ({
      EID: r.employee_id, Name: r.name, Designation: r.level,
      Skill: r.skill, Practice: r.department, Location: r.location,
      "Days on Bench": r.days_on_bench, "Age Bucket": r.age_bucket,
      Experience: r.experience_bucket, Deployable: r.deployable, "RMG Status": r.rmg_status,
    })),
};

export const pipelineExport = {
  label: "IFB_Pipeline",
  filename: "Bench_IFB_Pipeline.xlsx",
  getRows: (resources: Resource[]) =>
    resources.filter((r) => r.status === "ifb").map((r) => ({
      EID: r.employee_id, Name: r.name, Designation: r.level,
      Skill: r.skill, Practice: r.department, Location: r.location,
      "Days on Bench": r.days_on_bench, Experience: r.experience_bucket, "RMG Status": r.rmg_status,
    })),
};

export const skillsExport = {
  label: "Skills_on_Bench",
  filename: "Bench_Skills.xlsx",
  getRows: (resources: Resource[]) =>
    resources.map((r) => ({
      EID: r.employee_id, Name: r.name, Designation: r.level,
      "Primary Skill": r.skill, Practice: r.department, Location: r.location,
      "Days on Bench": r.days_on_bench, Experience: r.experience_bucket, Deployable: r.deployable,
    })),
};

export const locationExport = {
  label: "Location_Experience",
  filename: "Bench_Location.xlsx",
  getRows: (resources: Resource[]) =>
    resources.map((r) => ({
      EID: r.employee_id, Name: r.name, Designation: r.level,
      "Primary Skill": r.skill, Practice: r.department, Location: r.location,
      "Days on Bench": r.days_on_bench, Experience: r.experience_bucket, Deployable: r.deployable,
    })),
};
