import { AppRpcClient } from "@/lib/rpc-client";
import type { Interview } from "@project/domain";

export const companyWorkspaceReactivity = {
  currentCompany: ["company", "current-company"] as const,
  activeInterviews: ["company", "active-interviews"] as const,
  completedInterviews: ["company", "completed-interviews"] as const,
  globalInterviewTags: ["company", "global-interview-tags"] as const,
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
  getCurrentCompanyInterviewDetail: (interviewId: Interview["id"]) =>
    AppRpcClient.query("getCurrentCompanyInterviewDetail", { interviewId }, { timeToLive: "30 seconds" }),
  getCurrentCompanyInterviewCvDownloadUrl: (interviewId: Interview["id"]) =>
    AppRpcClient.query("getCurrentCompanyInterviewCvDownloadUrl", { interviewId }, { timeToLive: "30 seconds" }),
  completedInterviews: AppRpcClient.query("listCurrentCompanyCompletedInterviews", undefined, {
    reactivityKeys: companyWorkspaceReactivity.completedInterviews,
    timeToLive: "30 seconds",
  }),
  globalInterviewTags: AppRpcClient.query("listGlobalInterviewTags", undefined, {
    reactivityKeys: companyWorkspaceReactivity.globalInterviewTags,
    timeToLive: "5 minutes",
  }),
  resolvePresentedCvProfile: (presentationIdentity: string) =>
    AppRpcClient.query("resolvePresentedCvProfile", { presentationIdentity }, {
      timeToLive: "30 seconds",
    }),
  upsertCompanyProfile: AppRpcClient.mutation("upsertCompanyProfile"),
  addRecruiter: AppRpcClient.mutation("addRecruiter"),
  renameRecruiter: AppRpcClient.mutation("renameRecruiter"),
  startInterview: AppRpcClient.mutation("startInterview"),
  completeInterview: AppRpcClient.mutation("completeInterview"),
  cancelInterview: AppRpcClient.mutation("cancelInterview"),
  exportCompletedInterviews: AppRpcClient.mutation("exportCurrentCompanyCompletedInterviews"),
} as const;
