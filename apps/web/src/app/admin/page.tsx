"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminSummary, type AdminUser } from "@/lib/adminApi";
import { getResources, type Resource } from "@/lib/api";

const statCardStyle = {
  padding: "16px 20px",
  borderRadius: 16,
  background: "#e8eaf6",
  boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const iconCircleStyle = (color: string) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  background: color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  color: "#fff",
  boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
  flexShrink: 0,
});

const actionBtnStyle = (color: string) => ({
  flex: 1,
  padding: "14px 16px",
  borderRadius: 12,
  background: "#e8eaf6",
  boxShadow: "4px 4px 10px #b0b8d8, -4px -4px 10px #ffffff",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 8,
  transition: "all .18s",
  minWidth: 0,
});

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<{ total_resources: number; total_users: number; departments: number; last_updated: string } | null>(null);
  const [recentResources, setRecentResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, resources] = await Promise.allSettled([
          getAdminSummary(),
          getResources({ limit: "5" }),
        ]);
        if (s.status === "fulfilled") setSummary(s.value);
        if (resources.status === "fulfilled") setRecentResources(resources.value.slice(0, 5));
      } catch {
        // fallback defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
        className="admin-stats-grid"
      >
        <div style={statCardStyle}>
          <div style={iconCircleStyle("#6366f1")}>📦</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
              {loading ? "—" : summary?.total_resources ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600 }}>Total Resources</div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={iconCircleStyle("#10b981")}>👥</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
              {loading ? "—" : summary?.total_users ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600 }}>Total Users</div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={iconCircleStyle("#f59e0b")}>🏢</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
              {loading ? "—" : summary?.departments ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600 }}>Departments</div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={iconCircleStyle("#8b5cf6")}>🕐</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
              {loading ? "—" : summary?.last_updated ? new Date(summary.last_updated).toLocaleDateString() : "N/A"}
            </div>
            <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600 }}>Last Updated</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="neo" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
          Quick Actions
        </h2>
        <div className="admin-actions-row" style={{ display: "flex", gap: 12 }}>
          <Link href="/admin/resources" style={actionBtnStyle("#6366f1")} className="admin-action-card">
            <span style={{ fontSize: 28 }}>➕</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Add Resource</span>
            <span style={{ fontSize: 10, color: "#a0aec0" }}>Create new resource entry</span>
          </Link>
          <Link href="/admin/import" style={actionBtnStyle("#10b981")} className="admin-action-card">
            <span style={{ fontSize: 28 }}>📥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Import Data</span>
            <span style={{ fontSize: 10, color: "#a0aec0" }}>Upload CSV to import</span>
          </Link>
          <Link href="/admin/users" style={actionBtnStyle("#f59e0b")} className="admin-action-card">
            <span style={{ fontSize: 28 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Manage Users</span>
            <span style={{ fontSize: 10, color: "#a0aec0" }}>Add or remove users</span>
          </Link>
        </div>
      </div>

      {/* Recent Resources */}
      <div className="neo" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Recent Resources</h2>
          <Link
            href="/admin/resources"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#6366f1",
              textDecoration: "none",
            }}
          >
            View All →
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="neo-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Skill</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#a0aec0" }}>
                    Loading...
                  </td>
                </tr>
              ) : recentResources.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#a0aec0" }}>
                    No resources found
                  </td>
                </tr>
              ) : (
                recentResources.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.employee_id}</td>
                    <td>{r.name}</td>
                    <td>
                      <span className="pill pill-purple">{r.skill}</span>
                    </td>
                    <td>{r.department}</td>
                    <td>
                      <span
                        className={`pill ${r.status === "Active" ? "pill-green" : "pill-gray"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .admin-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .admin-actions-row {
            flex-direction: column !important;
          }
          .admin-action-card {
            flex: none !important;
          }
        }
        @media (max-width: 480px) {
          .admin-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
