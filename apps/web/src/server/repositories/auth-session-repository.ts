import { makeAuth } from "@project/auth";
import { RpcCurrentUser } from "@project/rpc/middleware/current-user";
import { Effect, Layer, ServiceMap } from "effect";
import type { Headers } from "effect/unstable/http";

export class AuthSessionRepository extends ServiceMap.Service<
  AuthSessionRepository,
  {
    readonly getCurrentUser: (
      headers: Headers.Headers,
    ) => Effect.Effect<RpcCurrentUser | null>;
  }
>()("@project/web/AuthSessionRepository") {
  static readonly layer = Layer.effect(
    AuthSessionRepository,
    Effect.gen(function* () {
      const auth = yield* makeAuth;
      return AuthSessionRepository.of({
        getCurrentUser: (headers) =>
          Effect.gen(function* () {
            const session = yield* Effect.promise(() =>
              auth.api.getSession({
                headers,
              }),
            );

            if (!session) {
              return null;
            }

            return new RpcCurrentUser({
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
            });
          }),
      });
    }),
  );
}
