# Server Structure Guide

## Scope
This file explains the server-side structure inside `apps/web/src/server`.
This area is where the web app composes Effect services, repositories, RPC handlers, and runtime wiring.

## Folder Responsibilities
- `domain`: app-local domain shapes that are not shared transport contracts
- `repositories`: infrastructure-facing data access and external integration boundaries
- `services`: business/application logic built on repositories or shared services
- `rpc/handlers`: RPC method implementations
- `rpc/middleware`: RPC middleware that provides request-scoped services into handler context
- `rpc/live.ts`: assembly of RPC handler layers and middleware layers
- `handler.ts`: bridge from the app server entrypoint into Effect RPC
- `runtime.ts`: managed runtime and memo map for server execution

## Dependency Direction
Keep dependencies flowing in this direction:
`domain -> repositories -> services -> rpc`

More concretely:
- handlers may depend on services and middleware-provided services
- services may depend on repositories
- repositories may depend on shared packages like `@project/auth`, `@project/db`, and `@project/env`
- repositories should not depend on route files or React code

## Effect / RPC Rules
- Follow upstream Effect patterns from `repos/effect` before introducing new server abstractions.
- Prefer `Effect.gen(function*() { ... })` for service construction and handler bodies.
- Put request-scoped contextual data into RPC middleware services when handlers need to `yield*` them.
- Keep handlers transport-thin: decode via the contract, delegate to services, and return transport DTOs.

## Middleware Pattern
Use this pattern when request context must be available inside handlers:
1. define a provided service in `packages/rpc`
2. define an `RpcMiddleware.Service` in `packages/rpc`
3. implement the middleware layer in `src/server/rpc/middleware`
4. attach the middleware to the RPC group in `packages/rpc`
5. consume the provided service directly in handlers with `yield*`

## Navigation Tips
- If auth/session data is needed per request, inspect `rpc/middleware` first.
- If a handler needs DB-backed reads, inspect `repositories` before adding logic directly to the handler.
- If runtime or missing layer issues appear, inspect `runtime.ts`, `rpc/live.ts`, and `rpc/handler.ts` together.

## Things To Avoid
- skipping the service layer and putting orchestration directly in handlers
- leaking raw request objects deep into services when only headers or a derived context is needed
- creating app-local transport contracts instead of using `packages/rpc`
