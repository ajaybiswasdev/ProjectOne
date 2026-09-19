# Architecture

## Goal

Convert the current single-file HTML dashboard into a maintainable platform with a shared API for web and mobile clients.

## Applications

- Next.js web app consumes the API and renders dashboard views.
- Python FastAPI exposes resources, summaries, filters, and later authentication.
- PostgreSQL stores bench resources and dashboard source data.
- React Native CLI consumes the same FastAPI endpoints through `apps/mobile/src/apiClient.ts`.

## Initial API Contract

- `GET /api/v1/health`
- `GET /api/v1/resources`
- `GET /api/v1/resources/{resource_id}`
- `GET /api/v1/summary`

Supported resource query parameters:

- `search`
- `status`
- `deployable`
- `department`
- `skill`
- `hrbp`
- `leader`
- `age_bucket`

## Next Milestones

1. Add authentication and role-based access.
2. Replace remaining static dashboard cards with API-derived metrics.
3. Add create/update flows for resource statuses.
4. Add migrations with Alembic.
5. Build React Native screens on top of the shared API client.
