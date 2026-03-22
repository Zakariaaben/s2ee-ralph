import { AppRpcClient } from "@/lib/rpc-client";

export const studentWorkspaceReactivity = {
  currentStudent: ["student", "current-student"] as const,
  cvProfiles: ["student", "cv-profiles"] as const,
  cvProfileTypes: ["student", "cv-profile-types"] as const,
  qrIdentity: ["student", "qr-identity"] as const,
} as const;

export const studentWorkspaceAtoms = {
  currentStudent: AppRpcClient.query("currentStudent", undefined, {
    reactivityKeys: studentWorkspaceReactivity.currentStudent,
    timeToLive: "5 minutes",
  }),
  cvProfiles: AppRpcClient.query("listCurrentStudentCvProfiles", undefined, {
    reactivityKeys: studentWorkspaceReactivity.cvProfiles,
    timeToLive: "30 seconds",
  }),
  cvProfileTypes: AppRpcClient.query("listCvProfileTypes", undefined, {
    reactivityKeys: studentWorkspaceReactivity.cvProfileTypes,
    timeToLive: "30 minutes",
  }),
  qrIdentity: AppRpcClient.query("issueStudentQrIdentity", undefined, {
    reactivityKeys: studentWorkspaceReactivity.qrIdentity,
    timeToLive: "30 seconds",
  }),
  upsertStudentOnboarding: AppRpcClient.mutation("upsertStudentOnboarding"),
  createStudentCvProfile: AppRpcClient.mutation("createStudentCvProfile"),
  deleteStudentCvProfile: AppRpcClient.mutation("deleteStudentCvProfile"),
} as const;
