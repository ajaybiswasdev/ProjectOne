from pydantic import BaseModel, ConfigDict


class ResourceRead(BaseModel):
    id: int
    employee_id: str
    name: str
    level: str
    skill: str
    department: str
    location: str
    days_on_bench: int
    age_bucket: str
    deployable: str
    rmg_status: str
    status: str
    experience_bucket: str
    hrbp: str
    leader: str

    model_config = ConfigDict(from_attributes=True)


class SummaryRead(BaseModel):
    total: int
    deployable: int
    non_deployable: int
    available: int
    ifb_pipeline: int
    critical_91_plus: int
    average_days_on_bench: int
    by_department: dict[str, int]
    by_age_bucket: dict[str, int]
    by_location: dict[str, int]


class SkillCount(BaseModel):
    skill: str
    count: int


class AgingDepartmentRow(BaseModel):
    department: str
    total: int
    buckets: dict[str, int]
    risk: str


class AgingBucketSummary(BaseModel):
    bucket: str
    count: int
    label: str


class PipelineSummary(BaseModel):
    ifb_selected: int
    ifb_reserved: int
    pipeline_planned: int
    ifb_shadow: int
    by_department: dict[str, int]


class LocationCount(BaseModel):
    location: str
    count: int


class ExperienceBucket(BaseModel):
    bucket: str
    count: int


class DesignationCount(BaseModel):
    level: str
    count: int


class FilterOptions(BaseModel):
    hrbps: list[str]
    leaders: list[str]
    departments: list[str]
    skills: list[str]
    statuses: list[str]
    age_buckets: list[str]
