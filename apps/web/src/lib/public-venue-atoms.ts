import { AppRpcClient } from "@/lib/rpc-client";

export const publicVenueMapAtom = AppRpcClient.query("getPublishedVenueMap", undefined, {
  reactivityKeys: ["public", "venue-map"],
  timeToLive: "30 seconds",
});
