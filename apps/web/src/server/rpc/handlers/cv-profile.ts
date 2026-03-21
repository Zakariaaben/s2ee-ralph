import { CurrentActor, CvProfileRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { CvProfileService } from "../../services/cv-profile-service";

export const makeCvProfileRpcHandlers = Effect.gen(function*() {
  const cvProfileService = yield* CvProfileService;

  return CvProfileRpcGroup.of({
    listCurrentStudentCvProfiles: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* cvProfileService.listCurrentStudentCvProfiles(actor);
      }),
    listStudentCvProfiles: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* cvProfileService.listStudentCvProfiles({
          actor,
          studentId: input.studentId,
        });
      }),
    createStudentCvProfile: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* cvProfileService.createStudentCvProfile({
          actor,
          profileTypeId: input.profileTypeId,
          fileName: input.fileName,
          contentType: input.contentType,
          contentsBase64: input.contentsBase64,
        });
      }),
    downloadStudentCvProfileFile: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* cvProfileService.downloadStudentCvProfileFile({
          actor,
          cvProfileId: input.cvProfileId,
        });
      }),
    deleteStudentCvProfile: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* cvProfileService.deleteStudentCvProfile({
          actor,
          cvProfileId: input.cvProfileId,
        });
      }),
  });
});
