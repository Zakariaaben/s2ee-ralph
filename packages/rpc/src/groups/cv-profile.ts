import {
  CvProfile,
  CvProfileDownloadUrl,
  CvProfileFile,
  CvProfileId,
  PresentedCvProfilePreview,
  StudentId,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import {
  Base64FileContents,
  CvProfilePresentationIdentity,
  PdfContentType,
  PdfFileName,
  RequiredText,
} from "../request-schemas";

export class ListStudentCvProfilesInput extends Schema.Class<ListStudentCvProfilesInput>(
  "ListStudentCvProfilesInput",
)({
  studentId: StudentId,
}) {}

export class CreateStudentCvProfileInput extends Schema.Class<CreateStudentCvProfileInput>(
  "CreateStudentCvProfileInput",
)({
  profileTypeId: RequiredText,
  fileName: PdfFileName,
  contentType: PdfContentType,
  contentsBase64: Base64FileContents,
}) {}

export class DownloadStudentCvProfileFileInput extends Schema.Class<DownloadStudentCvProfileFileInput>(
  "DownloadStudentCvProfileFileInput",
)({
  cvProfileId: CvProfileId,
}) {}

export class GetStudentCvProfileDownloadUrlInput extends Schema.Class<GetStudentCvProfileDownloadUrlInput>(
  "GetStudentCvProfileDownloadUrlInput",
)({
  cvProfileId: CvProfileId,
}) {}

export class DeleteStudentCvProfileInput extends Schema.Class<DeleteStudentCvProfileInput>(
  "DeleteStudentCvProfileInput",
)({
  cvProfileId: CvProfileId,
}) {}

export class ResolvePresentedCvProfileInput extends Schema.Class<ResolvePresentedCvProfileInput>(
  "ResolvePresentedCvProfileInput",
)({
  presentationIdentity: CvProfilePresentationIdentity,
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
  Rpc.make("getStudentCvProfileDownloadUrl", {
    success: CvProfileDownloadUrl,
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: GetStudentCvProfileDownloadUrlInput,
  }),
  Rpc.make("deleteStudentCvProfile", {
    success: CvProfileId,
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteStudentCvProfileInput,
  }),
  Rpc.make("resolvePresentedCvProfile", {
    success: PresentedCvProfilePreview,
    error: Schema.Union([CvProfileRpcAccessError, HttpApiError.NotFound]),
    payload: ResolvePresentedCvProfileInput,
  }),
).middleware(CurrentActorRpcMiddleware);
