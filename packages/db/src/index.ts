import { ServerEnv, ServerEnvLive } from "@project/env/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as ServiceMap from "effect/ServiceMap";
import { Pool, types } from "pg";

import * as schema from "./schema";

const dateTypeIds = new Set([
  1082, 1114, 1115, 1182, 1184, 1185, 1186, 1187, 1231,
]);

const poolEffect = Effect.acquireRelease(
  Effect.gen(function*() {
    const env = yield* ServerEnv;

    return new Pool({
      connectionString: Redacted.value(env.databaseUrl),
      types: {
        getTypeParser: (typeId, format) => {
          if (dateTypeIds.has(typeId)) {
            return (value: unknown) => value;
          }

          return types.getTypeParser(typeId, format);
        },
      },
    });
  }),
  (pool) => Effect.promise(() => pool.end()),
);

export const dbEffect = Effect.map(poolEffect, (pool) =>
  drizzle({
    client: pool,
    schema,
    relations: schema.authRelations,
  }),
);

export type Database = NodePgDatabase<
  typeof schema,
  typeof schema.authRelations
> & {
  readonly $client: Pool;
};

export class DB extends ServiceMap.Service<DB, Database>()("@project/db/DB") {}

export const DBLive = Layer.effect(DB, dbEffect);

export const DatabaseLive = DBLive.pipe(Layer.provide(ServerEnvLive));
