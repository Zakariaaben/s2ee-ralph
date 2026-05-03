import {
  ControlledVocabularies,
  CvProfileType,
  GlobalInterviewTag,
  StudentInstitution,
  StudentMajor,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import {
  UniqueIdArray,
  VocabularyEntryId,
  VocabularyEntryLabel,
} from "../request-schemas";

export class VocabularyEntryInput extends Schema.Class<VocabularyEntryInput>(
  "VocabularyEntryInput",
)({
  id: VocabularyEntryId,
  label: VocabularyEntryLabel,
}) {}

export const SeedVocabularyEntryInput = VocabularyEntryInput;

export class ReplaceVocabularyEntriesInput extends Schema.Class<ReplaceVocabularyEntriesInput>(
  "ReplaceVocabularyEntriesInput",
)({
  entries: UniqueIdArray(VocabularyEntryInput),
}) {}

export class VocabularyEntryIdInput extends Schema.Class<VocabularyEntryIdInput>(
  "VocabularyEntryIdInput",
)({
  id: VocabularyEntryId,
}) {}

export const DeleteVocabularyEntryInput = VocabularyEntryIdInput;

export class SeedControlledVocabulariesInput extends Schema.Class<SeedControlledVocabulariesInput>(
  "SeedControlledVocabulariesInput",
)({
  cvProfileTypes: UniqueIdArray(VocabularyEntryInput),
  globalInterviewTags: UniqueIdArray(VocabularyEntryInput),
  studentInstitutions: UniqueIdArray(VocabularyEntryInput),
  studentMajors: UniqueIdArray(VocabularyEntryInput),
}) {}

export const VocabularyRpcAccessError = HttpApiError.Unauthorized;

export const VocabularyRpcMutationError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
  HttpApiError.BadRequest,
]);

export const VocabularyRpcGroup = RpcGroup.make(
  Rpc.make("listCvProfileTypes", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcAccessError,
  }),
  Rpc.make("listGlobalInterviewTags", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcAccessError,
  }),
  Rpc.make("listStudentMajors", {
    success: Schema.Array(StudentMajor),
    error: VocabularyRpcAccessError,
  }),
  Rpc.make("listStudentInstitutions", {
    success: Schema.Array(StudentInstitution),
    error: VocabularyRpcAccessError,
  }),
  Rpc.make("addCvProfileType", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryInput,
  }),
  Rpc.make("deleteCvProfileType", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryIdInput,
  }),
  Rpc.make("replaceCvProfileTypes", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("addGlobalInterviewTag", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryInput,
  }),
  Rpc.make("deleteGlobalInterviewTag", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryIdInput,
  }),
  Rpc.make("replaceGlobalInterviewTags", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("addStudentMajor", {
    success: Schema.Array(StudentMajor),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryInput,
  }),
  Rpc.make("deleteStudentMajor", {
    success: Schema.Array(StudentMajor),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryIdInput,
  }),
  Rpc.make("replaceStudentMajors", {
    success: Schema.Array(StudentMajor),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("addStudentInstitution", {
    success: Schema.Array(StudentInstitution),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryInput,
  }),
  Rpc.make("deleteStudentInstitution", {
    success: Schema.Array(StudentInstitution),
    error: VocabularyRpcMutationError,
    payload: VocabularyEntryIdInput,
  }),
  Rpc.make("replaceStudentInstitutions", {
    success: Schema.Array(StudentInstitution),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("seedControlledVocabularies", {
    success: ControlledVocabularies,
    error: VocabularyRpcMutationError,
    payload: SeedControlledVocabulariesInput,
  }),
).middleware(CurrentActorRpcMiddleware);
