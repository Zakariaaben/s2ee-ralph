import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as ServiceMap from "effect/ServiceMap";

export const serverConfig = Config.all({
  databaseUrl: Config.redacted("databaseUrl"),
  betterAuthSecret: Config.redacted("betterAuthSecret"),
  betterAuthUrl: Config.url("betterAuthUrl"),
  corsOrigin: Config.url("corsOrigin"),
  nodeEnv: Config.string("nodeEnv").pipe(Config.withDefault("development")),
});

export interface ServerEnvShape {
  readonly databaseUrl: Redacted.Redacted;
  readonly betterAuthSecret: Redacted.Redacted;
  readonly betterAuthUrl: URL;
  readonly corsOrigin: URL;
  readonly nodeEnv: string;
}

export class ServerEnv extends ServiceMap.Service<ServerEnv, ServerEnvShape>()("@project/env/ServerEnv") {}

const envRecord = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

const serverConfigProvider = ConfigProvider.fromEnv({
  env: envRecord,
}).pipe(ConfigProvider.constantCase);

export const ServerEnvLive = Layer.effect(ServerEnv, serverConfig.asEffect()).pipe(
  Layer.provide(ConfigProvider.layer(serverConfigProvider)),
);
