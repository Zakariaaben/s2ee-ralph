import { DB } from "@project/db";
import { student } from "@project/db/schema/student";
import { Student } from "@project/domain";
import { eq } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeStudentId = () => crypto.randomUUID();

const toStudent = (studentRow: typeof student.$inferSelect) =>
  new Student({
    id: studentRow.id as Student["id"],
    firstName: studentRow.firstName,
    lastName: studentRow.lastName,
    course: studentRow.course,
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
        readonly course: string;
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
            .select()
            .from(student)
            .where(eq(student.ownerUserId, ownerUserId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const getStudentRowById = (studentId: string) =>
        Effect.promise(() =>
          db
            .select()
            .from(student)
            .where(eq(student.id, studentId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const loadStudentByOwnerUserId = (ownerUserId: string) =>
        Effect.gen(function*() {
          const studentRow = yield* getStudentRowByOwnerUserId(ownerUserId);

          return studentRow ? toStudent(studentRow) : null;
        });

      const loadStudentById = (studentId: string) =>
        Effect.gen(function*() {
          const studentRow = yield* getStudentRowById(studentId);

          return studentRow ? toStudent(studentRow) : null;
        });

      return StudentRepository.of({
        getByOwnerUserId: loadStudentByOwnerUserId,
        getById: loadStudentById,
        upsertByOwnerUserId: ({ ownerUserId, firstName, lastName, course }) =>
          Effect.gen(function*() {
            yield* Effect.promise(() =>
              db
                .insert(student)
                .values({
                  id: makeStudentId(),
                  ownerUserId,
                  firstName,
                  lastName,
                  course,
                })
                .onConflictDoUpdate({
                  target: student.ownerUserId,
                  set: {
                    firstName,
                    lastName,
                    course,
                    updatedAt: new Date(),
                  },
                }),
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
