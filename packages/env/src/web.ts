import * as ConfigProvider from "effect/ConfigProvider";

const webConfigProvider = ConfigProvider.fromUnknown((import.meta as ImportMeta & {
  readonly env: Record<string, unknown>;
}).env).pipe(ConfigProvider.constantCase);

export const WebEnvLive = ConfigProvider.layer(webConfigProvider);
