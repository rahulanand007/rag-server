# AGENTS.md

This document is the project execution and architecture contract for this repo.

## Working Mode Rules

- Execute tasks step by step in the exact order requested by the user.
- Do not jump ahead; complete only the current requested step.
- After each completed step, always report:
  - next step
  - remaining steps

## Stack and Project Direction

- Primary stack: Node.js + NestJS + TypeScript.
- Current phase target: Production RAG foundation.

## Application Structure Rules

- Use module-based structure under `src/modules`.
- API-facing modules follow 3 layers:
  - `controller`
  - `service`
  - `repository`
- Health module follows this 3-layer rule.
- Database setup must be modular, but does not need API-style 3 layers.

## Bootstrap and Entry Rules

- Keep clear separation between app creation and server startup.
- `src/app.ts` is responsible for app creation.
- `src/server.ts` is the runtime entrypoint.
- Nest entry file must resolve to `server`.

## Database Rules

- Use Drizzle as ORM/query layer.
- Keep DB configuration centralized in a config/constants file.
- DB module should be reusable and injected via Nest module/provider.
- Health check must verify DB reachability using `SELECT 1`.
- `/health` response must include DB status.

## Docker Rules

- Provide Dockerized local stack using:
  - app service
  - PostgreSQL with pgvector service
- Keep DB initialization modular via SQL init scripts.
- Ensure setup supports local development and production-minded defaults.

## Environment and Secrets Rules

- Commit `.env.example` only.
- Do not commit real secrets.
- Keep `.env` ignored by git.
- Use environment-driven config for app and database values.

## Definition of Done (Day 1 Baseline)

- Service starts locally.
- DB is reachable from containerized app.
- Health endpoint is reachable and reports application + DB status.
