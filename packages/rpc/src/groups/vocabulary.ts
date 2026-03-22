import {
  ControlledVocabularies,
  CvProfileType,
  GlobalInterviewTag,
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

export class SeedVocabularyEntryInput extends Schema.Class<SeedVocabularyEntryInput>(
  "SeedVocabularyEntryInput",
)({
  id: VocabularyEntryId,
  label: VocabularyEntryLabel,
}) {}

export class ReplaceVocabularyEntriesInput extends Schema.Class<ReplaceVocabularyEntriesInput>(
  "ReplaceVocabularyEntriesInput",
)({
  entries: UniqueIdArray(SeedVocabularyEntryInput),
}) {}

export class DeleteVocabularyEntryInput extends Schema.Class<DeleteVocabularyEntryInput>(
  "DeleteVocabularyEntryInput",
)({
  id: VocabularyEntryId,
}) {}

export class SeedControlledVocabulariesInput extends Schema.Class<SeedControlledVocabulariesInput>(
  "SeedControlledVocabulariesInput",
)({
  cvProfileTypes: UniqueIdArray(SeedVocabularyEntryInput),
  globalInterviewTags: UniqueIdArray(SeedVocabularyEntryInput),
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
  Rpc.make("addCvProfileType", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: SeedVocabularyEntryInput,
  }),
  Rpc.make("deleteCvProfileType", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: DeleteVocabularyEntryInput,
  }),
  Rpc.make("replaceCvProfileTypes", {
    success: Schema.Array(CvProfileType),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("addGlobalInterviewTag", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: SeedVocabularyEntryInput,
  }),
  Rpc.make("deleteGlobalInterviewTag", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: DeleteVocabularyEntryInput,
  }),
  Rpc.make("replaceGlobalInterviewTags", {
    success: Schema.Array(GlobalInterviewTag),
    error: VocabularyRpcMutationError,
    payload: ReplaceVocabularyEntriesInput,
  }),
  Rpc.make("seedControlledVocabularies", {
    success: ControlledVocabularies,
    error: VocabularyRpcMutationError,
    payload: SeedControlledVocabulariesInput,
  }),
).middleware(CurrentActorRpcMiddleware);
