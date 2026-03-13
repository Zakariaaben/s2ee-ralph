import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";

const serverConfigShape = {
  databaseUrl: Config.redacted("databaseUrl"),
  betterAuthSecret: Config.redacted("betterAuthSecret"),
  betterAuthUrl: Config.url("betterAuthUrl"),
  corsOrigin: Config.url("corsOrigin"),
  nodeEnv: Config.string("nodeEnv").pipe(Config.withDefault("development")),
} as const;

export const serverConfig = Config.all(serverConfigShape);

export type ServerEnvShape = {
  readonly [K in keyof typeof serverConfigShape]: Effect.Yieldable.Success<(typeof serverConfigShape)[K]>;
};

export class ServerEnv extends ServiceMap.Service<ServerEnv, ServerEnvShape>()("@project/env/ServerEnv") {}

const serverConfigProvider = ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase);

export const ServerEnvLive = Layer.effect(ServerEnv, serverConfig.asEffect()).pipe(
  Layer.provide(ConfigProvider.layer(serverConfigProvider)),
);
