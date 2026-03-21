import { CurrentActor, CurrentActorRpcMiddleware } from "@project/rpc";
import { Effect, Layer } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AuthSessionRepository } from "../../repositories/auth-session-repository";

export const CurrentActorRpcMiddlewareLive = Layer.effect(
  CurrentActorRpcMiddleware,
  Effect.gen(function*() {
    const authSessionRepository = yield* AuthSessionRepository;

    return CurrentActorRpcMiddleware.of((effect, options) =>
      Effect.gen(function*() {
        const currentActor = yield* authSessionRepository.getCurrentActor(options.headers);

        if (!currentActor) {
          return yield* Effect.fail(new HttpApiError.Unauthorized({}));
        }

        return yield* Effect.provideService(effect, CurrentActor, currentActor);
      })
    );
  }),
).pipe(Layer.provide(AuthSessionRepository.layer));
