import { makeAuth } from "@project/auth";
import { AuthenticatedActor } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import type { Headers } from "effect/unstable/http";

export class AuthSessionRepository extends ServiceMap.Service<
  AuthSessionRepository,
  {
    readonly getCurrentActor: (
      headers: Headers.Headers,
    ) => Effect.Effect<AuthenticatedActor | null>;
  }
>()("@project/web/AuthSessionRepository") {
  static readonly layer = Layer.effect(
    AuthSessionRepository,
    Effect.gen(function* () {
      const auth = yield* makeAuth;
      return AuthSessionRepository.of({
        getCurrentActor: (headers) =>
          Effect.gen(function* () {
            const session = yield* Effect.promise(() =>
              auth.api.getSession({
                headers,
              }),
            );

            if (!session) {
              return null;
            }

            return new AuthenticatedActor({
              id: session.user.id as AuthenticatedActor["id"],
              email: session.user.email,
              name: session.user.name,
              role: session.user.role as AuthenticatedActor["role"],
            });
          }),
      });
    }),
  );
}
