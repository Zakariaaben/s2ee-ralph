import { DB } from "@project/db";
import { user } from "@project/db/schema/auth";
import { student } from "@project/db/schema/student";
import { Student } from "@project/domain";
import { eq } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeStudentId = () => crypto.randomUUID();

const toStudent = (input: {
  readonly studentRow: typeof student.$inferSelect;
  readonly image: string | null;
}) =>
  new Student({
    id: input.studentRow.id as Student["id"],
    firstName: input.studentRow.firstName,
    lastName: input.studentRow.lastName,
    phoneNumber: input.studentRow.phoneNumber,
    academicYear: input.studentRow.academicYear,
    major: input.studentRow.major,
    institution: input.studentRow.institution,
    image: input.image,
  });

export class StudentRepository extends ServiceMap.Service<
  StudentRepository,
  {
    readonly getByOwnerUserId: (
      ownerUserId: string,
    ) => Effect.Effect<Student | null>;
    readonly getById: (
      studentId: string,
    ) => Effect.Effect<Student | null>;
    readonly upsertByOwnerUserId: (
      input: {
        readonly ownerUserId: string;
        readonly firstName: string;
        readonly lastName: string;
        readonly phoneNumber: string;
        readonly academicYear: string;
        readonly major: string;
        readonly institution: string;
        readonly image: string | null;
      },
    ) => Effect.Effect<Student>;
  }
>()("@project/web/StudentRepository") {
  static readonly layer = Layer.effect(
    StudentRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const getStudentRowByOwnerUserId = (ownerUserId: string) =>
        Effect.promise(() =>
          db
            .select({
              studentRow: student,
              image: user.image,
            })
            .from(student)
            .innerJoin(user, eq(user.id, student.ownerUserId))
            .where(eq(student.ownerUserId, ownerUserId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const getStudentRowById = (studentId: string) =>
        Effect.promise(() =>
          db
            .select({
              studentRow: student,
              image: user.image,
            })
            .from(student)
            .innerJoin(user, eq(user.id, student.ownerUserId))
            .where(eq(student.id, studentId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const loadStudentByOwnerUserId = (ownerUserId: string) =>
        Effect.gen(function*() {
          const row = yield* getStudentRowByOwnerUserId(ownerUserId);

          return row ? toStudent(row) : null;
        });

      const loadStudentById = (studentId: string) =>
        Effect.gen(function*() {
          const row = yield* getStudentRowById(studentId);

          return row ? toStudent(row) : null;
        });

      return StudentRepository.of({
        getByOwnerUserId: loadStudentByOwnerUserId,
        getById: loadStudentById,
        upsertByOwnerUserId: ({
          ownerUserId,
          firstName,
          lastName,
          phoneNumber,
          academicYear,
          major,
          institution,
          image,
        }) =>
          Effect.gen(function*() {
            yield* Effect.promise(() =>
              db
                .insert(student)
                .values({
                  id: makeStudentId(),
                  ownerUserId,
                  firstName,
                  lastName,
                  phoneNumber,
                  academicYear,
                  major,
                  institution,
                })
                .onConflictDoUpdate({
                  target: student.ownerUserId,
                  set: {
                    firstName,
                    lastName,
                    phoneNumber,
                    academicYear,
                    major,
                    institution,
                    updatedAt: new Date(),
                  },
                }),
            );
            yield* Effect.promise(() =>
              db
                .update(user)
                .set({
                  image,
                  updatedAt: new Date(),
                })
                .where(eq(user.id, ownerUserId)),
            );

            const savedStudent = yield* loadStudentByOwnerUserId(ownerUserId);

            if (!savedStudent) {
              return yield* Effect.die("Student upsert did not return a student");
            }

            return savedStudent;
          }),
      });
    }),
  );
}
