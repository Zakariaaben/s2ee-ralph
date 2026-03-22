import type { Student } from "@project/domain";

import { AppRpcClient } from "@/lib/rpc-client";

export const companyWorkspaceReactivity = {
  currentCompany: ["company", "current-company"] as const,
  activeInterviews: ["company", "active-interviews"] as const,
  completedInterviews: ["company", "completed-interviews"] as const,
} as const;

export const companyWorkspaceAtoms = {
  currentCompany: AppRpcClient.query("currentCompany", undefined, {
    reactivityKeys: companyWorkspaceReactivity.currentCompany,
    timeToLive: "5 minutes",
  }),
  activeInterviews: AppRpcClient.query("listCurrentCompanyInterviews", undefined, {
    reactivityKeys: companyWorkspaceReactivity.activeInterviews,
    timeToLive: "30 seconds",
  }),
  completedInterviews: AppRpcClient.query("listCurrentCompanyCompletedInterviews", undefined, {
    reactivityKeys: companyWorkspaceReactivity.completedInterviews,
    timeToLive: "30 seconds",
  }),
  resolveStudentQrIdentity: (qrIdentity: string) =>
    AppRpcClient.query("resolveStudentQrIdentity", { qrIdentity }, {
      timeToLive: "30 seconds",
    }),
  listStudentCvProfiles: (studentId: Student["id"]) =>
    AppRpcClient.query("listStudentCvProfiles", { studentId }, {
      timeToLive: "30 seconds",
    }),
  upsertCompanyProfile: AppRpcClient.mutation("upsertCompanyProfile"),
  addRecruiter: AppRpcClient.mutation("addRecruiter"),
  renameRecruiter: AppRpcClient.mutation("renameRecruiter"),
} as const;
