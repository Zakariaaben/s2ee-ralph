import { AppRpcClient } from "@/lib/rpc-client";

export const adminWorkspaceReactivity = {
  companyLedger: ["admin", "company-ledger"] as const,
  interviewLedger: ["admin", "interview-ledger"] as const,
  accessLedger: ["admin", "access-ledger"] as const,
  venueRooms: ["admin", "venue-rooms"] as const,
  publishedVenueMap: ["admin", "published-venue-map"] as const,
} as const;

export const adminWorkspaceAtoms = {
  companyLedger: AppRpcClient.query("listAdminCompanyLedger", undefined, {
    reactivityKeys: adminWorkspaceReactivity.companyLedger,
    timeToLive: "30 seconds",
  }),
  interviewLedger: AppRpcClient.query("listAdminInterviewLedger", undefined, {
    reactivityKeys: adminWorkspaceReactivity.interviewLedger,
    timeToLive: "30 seconds",
  }),
  accessLedger: AppRpcClient.query("listAdminAccessLedger", undefined, {
    reactivityKeys: adminWorkspaceReactivity.accessLedger,
    timeToLive: "30 seconds",
  }),
  publishedVenueMap: AppRpcClient.query("getPublishedVenueMap", undefined, {
    reactivityKeys: adminWorkspaceReactivity.publishedVenueMap,
    timeToLive: "30 seconds",
  }),
  venueRooms: AppRpcClient.query("listVenueRooms", undefined, {
    reactivityKeys: adminWorkspaceReactivity.venueRooms,
    timeToLive: "30 seconds",
  }),
  publishVenueMap: AppRpcClient.mutation("publishVenueMap"),
  clearPublishedVenueMap: AppRpcClient.mutation("clearPublishedVenueMap"),
  upsertVenueMapRoomPin: AppRpcClient.mutation("upsertVenueMapRoomPin"),
  deleteVenueMapRoomPin: AppRpcClient.mutation("deleteVenueMapRoomPin"),
  changeUserRole: AppRpcClient.mutation("changeAdminUserRole"),
  createCompanyAccount: AppRpcClient.mutation("createAdminCompanyAccount"),
  createRoom: AppRpcClient.mutation("createRoom"),
  updateRoom: AppRpcClient.mutation("updateRoom"),
  deleteRoom: AppRpcClient.mutation("deleteRoom"),
  assignCompanyPlacement: AppRpcClient.mutation("assignCompanyPlacement"),
  clearCompanyPlacement: AppRpcClient.mutation("clearCompanyPlacement"),
} as const;
