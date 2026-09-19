"use client";

import type { Resource } from "@/lib/api";

export function ResourceTable({ resources }: { resources: Resource[] }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Primary Skill</th>
            <th>Practice</th>
            <th>Location</th>
            <th>Bench</th>
            <th>Exp</th>
            <th>Deployable</th>
            <th>RMG Status</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id}>
              <td style={{ color: "var(--muted)", fontSize: 11 }}>{r.id}</td>
              <td style={{ fontWeight: 700 }}>{r.name}</td>
              <td><span className="pill pill-blue">{r.level}</span></td>
              <td>{r.skill || "—"}</td>
              <td>{r.department}</td>
              <td>📍 {r.location}</td>
              <td style={{ fontWeight: 800, color: ageColor(r.days_on_bench) }}>{r.days_on_bench}d</td>
              <td style={{ fontSize: 11, color: "var(--muted)" }}>{r.experience_bucket}</td>
              <td>
                <span className={`pill ${r.deployable === "Deployable" ? "pill-green" : "pill-red"}`}>
                  {r.deployable === "Deployable" ? "✅ Yes" : "🚫 No"}
                </span>
              </td>
              <td><span className={`pill ${statusPill(r.status)}`}>{r.rmg_status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ageColor(days: number) {
  if (days >= 91) return "#b5364a";
  if (days >= 61) return "#c04030";
  if (days >= 46) return "#b5641a";
  if (days >= 16) return "#2a78aa";
  return "#2e7d6e";
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    available: "pill-green", ifb: "pill-purple", upskilling: "pill-blue",
    proposed: "pill-yellow", pending: "pill-gray", internal: "pill-gray",
    other: "pill-gray",
  };
  return map[status] ?? "pill-gray";
}
