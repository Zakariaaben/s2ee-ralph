import { CurrentActor, StudentRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { StudentService } from "../../services/student-service";

export const makeStudentRpcHandlers = Effect.gen(function*() {
  const studentService = yield* StudentService;

  return StudentRpcGroup.of({
    currentStudent: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* studentService.getCurrentStudent(actor);
      }),
    upsertStudentOnboarding: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* studentService.upsertStudentOnboarding({
          actor,
          firstName: input.firstName,
          lastName: input.lastName,
          course: input.course,
        });
      }),
    issueStudentQrIdentity: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* studentService.issueStudentQrIdentity(actor);
      }),
    resolveStudentQrIdentity: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* studentService.resolveStudentQrIdentity({
          actor,
          studentId: input.qrIdentity,
        });
      }),
  });
});
