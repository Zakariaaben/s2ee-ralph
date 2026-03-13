import { DatabaseLive } from "@project/db";
import { ServerEnvLive } from "@project/env/server";
import { Layer, ManagedRuntime } from "effect";

export const appMemoMap = Layer.makeMemoMapUnsafe();

export const serverRuntime = ManagedRuntime.make(Layer.mergeAll(ServerEnvLive, DatabaseLive), {
  memoMap: appMemoMap,
});
