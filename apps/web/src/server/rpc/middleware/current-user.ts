import { CurrentUser, CurrentUserRpcMiddleware } from "@project/rpc";
import { Effect, Layer } from "effect";

import { AuthSessionRepository } from "../../repositories/auth-session-repository";

export const CurrentUserRpcMiddlewareLive = Layer.effect(
  CurrentUserRpcMiddleware,
  Effect.gen(function*() {
    const authSessionRepository = yield* AuthSessionRepository;

    return CurrentUserRpcMiddleware.of((effect, options) =>
      Effect.gen(function*() {
        const currentUser = yield* authSessionRepository.getCurrentUser(options.headers);

        return yield* Effect.provideService(effect, CurrentUser, currentUser);
      })
    );
  }),
).pipe(Layer.provide(AuthSessionRepository.layer));
