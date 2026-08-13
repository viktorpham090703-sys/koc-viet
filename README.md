# Framework migration

The framework-based application is split into:

- `front-end`: React + TypeScript + Vite
- `back-end`: Express + TypeScript + PostgreSQL

## Database

Start PostgreSQL with Docker Compose. On the first start, the database imports
`database/postgresql_full.sql` automatically:

```bash
docker compose up -d postgres
docker compose ps
```

The local connection string is:

```text
postgresql://postgres:postgres@localhost:5432/koc_viet
```

For a manual import into another PostgreSQL database:

```bash
psql -v ON_ERROR_STOP=1 -U postgres -d nexrall_koc_viet -f database/postgresql_full.sql
```

## Backend

```bash
cd back-end
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Frontend

```bash
cd front-end
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to Express at port 3000.

## Migration design

React owns the browser entry point, routing, authentication context, layouts,
pages, state and event handlers. The frontend source contains TS/TSX only.

Express owns the API endpoint. Configuration, middleware, health checks, the
HTTP bridge, PostgreSQL adapter and infrastructure are strict TypeScript modules.
The original business rules are isolated in `back-end/src/modules/core` as a
TypeScript compatibility core so they can be split and typed domain-by-domain
without changing production behavior. No JavaScript source remains in `src`.
