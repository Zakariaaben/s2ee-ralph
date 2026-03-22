import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";

export { afterEach, beforeAll, describe, expect, it };

export const itEffect = (
  name: string,
  run: () => Effect.Effect<unknown, unknown, never>,
) =>
  it(name, async () => {
    await Effect.runPromise(run());
  });

export const itLayerEffect = (
  name: string,
  layer: Layer.Layer<any, any, any>,
  run: () => Effect.Effect<unknown, unknown, any>,
) =>
  it(name, async () => {
    await Effect.runPromise(
      Effect.scoped(
        run().pipe(Effect.provide(Layer.fresh(layer))) as Effect.Effect<
          unknown,
          unknown,
          never
        >,
      ),
    );
  });
