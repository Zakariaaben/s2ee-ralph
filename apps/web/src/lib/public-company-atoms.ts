import { AppRpcClient } from "@/lib/rpc-client";

export const publicFeaturedCompaniesAtom = AppRpcClient.query("listFeaturedCompanies", undefined, {
  reactivityKeys: ["public", "featured-companies"],
  timeToLive: "30 seconds",
});
