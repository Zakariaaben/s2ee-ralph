# Shared Packages Guide

## Scope
This file explains how to navigate and use the shared packages in `packages/*`.

## Package Ownership
- `auth`: auth construction and auth-related reusable integration
- `db`: schema, relations, migrations, and typed DB access
- `env`: typed config and environment loading
- `rpc`: shared RPC contracts and RPC middleware service definitions
- `ui`: reusable UI components
- `config`: tooling and shared configuration

## Rule Of Thumb
If code is transport-agnostic or could be reused by another app, it probably belongs in `packages/*`.
If it depends on route structure, page UX, or app-only orchestration, it probably belongs in `apps/web`.

## Package Read Order
For platform/infrastructure tasks:
1. `env`
2. `db`
3. `auth`
4. `rpc`

For UI work:
1. `ui`
2. `apps/web`

## Directives
- Keep package public APIs intentional. Export only what app code should rely on.
- Shared package contracts should be stable and simple.
- Avoid importing app-local files from packages.
- Prefer one package owning one concern clearly.
- When changing Effect patterns, verify them against `repos/effect`.

## Notes By Package
### `packages/env`
- Owns Effect-native config loading.
- Avoid reintroducing global env objects or ad hoc parsing inside apps.

### `packages/db`
- Owns Drizzle schema and relations.
- DB typing should come from actual schema/relations, not inferred shortcuts.

### `packages/auth`
- Owns Better Auth construction.
- App code should consume auth through a clean boundary, not rebuild auth setup inline.

### `packages/rpc`
- Owns RPC groups, DTOs, and shared middleware service definitions.
- Keep request-context service tags here if handlers across apps may depend on them.

### `packages/ui`
- Owns reusable presentation components.
- Avoid leaking app-specific data loading or routing concerns into UI primitives.
