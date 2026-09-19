import { API_BASE_URL, API_TIMEOUT_MS } from "./config";

// ─── Types (matches apps/api/schemas.py exactly) ─────────────────────────────

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

// ─── API Client ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class BenchApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async getSummary(params?: Record<string, string>): Promise<Summary> {
    return this.request<Summary>("/api/v1/summary", params);
  }

  async getResources(params?: Record<string, string>): Promise<Resource[]> {
    return this.request<Resource[]>("/api/v1/resources", params);
  }

  async getSkills(params?: Record<string, string>): Promise<SkillCount[]> {
    return this.request<SkillCount[]>("/api/v1/skills", params);
  }

  async getAging(params?: Record<string, string>): Promise<AgingDepartmentRow[]> {
    return this.request<AgingDepartmentRow[]>("/api/v1/aging", params);
  }

  async getAgingSummary(params?: Record<string, string>): Promise<AgingBucketSummary[]> {
    return this.request<AgingBucketSummary[]>("/api/v1/aging/summary", params);
  }

  async getPipeline(params?: Record<string, string>): Promise<PipelineSummary> {
    return this.request<PipelineSummary>("/api/v1/pipeline", params);
  }

  async getLocations(params?: Record<string, string>): Promise<LocationCount[]> {
    return this.request<LocationCount[]>("/api/v1/locations", params);
  }

  async getExperience(params?: Record<string, string>): Promise<ExperienceBucket[]> {
    return this.request<ExperienceBucket[]>("/api/v1/experience", params);
  }

  async getDesignations(params?: Record<string, string>): Promise<DesignationCount[]> {
    return this.request<DesignationCount[]>("/api/v1/designations", params);
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new ApiError(response.status, `API error: ${response.status}`);
        }

        return (await response.json()) as T;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError && err.status < 500) throw err;
        if (attempt === MAX_RETRIES) throw err;
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      }
    }
    throw new Error("Unreachable");
  }
}
