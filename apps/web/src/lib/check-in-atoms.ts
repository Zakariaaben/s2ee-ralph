import { AppRpcClient } from "@/lib/rpc-client";

export const checkInWorkspaceReactivity = {
  venueRooms: ["check-in", "venue-rooms"] as const,
} as const;

export const checkInWorkspaceAtoms = {
  venueRooms: AppRpcClient.query("listVenueRooms", undefined, {
    reactivityKeys: checkInWorkspaceReactivity.venueRooms,
    timeToLive: "15 seconds",
  }),
  markCompanyArrived: AppRpcClient.mutation("markCompanyArrived"),
} as const;
