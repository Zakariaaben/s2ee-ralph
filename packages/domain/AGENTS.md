# Domain Package Guide

## Scope
This package owns shared domain primitives and domain models that are intended to be reused across apps.

Read this file when the task is about entities, value objects, IDs, timestamps, or domain errors.

## Purpose
`@project/domain` owns business meaning.
It should not own transport DTOs, route concerns, or Drizzle table definitions.

## Default Choice
- Prefer `Schema.Class` for domain entities and value objects.
- Prefer one canonical domain model first.
- Do not introduce variants unless a real boundary needs them.

## Variants
Use `effect/unstable/schema/Model` only when one model must intentionally own multiple shapes such as:
- `select`
- `insert`
- `update`
- JSON-safe/public variants

If the question is “what is this concept in the domain?”, use `Schema.Class`.
If the question is “what are the allowed representations of this concept across persistence or transport boundaries?”, consider `Model.Class`.

## Layout
- Put shared primitives at the top level of `src`, for example:
  - `ids.ts`
  - `timestamps.ts`
- Put concrete concepts in feature folders, for example:
  - `src/user/user.ts`
  - `src/user/user-id.ts`
  - `src/user/errors.ts`

## IDs
- Prefer branded IDs over raw strings when an identifier has domain meaning.
- Use `makeId(...)` for opaque string IDs.
- Use `makeUuidId(...)` only when the domain guarantees UUID format.

## Timestamps
- Prefer `DateTime.Utc` in domain models.
- Use `Timestamp` in schemas.
- Convert timestamps to strings only at transport boundaries.

## Errors
- Define concrete errors next to the domain they belong to.
- Name them after the real business failure, for example:
  - `WorkspaceNotFound`
  - `EmailAlreadyTaken`
- Prefer `Schema.TaggedErrorClass`.
- Do not create generic placeholders like `DomainNotFound` unless the project explicitly wants a shared taxonomy.

## Boundaries
- `@project/domain` should not depend on RPC DTOs.
- `@project/domain` should not depend on Drizzle schemas.
- `@project/rpc` may depend on `@project/domain` only when a domain type or error is intentionally part of the public API contract.
- Otherwise, handlers should map domain models and domain errors to RPC-facing DTOs and RPC-facing errors.
- Generic transport errors such as unauthorized, forbidden, bad request, conflict, and not found should usually come from `effect/unstable/httpapi/HttpApiError`, not be redefined in this repo.
