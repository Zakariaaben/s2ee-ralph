import { DB, DatabaseLive } from "@project/db";
import { globalInterviewTag } from "@project/db/schema/vocabulary";
import { ServerEnvLive } from "@project/env/server";
import { Effect, Layer } from "effect";

import { defaultGlobalInterviewTags } from "./default-vocabularies";

const program = Effect.gen(function* () {
  const db = yield* DB;

  yield* Effect.promise(() =>
    db.transaction(async (tx) => {
      await tx.delete(globalInterviewTag);
      if (defaultGlobalInterviewTags.length > 0) {
        await tx
          .insert(globalInterviewTag)
          .values(defaultGlobalInterviewTags.map((entry, sortOrder) => ({ ...entry, sortOrder })));
      }
    }),
  );

  return defaultGlobalInterviewTags.length;
});

Effect.runPromise(program.pipe(Effect.provide(Layer.mergeAll(ServerEnvLive, DatabaseLive))))
  .then((count) => {
    console.log(`Reseeded ${count} default interview tags.`);
  })
  .catch((error) => {
    console.error("Failed to reseed default interview tags.", error);
    process.exitCode = 1;
  });
