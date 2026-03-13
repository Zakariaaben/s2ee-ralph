import { DB } from "@project/db";
import { ServerEnv } from "@project/env/server";
import * as schema from "@project/db/schema/auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { betterAuth } from "better-auth";
import { Effect } from "effect";
import * as Redacted from "effect/Redacted";

export const makeAuth = Effect.gen(function*() {
  const db = yield* DB;
  const env = yield* ServerEnv;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.corsOrigin.toString()],
    emailAndPassword: {
      enabled: true,
    },
    secret: Redacted.value(env.betterAuthSecret),
    baseURL: env.betterAuthUrl.toString(),
    plugins: [tanstackStartCookies()],
  });
});
