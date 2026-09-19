// ─── Shared Types ────────────────────────────────────────────────────────────
// Single source of truth for all API response types.
// Used by: apps/web, apps/mobile, apps/api (validation)

// ── Resource ─────────────────────────────────────────────────────────────────
export interface Resource {
  id: number;
  employee_id: string;
  name: string;
  level: string;
  skill: string;
  department: string;
  location: string;
  days_on_bench: number;
  age_bucket: string;
  deployable: string;
  rmg_status: string;
  status: string;
  experience_bucket: string;
  hrbp: string;
  leader: string;
}

// ── Summary ──────────────────────────────────────────────────────────────────
export interface Summary {
  total: number;
  deployable: number;
  non_deployable: number;
  available: number;
  ifb_pipeline: number;
  critical_91_plus: number;
  average_days_on_bench: number;
  by_department: Record<string, number>;
  by_age_bucket: Record<string, number>;
  by_location: Record<string, number>;
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface SkillCount {
  skill: string;
  count: number;
}

export interface AgingDepartmentRow {
  department: string;
  total: number;
  buckets: Record<string, number>;
  risk: string;
}

export interface AgingBucketSummary {
  bucket: string;
  count: number;
  label: string;
}

export interface PipelineSummary {
  ifb_selected: number;
  ifb_reserved: number;
  pipeline_planned: number;
  ifb_shadow: number;
  by_department: Record<string, number>;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface ExperienceBucket {
  bucket: string;
  count: number;
}

export interface DesignationCount {
  level: string;
  count: number;
}

export interface FilterOptions {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
}

// ── API Error ────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  status_code: number;
}

// ── Constants ────────────────────────────────────────────────────────────────
export const AGING_BUCKETS = [
  "0-15 Days",
  "16-30 Days",
  "31-45 Days",
  "46-60 Days",
  "61-90 Days",
  "91+ days",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  ifb: "IFB Pipeline",
  bench: "Bench",
};

export const DEPLOYABLE_STATUS = "Deployable" as const;
export const NON_DEPLOYABLE_STATUS = "Non Deployable" as const;
