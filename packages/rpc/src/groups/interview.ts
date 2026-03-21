import {
  CvProfileId,
  GlobalInterviewTagId,
  Interview,
  RecruiterId,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export class CompleteInterviewInput extends Schema.Class<CompleteInterviewInput>(
  "CompleteInterviewInput",
)({
  recruiterId: RecruiterId,
  qrIdentity: Schema.String,
  cvProfileId: CvProfileId,
  score: Schema.Number,
  globalTagIds: Schema.Array(GlobalInterviewTagId),
  companyTagLabels: Schema.Array(Schema.String),
}) {}

export class CancelInterviewInput extends Schema.Class<CancelInterviewInput>(
  "CancelInterviewInput",
)({
  recruiterId: RecruiterId,
  qrIdentity: Schema.String,
  cvProfileId: CvProfileId,
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
