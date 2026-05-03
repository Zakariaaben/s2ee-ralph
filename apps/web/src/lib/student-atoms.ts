import { AppRpcClient } from "@/lib/rpc-client";
import type { CvProfile } from "@project/domain";

export const studentWorkspaceReactivity = {
  currentStudent: ["student", "current-student"] as const,
  cvProfiles: ["student", "cv-profiles"] as const,
  cvProfileTypes: ["student", "cv-profile-types"] as const,
  studentInstitutions: ["student", "student-institutions"] as const,
  studentMajors: ["student", "student-majors"] as const,
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
  studentInstitutions: AppRpcClient.query("listStudentInstitutions", undefined, {
    reactivityKeys: studentWorkspaceReactivity.studentInstitutions,
    timeToLive: "30 minutes",
  }),
  studentMajors: AppRpcClient.query("listStudentMajors", undefined, {
    reactivityKeys: studentWorkspaceReactivity.studentMajors,
    timeToLive: "30 minutes",
  }),
  getStudentCvProfileDownloadUrl: (cvProfileId: CvProfile["id"]) =>
    AppRpcClient.query("getStudentCvProfileDownloadUrl", { cvProfileId }, { timeToLive: "30 seconds" }),
  downloadStudentCvProfileFile: (cvProfileId: CvProfile["id"]) =>
    AppRpcClient.query("downloadStudentCvProfileFile", { cvProfileId }, { timeToLive: "30 seconds" }),
  upsertStudentOnboarding: AppRpcClient.mutation("upsertStudentOnboarding"),
  createStudentCvProfile: AppRpcClient.mutation("createStudentCvProfile"),
  deleteStudentCvProfile: AppRpcClient.mutation("deleteStudentCvProfile"),
} as const;
