# Repository Guide

## Purpose
This file is the top-level navigation guide for agents working in this repository.
It explains how the monorepo is organized, where to start reading, and which areas own which concerns.

This is intentionally generic and reusable. Project-specific business rules and product language should be added later once the domain is stable.

## Monorepo Shape
- `apps/web`: the TanStack Start application. This is the user-facing app and currently also hosts the server entrypoints used by the app.
- `packages/auth`: Better Auth setup and Effect-friendly auth construction.
- `packages/db`: Drizzle schema, relations, and Effect PostgreSQL integration.
- `packages/env`: Effect-native environment/config layers for server and browser.
- `packages/rpc`: shared RPC contracts, middleware definitions, and transport-facing types.
- `packages/ui`: shared UI components and design primitives.
- `packages/config`: shared tooling/config package.
- `repos/effect`: local reference checkout used to verify upstream Effect patterns before changing architecture.

## First Read Order
When you need to understand the repo quickly, read in this order:
1. `package.json`
2. `turbo.json`
3. `apps/web/AGENTS.md`
4. `packages/AGENTS.md`
5. `apps/web/src/server/AGENTS.md`

## Working Rules
- Treat `packages/*` as reusable building blocks and `apps/web` as composition.
- Keep shared contracts in `packages/rpc`, not inside the web app.
- Keep infrastructure wiring in packages when it is reusable across apps.
- Keep app-specific orchestration in `apps/web`.
- Verify Effect patterns against `repos/effect` before introducing new architectural patterns.
- Prefer adding local AGENTS files near complex areas rather than overloading this file.

## Navigation Hints
- If the task mentions routes, UI, or page behavior, start in `apps/web`.
- If the task mentions auth/session behavior, inspect `packages/auth` and the server repository layer in `apps/web/src/server`.
- If the task mentions DB typing, schema, or relations, inspect `packages/db`.
- If the task mentions typed RPC contracts, middleware, or Atom integration, inspect `packages/rpc` and `apps/web/src/lib/rpc-client.ts`.
- If the task mentions environment/config loading, inspect `packages/env`.

## Common Commands
- `bun run dev`
- `bun run dev:web`
- `bun run check-types`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:studio`

## Change Boundaries
- Do not put product/domain business logic into this file.
- Do not document generated files unless they are part of the required developer workflow.
- Do not treat `repos/effect` as application code; it is a reference source.
