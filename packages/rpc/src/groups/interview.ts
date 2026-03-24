import {
  CompanyActiveInterviewDetail,
  CompanyCompletedInterviewLedgerEntry,
  CompanyCompletedInterviewExportFile,
  CvProfileDownloadUrl,
  GlobalInterviewTagId,
  Interview,
  InterviewId,
  RecruiterId,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import {
  CvProfilePresentationIdentity,
  InterviewCompanyTagLabel,
  InterviewNotes,
  InterviewScore,
} from "../request-schemas";

export class StartInterviewInput extends Schema.Class<StartInterviewInput>(
  "StartInterviewInput",
)({
  recruiterId: RecruiterId,
  presentationIdentity: CvProfilePresentationIdentity,
}) {}

export class CompleteInterviewInput extends Schema.Class<CompleteInterviewInput>(
  "CompleteInterviewInput",
)({
  interviewId: InterviewId,
  score: InterviewScore,
  globalTagIds: Schema.Array(GlobalInterviewTagId),
  companyTagLabels: Schema.Array(InterviewCompanyTagLabel),
  notes: InterviewNotes,
}) {}

export class CancelInterviewInput extends Schema.Class<CancelInterviewInput>(
  "CancelInterviewInput",
)({
  interviewId: InterviewId,
  notes: InterviewNotes,
}) {}

export class ExportCurrentCompanyCompletedInterviewsInput extends Schema.Class<ExportCurrentCompanyCompletedInterviewsInput>(
  "ExportCurrentCompanyCompletedInterviewsInput",
)({
  includeCvFiles: Schema.Boolean,
}) {}

export class GetCurrentCompanyInterviewDetailInput extends Schema.Class<GetCurrentCompanyInterviewDetailInput>(
  "GetCurrentCompanyInterviewDetailInput",
)({
  interviewId: InterviewId,
}) {}

export class GetCurrentCompanyInterviewCvDownloadUrlInput extends Schema.Class<GetCurrentCompanyInterviewCvDownloadUrlInput>(
  "GetCurrentCompanyInterviewCvDownloadUrlInput",
)({
  interviewId: InterviewId,
}) {}

export const InterviewRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const InterviewRpcMutationError = Schema.Union([
  InterviewRpcAccessError,
  HttpApiError.BadRequest,
  HttpApiError.NotFound,
]);

export const InterviewRpcGroup = RpcGroup.make(
  Rpc.make("listCurrentCompanyInterviews", {
    success: Schema.Array(Interview),
    error: InterviewRpcAccessError,
  }),
  Rpc.make("listCurrentCompanyCompletedInterviews", {
    success: Schema.Array(CompanyCompletedInterviewLedgerEntry),
    error: InterviewRpcAccessError,
  }),
  Rpc.make("getCurrentCompanyInterviewDetail", {
    success: CompanyActiveInterviewDetail,
    error: Schema.Union([InterviewRpcAccessError, HttpApiError.NotFound]),
    payload: GetCurrentCompanyInterviewDetailInput,
  }),
  Rpc.make("getCurrentCompanyInterviewCvDownloadUrl", {
    success: CvProfileDownloadUrl,
    error: Schema.Union([InterviewRpcAccessError, HttpApiError.NotFound]),
    payload: GetCurrentCompanyInterviewCvDownloadUrlInput,
  }),
  Rpc.make("exportCurrentCompanyCompletedInterviews", {
    success: CompanyCompletedInterviewExportFile,
    error: Schema.Union([InterviewRpcAccessError, HttpApiError.NotFound]),
    payload: ExportCurrentCompanyCompletedInterviewsInput,
  }),
  Rpc.make("startInterview", {
    success: Interview,
    error: InterviewRpcMutationError,
    payload: StartInterviewInput,
  }),
  Rpc.make("completeInterview", {
    success: Interview,
    error: InterviewRpcMutationError,
    payload: CompleteInterviewInput,
  }),
  Rpc.make("cancelInterview", {
    success: Interview,
    error: InterviewRpcMutationError,
    payload: CancelInterviewInput,
  }),
).middleware(CurrentActorRpcMiddleware);
