# Bench Management Platform

Migrated from `html/Bench Dashboard.html` to a maintainable platform:

- `apps/web`: Next.js 15 web dashboard (landing page + 6 tabbed views)
- `apps/api`: Python FastAPI backend with 12 API endpoints
- `apps/mobile`: React Native CLI mobile app consuming the shared API
- `docker-compose.yml`: PostgreSQL + API + Web containers

## Local Start

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start PostgreSQL:

```powershell
docker compose up -d postgres
```

3. Install backend dependencies:

```powershell
pip install -e apps/api
```

4. Seed the resource data:

```powershell
python apps/api/scripts/seed_resources.py
```

5. Run the API:

```powershell
python -m uvicorn app.main:app --reload --app-dir apps/api
```

6. Install and run the web app:

```powershell
npm --prefix apps/web install
npm --prefix apps/web run dev
```

7. Open http://localhost:3000 for the landing page, or http://localhost:3000/dashboard/overview for the dashboard.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/summary` | KPI summary with optional `hrbp`/`leader` filters |
| `GET /api/v1/resources` | Resource list with `search`, `status`, `deployable`, `department`, `skill`, `hrbp`, `leader`, `ageBucket` filters |
| `GET /api/v1/resources/{id}` | Single resource by ID |
| `GET /api/v1/skills` | Skill distribution counts |
| `GET /api/v1/aging` | Aging bucket breakdown per department with risk level |
| `GET /api/v1/aging/summary` | Aging bucket totals |
| `GET /api/v1/pipeline` | IFB pipeline summary (selected, reserved, planned, shadow) |
| `GET /api/v1/locations` | Location distribution |
| `GET /api/v1/experience` | Experience bucket distribution |
| `GET /api/v1/designations` | Designation/level distribution |
| `GET /api/v1/filters` | Unique values for filter dropdowns |

## Web Dashboard Tabs

1. **Overview** - 5 KPI cards, practice doughnut, aging bar chart, resource table
2. **Aging Analysis** - Stacked bar chart, aging heatmap table, bucket summary
3. **Skills** - Horizontal bar chart, skill chips grid, skill distribution
4. **IFB Pipeline** - 4 pipeline KPIs, IFB resource lists, pipeline by practice
5. **Bench Register** - Full searchable/filterable resource table with Excel export
6. **Location & Experience** - Location bars, experience chart, designation doughnut, summary stats

## Mobile App

React Native CLI with tab-based navigation across all 6 screens.

```powershell
npm --prefix apps/mobile install
npm --prefix apps/mobile run android
```

For Android emulator, `apps/mobile/src/config.ts` points to `http://10.0.2.2:8000`.

## Database Migrations (Alembic)

```powershell
cd apps/api
alembic upgrade head
alembic revision --autogenerate -m "description"
```

## Docker (Full Stack)

```powershell
docker compose up -d
```

Starts PostgreSQL, API (port 8000), and Web (port 3000).
