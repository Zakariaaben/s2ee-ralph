import type { UserRoleValue } from "@project/domain";
import { ActorRpcGroup, CurrentActor } from "@project/rpc";
import { Effect } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

const requireRole = (requiredRole: UserRoleValue) =>
  Effect.gen(function*() {
    const actor = yield* CurrentActor;

    if (actor.role !== requiredRole) {
      return yield* Effect.fail(new HttpApiError.Forbidden({}));
    }

    return actor;
  });

export const makeActorRpcHandlers = Effect.succeed(
  ActorRpcGroup.of({
    currentActor: () =>
      Effect.gen(function*() {
        return yield* CurrentActor;
      }),
    requireAdminAccess: () => requireRole("admin"),
    requireStudentAccess: () => requireRole("student"),
    requireCompanyAccess: () => requireRole("company"),
    requireCheckInAccess: () => requireRole("check-in"),
  }),
);
