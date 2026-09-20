"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { adminImportCsv, adminExportCsv } from "@/lib/adminApi";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const rows = lines.slice(0, 6).map((l) => l.split(",").map((c) => c.trim()));
      setPreview(rows);
    };
    reader.readAsText(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const r = await adminImportCsv(file);
      setResult(r);
      setFile(null);
      setPreview([]);
    } catch (err: unknown) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Import failed"],
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await adminExportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resources_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate() {
    const header = "employee_id,name,level,skill,department,location,days_on_bench,age_bucket,deployable,rmg_status,status,experience_bucket,hrbp,leader";
    const example = "EMP001,John Doe,L3,Python,Engineering,Bangalore,45,30-40,Yes,Available,Active,5-8 Years,Jane Smith,Tech Lead";
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
        Import / Export
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="import-grid">
        {/* Upload Area */}
        <div className="neo" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            📤 Import CSV
          </h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#6366f1" : "#b0b8d8"}`,
              borderRadius: 16,
              padding: "32px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "rgba(99,102,241,.06)" : "transparent",
              transition: "all .2s",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
              {file ? file.name : "Drop CSV file here or click to browse"}
            </p>
            <p style={{ fontSize: 11, color: "#a0aec0" }}>
              Supports .csv files with resource data
            </p>
          </div>
          <input ref={inputRef} type="file" accept=".csv" onChange={onChange} style={{ display: "none" }} />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                background: "#6366f1",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: !file || importing ? "not-allowed" : "pointer",
                opacity: !file || importing ? 0.5 : 1,
                boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
              }}
            >
              {importing ? "Importing..." : "Import Data"}
            </button>
            <button
              onClick={downloadTemplate}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "#e8eaf6",
                color: "#6366f1",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
              }}
            >
              📋 Template
            </button>
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#a0aec0", marginBottom: 8 }}>
                Preview (first {preview.length} rows)
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            style={{
                              padding: "4px 6px",
                              borderBottom: "1px solid rgba(163,177,198,.3)",
                              color: i === 0 ? "#a0aec0" : "#1e293b",
                              fontWeight: i === 0 ? 700 : 500,
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Export Area */}
        <div className="neo" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            📥 Export Data
          </h3>
          <div
            style={{
              borderRadius: 16,
              padding: "32px 20px",
              textAlign: "center",
              background: "rgba(99,102,241,.04)",
              border: "2px dashed #b0b8d8",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
              Export all resources
            </p>
            <p style={{ fontSize: 11, color: "#a0aec0" }}>
              Download the complete resource dataset as CSV
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: "#10b981",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.6 : 1,
              boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
            }}
          >
            {exporting ? "Exporting..." : "⬇ Download CSV"}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className="neo"
          style={{
            marginTop: 16,
            padding: 20,
            borderLeft: `4px solid ${result.errors.length > 0 ? "#e97b8a" : "#10b981"}`,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
            {result.errors.length > 0 ? "⚠️ Import Completed with Errors" : "✅ Import Successful"}
          </h3>
          <div style={{ display: "flex", gap: 20, marginBottom: result.errors.length > 0 ? 8 : 0 }}>
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
              Imported: {result.imported}
            </span>
            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>
              Skipped: {result.skipped}
            </span>
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {result.errors.slice(0, 5).map((err, i) => (
                <p key={i} style={{ fontSize: 11, color: "#e97b8a", marginBottom: 2 }}>
                  • {err}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p style={{ fontSize: 11, color: "#a0aec0" }}>
                  +{result.errors.length - 5} more errors
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .import-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
