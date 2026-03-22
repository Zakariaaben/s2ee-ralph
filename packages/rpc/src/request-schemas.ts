import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
} from "effect";

export const RequiredText = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty()),
);

export const RoomCode = RequiredText.pipe(
  Schema.decode(SchemaTransformation.toUpperCase()),
);

export const PositiveInteger = Schema.Number.check(Schema.isInt()).pipe(
  Schema.check(Schema.isGreaterThan(0)),
);

const studentQrIdentityPrefix = "student:v1:";
const invalidStudentQrIdentityMessage = "Expected a student QR identity";

export const StudentQrIdentity = Schema.Trim.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformOrFail({
      decode: (qrIdentity) => {
        if (!qrIdentity.startsWith(studentQrIdentityPrefix)) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(qrIdentity), {
              message: invalidStudentQrIdentityMessage,
            }),
          );
        }

        const studentId = qrIdentity.slice(studentQrIdentityPrefix.length).trim();

        if (studentId.length === 0) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(qrIdentity), {
              message: invalidStudentQrIdentityMessage,
            }),
          );
        }

        return Effect.succeed(studentId);
      },
      encode: (studentId) =>
        Effect.succeed(`${studentQrIdentityPrefix}${studentId}`),
    }),
  ),
);
