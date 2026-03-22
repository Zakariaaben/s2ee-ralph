import { CvProfile, CvProfileFile, CvProfileId, StudentId } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import { Base64FileContents, RequiredText } from "../request-schemas";

export class ListStudentCvProfilesInput extends Schema.Class<ListStudentCvProfilesInput>(
  "ListStudentCvProfilesInput",
)({
  studentId: StudentId,
}) {}

export class CreateStudentCvProfileInput extends Schema.Class<CreateStudentCvProfileInput>(
  "CreateStudentCvProfileInput",
)({
  profileTypeId: RequiredText,
  fileName: RequiredText,
  contentType: RequiredText,
  contentsBase64: Base64FileContents,
}) {}

export class DownloadStudentCvProfileFileInput extends Schema.Class<DownloadStudentCvProfileFileInput>(
  "DownloadStudentCvProfileFileInput",
)({
  cvProfileId: CvProfileId,
}) {}

export class DeleteStudentCvProfileInput extends Schema.Class<DeleteStudentCvProfileInput>(
  "DeleteStudentCvProfileInput",
)({
  cvProfileId: CvProfileId,
}) {}

export const CvProfileRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const CvProfileRpcMutationError = Schema.Union([
  CvProfileRpcAccessError,
  HttpApiError.BadRequest,
  HttpApiError.NotFound,
]);

export const CvProfileRpcGroup = RpcGroup.make(
  Rpc.make("listCurrentStudentCvProfiles", {
    success: Schema.Array(CvProfile),
    error: CvProfileRpcAccessError,
  }),
  Rpc.make("listStudentCvProfiles", {
    success: Schema.Array(CvProfile),
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: ListStudentCvProfilesInput,
  }),
  Rpc.make("createStudentCvProfile", {
    success: CvProfile,
    error: CvProfileRpcMutationError,
    payload: CreateStudentCvProfileInput,
  }),
  Rpc.make("downloadStudentCvProfileFile", {
    success: CvProfileFile,
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: DownloadStudentCvProfileFileInput,
  }),
  Rpc.make("deleteStudentCvProfile", {
    success: CvProfileId,
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteStudentCvProfileInput,
  }),
).middleware(CurrentActorRpcMiddleware);
