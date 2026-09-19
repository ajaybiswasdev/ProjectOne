// ─── API Client ──────────────────────────────────────────────────────────────
// Centralized, type-safe API client with timeout, retry, and error handling.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

// ── Types (single source of truth matches apps/api/schemas.py) ───────────────

export type Resource = {
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
};

export type Summary = {
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
};

export type SkillCount = { skill: string; count: number };
export type AgingDepartmentRow = {
  department: string;
  total: number;
  buckets: Record<string, number>;
  risk: string;
};
export type AgingBucketSummary = { bucket: string; count: number; label: string };
export type PipelineSummary = {
  ifb_selected: number;
  ifb_reserved: number;
  pipeline_planned: number;
  ifb_shadow: number;
  by_department: Record<string, number>;
};
export type LocationCount = { location: string; count: number };
export type ExperienceBucket = { bucket: string; count: number };
export type DesignationCount = { level: string; count: number };
export type FilterOptions = {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
};

// ── Fetch wrapper with timeout + retry ───────────────────────────────────────

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, params?: Record<string, string>, retries = MAX_RETRIES): Promise<T> {
  const url = new URL(`${API_BASE_URL}/api/v1${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        next: { revalidate: 30 },
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new ApiError(response.status, `API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof ApiError && err.status < 500) throw err;
      if (attempt === retries) throw err;
      // Wait before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }
  throw new Error("Unreachable");
}

// ── Exported API functions ───────────────────────────────────────────────────

export function getSummary(params?: Record<string, string>) {
  return apiFetch<Summary>("/summary", params);
}
export function getResources(params?: Record<string, string>) {
  return apiFetch<Resource[]>("/resources", params);
}
export function getSkills(params?: Record<string, string>) {
  return apiFetch<SkillCount[]>("/skills", params);
}
export function getAging(params?: Record<string, string>) {
  return apiFetch<AgingDepartmentRow[]>("/aging", params);
}
export function getAgingSummary(params?: Record<string, string>) {
  return apiFetch<AgingBucketSummary[]>("/aging/summary", params);
}
export function getPipeline(params?: Record<string, string>) {
  return apiFetch<PipelineSummary>("/pipeline", params);
}
export function getLocations(params?: Record<string, string>) {
  return apiFetch<LocationCount[]>("/locations", params);
}
export function getExperience(params?: Record<string, string>) {
  return apiFetch<ExperienceBucket[]>("/experience", params);
}
export function getDesignations(params?: Record<string, string>) {
  return apiFetch<DesignationCount[]>("/designations", params);
}
export function getFilters() {
  return apiFetch<FilterOptions>("/filters");
}
