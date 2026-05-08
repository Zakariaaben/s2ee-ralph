import { AppRpcClient } from "@/lib/rpc-client";

export const adminWorkspaceReactivity = {
  companyLedger: ["admin", "company-ledger"] as const,
  interviewLedger: ["admin", "interview-ledger"] as const,
  accessLedger: ["admin", "access-ledger"] as const,
  zones: ["admin", "zones"] as const,
  venueRooms: ["admin", "venue-rooms"] as const,
  studentInstitutions: ["admin", "student-institutions"] as const,
  studentMajors: ["admin", "student-majors"] as const,
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
  zones: AppRpcClient.query("listAdminZones", undefined, {
    reactivityKeys: adminWorkspaceReactivity.zones,
    timeToLive: "30 seconds",
  }),
  venueRooms: AppRpcClient.query("listVenueRooms", undefined, {
    reactivityKeys: adminWorkspaceReactivity.venueRooms,
    timeToLive: "30 seconds",
  }),
  studentInstitutions: AppRpcClient.query("listStudentInstitutions", undefined, {
    reactivityKeys: adminWorkspaceReactivity.studentInstitutions,
    timeToLive: "30 seconds",
  }),
  studentMajors: AppRpcClient.query("listStudentMajors", undefined, {
    reactivityKeys: adminWorkspaceReactivity.studentMajors,
    timeToLive: "30 seconds",
  }),
  addStudentInstitution: AppRpcClient.mutation("addStudentInstitution"),
  deleteStudentInstitution: AppRpcClient.mutation("deleteStudentInstitution"),
  addStudentMajor: AppRpcClient.mutation("addStudentMajor"),
  deleteStudentMajor: AppRpcClient.mutation("deleteStudentMajor"),
  changeUserRole: AppRpcClient.mutation("changeAdminUserRole"),
  createCompanyAccount: AppRpcClient.mutation("createAdminCompanyAccount"),
  updateAdminCompany: AppRpcClient.mutation("updateAdminCompany"),
  deleteAdminCompany: AppRpcClient.mutation("deleteAdminCompany"),
  createAdminZone: AppRpcClient.mutation("createAdminZone"),
  updateAdminZone: AppRpcClient.mutation("updateAdminZone"),
  deleteAdminZone: AppRpcClient.mutation("deleteAdminZone"),
  importAdminCompaniesCsv: AppRpcClient.mutation("importAdminCompaniesCsv"),
  createRoom: AppRpcClient.mutation("createRoom"),
  updateRoom: AppRpcClient.mutation("updateRoom"),
  deleteRoom: AppRpcClient.mutation("deleteRoom"),
  resetCompanyArrival: AppRpcClient.mutation("resetCompanyArrival"),
} as const;
