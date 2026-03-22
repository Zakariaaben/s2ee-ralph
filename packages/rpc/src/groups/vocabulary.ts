import {
  ControlledVocabularies,
  CvProfileType,
  GlobalInterviewTag,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export class SeedVocabularyEntryInput extends Schema.Class<SeedVocabularyEntryInput>(
  "SeedVocabularyEntryInput",
)({
  id: Schema.String,
  label: Schema.String,
}) {}

export class ReplaceVocabularyEntriesInput extends Schema.Class<ReplaceVocabularyEntriesInput>(
  "ReplaceVocabularyEntriesInput",
)({
  entries: Schema.Array(SeedVocabularyEntryInput),
}) {}

export class DeleteVocabularyEntryInput extends Schema.Class<DeleteVocabularyEntryInput>(
  "DeleteVocabularyEntryInput",
)({
  id: Schema.String,
}) {}

export class SeedControlledVocabulariesInput extends Schema.Class<SeedControlledVocabulariesInput>(
  "SeedControlledVocabulariesInput",
)({
  cvProfileTypes: Schema.Array(SeedVocabularyEntryInput),
  globalInterviewTags: Schema.Array(SeedVocabularyEntryInput),
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
