import {
  CompanyCompletedInterviewLedgerEntry,
  CompanyCompletedInterviewExportFile,
  CvProfileId,
  GlobalInterviewTagId,
  Interview,
  RecruiterId,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import {
  InterviewCompanyTagLabel,
  InterviewScore,
  StudentQrIdentity,
} from "../request-schemas";

export class CompleteInterviewInput extends Schema.Class<CompleteInterviewInput>(
  "CompleteInterviewInput",
)({
  recruiterId: RecruiterId,
  qrIdentity: StudentQrIdentity,
  cvProfileId: CvProfileId,
  score: InterviewScore,
  globalTagIds: Schema.Array(GlobalInterviewTagId),
  companyTagLabels: Schema.Array(InterviewCompanyTagLabel),
}) {}

export class CancelInterviewInput extends Schema.Class<CancelInterviewInput>(
  "CancelInterviewInput",
)({
  recruiterId: RecruiterId,
  qrIdentity: StudentQrIdentity,
  cvProfileId: CvProfileId,
}) {}

export class ExportCurrentCompanyCompletedInterviewsInput extends Schema.Class<ExportCurrentCompanyCompletedInterviewsInput>(
  "ExportCurrentCompanyCompletedInterviewsInput",
)({
  includeCvFiles: Schema.Boolean,
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
  Rpc.make("exportCurrentCompanyCompletedInterviews", {
    success: CompanyCompletedInterviewExportFile,
    error: Schema.Union([InterviewRpcAccessError, HttpApiError.NotFound]),
    payload: ExportCurrentCompanyCompletedInterviewsInput,
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
