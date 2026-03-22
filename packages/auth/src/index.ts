import { UserRoleValues } from "@project/domain";
import { DB } from "@project/db";
import { ServerEnv } from "@project/env/server";
import * as schema from "@project/db/schema/auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { Effect } from "effect";
import * as Redacted from "effect/Redacted";
import { z } from "zod";

const UserRoleSchema = z.enum(UserRoleValues);

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
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          input: false,
          defaultValue: "student",
          validator: {
            input: UserRoleSchema,
            output: UserRoleSchema,
          },
        },
      },
    },
    secret: Redacted.value(env.betterAuthSecret),
    baseURL: env.betterAuthUrl.toString(),
    plugins: [
      tanstackStartCookies(),
      ...(env.nodeEnv === "test" ? [testUtils()] : []),
    ],
  });
});
