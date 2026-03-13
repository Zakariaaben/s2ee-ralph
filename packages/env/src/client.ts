import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServiceMap from "effect/ServiceMap";

const clientConfigShape = {} as const;

export const clientConfig = Config.all(clientConfigShape);

export type ClientEnvShape = {
  readonly [K in keyof typeof clientConfigShape]: Effect.Yieldable.Success<(typeof clientConfigShape)[K]>;
};

export class ClientEnv extends ServiceMap.Service<ClientEnv, ClientEnvShape>()("@project/env/ClientEnv") {}

export const clientConfigProvider = ConfigProvider.fromUnknown((import.meta as ImportMeta & {
  readonly env: Record<string, unknown>;
}).env).pipe(ConfigProvider.constantCase);

export const ClientEnvLive = Layer.effect(ClientEnv, clientConfig.asEffect()).pipe(
  Layer.provide(ConfigProvider.layer(clientConfigProvider)),
);
