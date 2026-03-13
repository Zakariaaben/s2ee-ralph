# Web App Guide

## Scope
This file describes the `apps/web` application and how to navigate it.

## What Lives Here
- TanStack Start routes
- frontend components and client composition
- server entrypoints used by the web app
- app-specific Effect runtime composition

## Directory Map
- `src/routes`: route files, including API route adapters
- `src/components`: React UI used by routes
- `src/lib`: client-side composition helpers
- `src/middleware`: route or request-level app middleware
- `src/server`: server-side services, repositories, RPC handlers, runtime wiring

## Reading Order
For feature work:
1. start with the route in `src/routes`
2. inspect any component in `src/components`
3. inspect server composition in `src/server` if the route calls server code

For backend-facing work:
1. start in `src/server/rpc`
2. inspect `src/server/services`
3. inspect `src/server/repositories`
4. trace shared contracts back into `packages/rpc`

## Directives
- Keep RPC transport details out of route components.
- Keep routes thin; prefer pushing server logic into `src/server`.
- Keep app-specific orchestration here, not in shared packages.
- If a piece of logic is reusable by another app, consider moving it into `packages/*`.
- Use `packages/rpc` as the source of truth for RPC contracts.

## Files Worth Checking Early
- `src/lib/rpc-client.ts`
- `src/routes/api/rpc.ts`
- `src/server/runtime.ts`
- `src/server/rpc/handler.ts`

## Things To Avoid
- duplicating shared types that already exist in `packages/*`
- mixing route rendering code with auth/database access
- inventing new RPC patterns without checking `repos/effect`
