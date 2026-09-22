"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getResources,
  type Resource,
} from "@/lib/api";
import {
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  type AdminResource,
} from "@/lib/adminApi";
import { getSessionUser } from "@/lib/session";

const PAGE_SIZE = 25;

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#e8eaf6",
  boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff",
  fontSize: 13,
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box" as const,
};

const btnPrimary = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
};

const btnDanger = {
  ...btnPrimary,
  background: "#e97b8a",
};

const btnGhost = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#6366f1",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const btnDangerSmall = {
  ...btnGhost,
  color: "#e97b8a",
};

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modalStyle = {
  width: "100%",
  maxWidth: 560,
  maxHeight: "90vh",
  overflow: "auto",
  background: "#e8eaf6",
  borderRadius: 20,
  padding: 28,
  boxShadow: "8px 8px 24px #b0b8d8, -8px -8px 24px #ffffff",
};

const formFields: { key: keyof AdminResource; label: string; type?: string; required?: boolean }[] = [
  { key: "employee_id", label: "Employee ID", required: true },
  { key: "name", label: "Name", required: true },
  { key: "level", label: "Level" },
  { key: "skill", label: "Skill" },
  { key: "department", label: "Department" },
  { key: "location", label: "Location" },
  { key: "days_on_bench", label: "Days on Bench", type: "number" },
  { key: "age_bucket", label: "Age Bucket" },
  { key: "deployable", label: "Deployable" },
  { key: "rmg_status", label: "RMG Status" },
  { key: "status", label: "Status" },
  { key: "experience_bucket", label: "Experience Bucket" },
  { key: "hrbp", label: "HRBP" },
  { key: "leader", label: "Leader" },
];

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perms = getSessionUser()?.permissions ?? [];
  const canWrite = perms.includes("resource:write");
  const canDelete = perms.includes("resource:delete");

  async function load() {
    setLoading(true);
    try {
      const data = await getResources();
      setResources(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = resources.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.employee_id.toLowerCase().includes(q) ||
      r.skill.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    setEditId(null);
    setFormData({});
    setShowForm(true);
  }

  function openEdit(r: Resource) {
    setEditId(r.id);
    setFormData({
      employee_id: r.employee_id,
      name: r.name,
      level: r.level,
      skill: r.skill,
      department: r.department,
      location: r.location,
      days_on_bench: String(r.days_on_bench),
      age_bucket: r.age_bucket,
      deployable: r.deployable,
      rmg_status: r.rmg_status,
      status: r.status,
      experience_bucket: r.experience_bucket,
      hrbp: r.hrbp,
      leader: r.leader,
    });
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<AdminResource> = {
        ...formData,
        days_on_bench: formData.days_on_bench ? Number(formData.days_on_bench) : 0,
      };
      if (editId) {
        await adminUpdateResource(editId, payload);
      } else {
        await adminCreateResource(payload);
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminDeleteResource(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Resource Management</h2>
          <p style={{ fontSize: 11, color: "#a0aec0" }}>{filtered.length} resources found</p>
        </div>
        {canWrite && (
          <button onClick={openAdd} style={btnPrimary}>
            + Add Resource
          </button>
        )}
      </div>

      {/* Search */}
      <div className="neo" style={{ padding: 10, marginBottom: 16 }}>
        <div className="search-box" style={{ marginBottom: 0 }}>
          <span>🔍</span>
          <input
            placeholder="Search by name, ID, skill, department..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="neo" style={{ padding: 16, marginBottom: 16, overflowX: "auto" }}>
        <table className="neo-table" style={{ width: "100%", minWidth: 900 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Emp ID</th>
              <th>Skill</th>
              <th>Department</th>
              <th>Location</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  Loading resources...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "#a0aec0" }}>
                  No resources match your search.
                </td>
              </tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "#6366f1" }}>{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.employee_id}</td>
                  <td>
                    <span className="pill pill-purple">{r.skill || "—"}</span>
                  </td>
                  <td>{r.department}</td>
                  <td>{r.location}</td>
                  <td style={{ fontWeight: 700 }}>{r.days_on_bench}</td>
                  <td>
                    <span
                      className={`pill ${
                        r.status === "Active"
                          ? "pill-green"
                          : r.status === "Deployed"
                          ? "pill-blue"
                          : r.status === "Bench"
                          ? "pill-yellow"
                          : "pill-gray"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {canWrite && (
                        <button onClick={() => openEdit(r)} style={btnGhost}>
                          ✏️ Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteId(r.id)} style={btnDangerSmall}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            ...btnGhost,
            opacity: page === 1 ? 0.4 : 1,
          }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#a0aec0" }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{
            ...btnGhost,
            opacity: page >= totalPages ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div style={modalStyle} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                {editId ? "Edit Resource" : "Add Resource"}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ ...btnGhost, fontSize: 18 }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
                className="admin-form-grid"
              >
                {formFields.map((f) => (
                  <div key={f.key} style={f.key === "employee_id" || f.key === "name" ? { gridColumn: "span 1" } : undefined}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#a0aec0",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                      }}
                    >
                      {f.label}
                    </label>
                    <input
                      type={f.type || "text"}
                      value={formData[f.key] || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      required={f.required}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnGhost, padding: "10px 16px" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div style={overlayStyle} onClick={() => setDeleteId(null)}>
          <div
            style={{ ...modalStyle, maxWidth: 400, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              Delete Resource?
            </h3>
            <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 20 }}>
              This action cannot be undone. The resource will be permanently removed.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ ...btnGhost, padding: "10px 16px" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ ...btnDanger, opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 640px) {
          .admin-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
